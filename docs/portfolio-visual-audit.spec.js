const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const baseUrl = process.env.AUDIT_BASE_URL || 'https://portfolio.sichi.me';
const label = process.env.AUDIT_LABEL || 'audit';
const outputRoot = path.resolve('.codex', 'qa-artifacts', label);

const routes = [
  ['home', '/'],
  ['projects', '/projects/'],
  ['homelab', '/homelab/'],
  ['tebex', '/tebex/'],
  ['cyber-security', '/cyber-security/'],
  ['items', '/items/'],
];

const viewports = [
  [320, 568],
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1180, 820],
  [1440, 900],
];

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  label,
  routes: [],
  interactions: [],
};

fs.mkdirSync(outputRoot, { recursive: true });

async function traversePage(page) {
  const size = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    viewport: window.innerHeight,
  }));
  const step = Math.max(480, Math.floor(size.viewport * 0.75));
  for (let y = 0; y < size.height; y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(45);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(250);
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const clipped = [];
    const offscreen = [];
    const galleryImageIssues = [];
    const nodes = Array.from(document.querySelectorAll('body *')).slice(0, 8000);

    for (const element of nodes) {
      const rect = element.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
      const text = (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);

      if (
        text &&
        element.scrollWidth > element.clientWidth + 2 &&
        (style.overflowX === 'hidden' || style.overflowX === 'clip')
      ) {
        clipped.push({
          tag: element.tagName,
          id: element.id,
          className: String(element.className).slice(0, 100),
          text,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          overflowX: style.overflowX,
        });
      }

      if (rect.right > window.innerWidth + 2 || rect.left < -2) {
        offscreen.push({
          tag: element.tagName,
          id: element.id,
          className: String(element.className).slice(0, 100),
          text,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          position: style.position,
        });
      }

      if (clipped.length >= 50 && offscreen.length >= 50) break;
    }

    for (const image of document.querySelectorAll('.screenshot-wall img')) {
      const rect = image.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1 || image.naturalWidth < 1 || image.naturalHeight < 1) continue;
      const style = getComputedStyle(image);
      const naturalRatio = image.naturalWidth / image.naturalHeight;
      const renderedRatio = rect.width / rect.height;
      const ratioDifference = Math.abs(renderedRatio - naturalRatio) / naturalRatio;
      if (ratioDifference > 0.025 || style.objectFit === 'cover' || rect.right > window.innerWidth + 2 || rect.left < -2) {
        galleryImageIssues.push({
          src: image.currentSrc || image.src,
          natural: `${image.naturalWidth}x${image.naturalHeight}`,
          rendered: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          naturalRatio: Number(naturalRatio.toFixed(3)),
          renderedRatio: Number(renderedRatio.toFixed(3)),
          ratioDifference: Number(ratioDifference.toFixed(3)),
          objectFit: style.objectFit,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        });
      }
    }

    return {
      title: document.title,
      url: location.href,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: {
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        scrollHeight: root.scrollHeight,
        overflow: root.scrollWidth - root.clientWidth,
      },
      brokenImages: Array.from(document.images)
        .filter((image) => image.getBoundingClientRect().width > 0 && (!image.complete || image.naturalWidth === 0))
        .slice(0, 50)
        .map((image) => ({ src: image.currentSrc || image.src, alt: image.alt })),
      clipped: clipped.slice(0, 50),
      offscreen: offscreen.slice(0, 50),
      galleryImageIssues: galleryImageIssues.slice(0, 50),
      headings: Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 120).map((heading) => {
        const rect = heading.getBoundingClientRect();
        return {
          text: (heading.textContent || '').trim().replace(/\s+/g, ' '),
          top: Math.round(rect.top + window.scrollY),
          width: Math.round(rect.width),
          clientWidth: heading.clientWidth,
          scrollWidth: heading.scrollWidth,
        };
      }),
      internalLegacyLinks: Array.from(document.querySelectorAll('a[href*=".html"]'))
        .slice(0, 50)
        .map((anchor) => anchor.getAttribute('href')),
      navCount: document.querySelectorAll('nav').length,
      footerCount: document.querySelectorAll('footer').length,
      controlCount: document.querySelectorAll('button, input, select, textarea').length,
    };
  });
}

test.describe.configure({ mode: 'serial', timeout: 120_000 });

for (const [width, height] of viewports) {
  for (const [slug, route] of routes) {
    test(`${slug} at ${width}x${height}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      const consoleMessages = [];
      const pageErrors = [];
      const failedRequests = [];
      const badResponses = [];

      page.on('console', (message) => {
        if (message.type() === 'warning' || message.type() === 'error') {
          consoleMessages.push({ type: message.type(), text: message.text() });
        }
      });
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('requestfailed', (request) => failedRequests.push({
        url: request.url(),
        error: request.failure()?.errorText || 'unknown',
      }));
      page.on('response', (response) => {
        if (response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() });
      });

      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
      if (slug === 'items') {
        await page.waitForFunction(() => {
          const heading = document.querySelector('#heading');
          return heading && heading.textContent !== 'Loading items...' && document.querySelectorAll('.card').length > 0;
        }, null, { timeout: 15_000 });
      } else {
        await page.locator('[data-site-nav]').waitFor({ state: 'visible', timeout: 10_000 });
        await page.locator('.footer').waitFor({ state: 'visible', timeout: 10_000 });
      }
      await page.waitForTimeout(250);
      await traversePage(page);
      await page.waitForFunction(() => Array.from(document.images).every((image) => {
        const rect = image.getBoundingClientRect();
        return rect.width < 1 || (image.complete && image.naturalWidth > 0);
      }), null, { timeout: 10_000 }).catch(() => {});
      const metrics = await collectMetrics(page);
      const materialFailedRequests = failedRequests.filter((failure) => !(
        failure.error === 'net::ERR_ABORTED' && /\.mp4(?:$|\?)/i.test(failure.url)
      ));
      expect(response?.status(), `${route} should return HTTP 200`).toBe(200);
      expect(metrics.document.overflow, `${route} should not overflow horizontally at ${width}px`).toBeLessThanOrEqual(2);
      expect(metrics.brokenImages, `${route} should not show broken images at ${width}px`).toEqual([]);
      expect(metrics.galleryImageIssues, `${route} should not crop, stretch, or push gallery images off-screen at ${width}px`).toEqual([]);
      expect(pageErrors, `${route} should not raise page errors at ${width}px`).toEqual([]);
      expect(materialFailedRequests, `${route} should not fail non-media requests at ${width}px`).toEqual([]);
      expect(badResponses, `${route} should not return bad resources at ${width}px`).toEqual([]);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(100);

      const screenshotDir = path.join(outputRoot, 'screenshots', String(width));
      fs.mkdirSync(screenshotDir, { recursive: true });
      const screenshot = path.join(screenshotDir, `${slug}.png`);
      await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });

      report.routes.push({
        slug,
        route,
        requestedViewport: { width, height },
        status: response?.status() || null,
        screenshot,
        metrics,
        consoleMessages: [...consoleMessages],
        pageErrors: [...pageErrors],
        failedRequests: [...failedRequests],
        materialFailedRequests: [...materialFailedRequests],
        badResponses: [...badResponses],
      });
      await context.close();
    });
  }
}

for (const width of [320, 390, 430, 768, 1440]) {
  test(`navigation and controls at ${width}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 } });
    const page = await context.newPage();
    const result = { width, checks: [] };

    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-site-nav]').waitFor({ state: 'visible', timeout: 10_000 });
    const menu = page.getByRole('button', { name: 'Open navigation' });
    if (await menu.count() === 1 && await menu.isVisible()) {
      await menu.click();
      result.checks.push({ name: 'mobile navigation opens', passed: await page.locator('[data-nav-menu]').isVisible() });
    } else {
      result.checks.push({ name: 'desktop navigation visible', passed: await page.locator('[data-nav-menu]').isVisible() });
    }

    const projectsLink = page.locator('[data-nav-menu] a[href="/projects/"]');
    await projectsLink.click();
    await page.waitForURL((url) => url.pathname === '/projects/');
    result.checks.push({ name: 'primary Projects link navigates', passed: new URL(page.url()).pathname === '/projects/' });

    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-lab-console]').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('[data-console-choice="docker"]').click();
    result.checks.push({
      name: 'home console switches to Docker',
      passed: (await page.locator('[data-console-value]').textContent()) === 'mochi-portfolio',
    });
    const homeVideoState = await page.locator('video[data-autoplay-visible]').evaluateAll((videos) => ({
      total: videos.length,
      autoplayAttributes: videos.filter((video) => video.hasAttribute('autoplay')).length,
      playing: videos.filter((video) => !video.paused).length,
    }));
    result.checks.push({
      name: 'home videos use viewport playback',
      passed: homeVideoState.total === 5 && homeVideoState.autoplayAttributes === 0 && homeVideoState.playing <= 2,
    });

    await page.goto(`${baseUrl}/projects/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-project-browser]').waitFor({ state: 'visible', timeout: 10_000 });
    const securityProjects = page.getByRole('button', { name: 'Security' });
    await securityProjects.click();
    const securityCount = Number(await page.locator('[data-project-count]').textContent());
    result.checks.push({
      name: 'projects category filter narrows results',
      passed: securityCount > 0 && securityCount < 14 && await page.locator('[data-project-item]:visible').count() === securityCount,
    });
    const allProjects = page.getByRole('button', { name: 'All' });
    if (await allProjects.count() === 1) {
      await allProjects.click();
      result.checks.push({
        name: 'projects filter responds',
        passed: (await page.locator('[data-project-count]').textContent()) === '14',
      });
    } else {
      result.checks.push({ name: 'projects filter responds', passed: false });
    }

    await page.goto(`${baseUrl}/tebex/`, { waitUntil: 'domcontentloaded' });
    await page.locator('video[data-autoplay-visible]').first().waitFor({ state: 'visible', timeout: 10_000 });
    await page.waitForTimeout(500);
    const videoState = await page.locator('video[data-autoplay-visible]').evaluateAll((videos) => ({
      total: videos.length,
      autoplayAttributes: videos.filter((video) => video.hasAttribute('autoplay')).length,
      playing: videos.filter((video) => !video.paused).length,
    }));
    result.checks.push({
      name: 'Tebex videos use viewport playback',
      passed: videoState.total === 14 && videoState.autoplayAttributes === 0 && videoState.playing <= 4,
    });

    await page.goto(`${baseUrl}/items/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const heading = document.querySelector('#heading');
      return heading && heading.textContent !== 'Loading items...' && document.querySelectorAll('.card').length > 0;
    }, null, { timeout: 15_000 });
    result.checks.push({
      name: 'items responsive page size',
      passed: (await page.locator('#pageSize').inputValue()) === (width < 601 ? '24' : '72'),
    });
    const search = page.locator('input[type="search"], input[placeholder*="Search" i]');
    if (await search.count() === 1) {
      await search.fill('rifle');
      await page.waitForTimeout(150);
      result.checks.push({
        name: 'item search accepts input',
        passed: (await search.inputValue()) === 'rifle' && (await page.locator('#heading').textContent()).includes('matching items'),
      });
      await search.fill('');
    } else {
      result.checks.push({ name: 'item search accepts input', passed: false });
    }

    await page.locator('#copyPage').click();
    await page.locator('#toast.show').filter({ hasText: 'Copied this page of IDs' }).waitFor({ state: 'visible', timeout: 3_000 });
    result.checks.push({
      name: 'copy page IDs reports success',
      passed: await page.locator('#toast.show').filter({ hasText: 'Copied this page of IDs' }).isVisible(),
    });

    report.interactions.push(result);
    expect(result.checks.filter((check) => !check.passed), `interaction failures at ${width}px`).toEqual([]);
    await context.close();
  });
}

test.afterAll(() => {
  fs.writeFileSync(path.join(outputRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
});
