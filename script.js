const includePartials = async () => {
  const includeVersion = "20260802s";
  const includeElements = Array.from(document.querySelectorAll("x-include"));

  await Promise.all(includeElements.map(async (element) => {
    const src = element.getAttribute("src");
    if (!src) return;

    try {
      const url = new URL(src, window.location.origin);
      if (!url.searchParams.has("v")) url.searchParams.set("v", includeVersion);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Unable to load ${src}`);

      const wrapper = document.createElement("div");
      wrapper.innerHTML = await response.text();
      element.replaceWith(...wrapper.childNodes);
    } catch (error) {
      console.warn(error);
    }
  }));
};

const setupNavigation = () => {
  const siteNav = document.querySelector("[data-site-nav]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const menu = document.querySelector("[data-nav-menu]");

  if (!siteNav || !toggle || !menu) return;

  const setOpen = (isOpen) => {
    siteNav.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  };

  toggle.addEventListener("click", () => {
    setOpen(!siteNav.classList.contains("is-open"));
  });

  menu.querySelectorAll("a").forEach((link) => {
    if (link.pathname === window.location.pathname) {
      link.setAttribute("aria-current", "page");
    }

    link.addEventListener("click", () => setOpen(false));
  });

  window.addEventListener("scroll", () => {
    siteNav.classList.toggle("is-scrolled", window.scrollY > 12);
  }, { passive: true });
};

const setupProjectBrowser = () => {
  const browsers = document.querySelectorAll("[data-project-browser]");
  browsers.forEach((browser) => {
    const buttons = Array.from(browser.querySelectorAll("[data-project-filter]"));
    const cards = Array.from(browser.querySelectorAll("[data-project-item]"));
    const count = browser.querySelector("[data-project-count]");
    const spotlight = browser.querySelector("[data-project-spotlight]");

    const setSpotlight = (card) => {
      if (!spotlight || !card) return;
      spotlight.querySelector("h3").textContent = card.dataset.title || card.querySelector("h3")?.textContent || "Selected project";
      spotlight.querySelector("span").textContent = card.dataset.date || "";
      spotlight.querySelector("p:not(.eyebrow)").textContent = card.dataset.summary || "";
    };

    const applyFilter = (filter) => {
      let visible = 0;
      cards.forEach((card) => {
        const categories = (card.dataset.category || "").split(" ");
        const show = filter === "all" || categories.includes(filter);
        card.hidden = !show;
        if (show) visible += 1;
      });
      if (count) count.textContent = String(visible);
      buttons.forEach((button) => button.classList.toggle("is-active", button.dataset.projectFilter === filter));
      setSpotlight(cards.find((card) => !card.hidden));
    };

    buttons.forEach((button) => {
      button.addEventListener("click", () => applyFilter(button.dataset.projectFilter || "all"));
    });

    cards.forEach((card) => {
      card.addEventListener("pointerenter", () => setSpotlight(card));
      card.addEventListener("focus", () => setSpotlight(card));
    });

    applyFilter("all");
  });
};

const setupLabConsole = () => {
  const data = {
    web: ["My web stack", "portfolio.sichi.me", "I built the portfolio, storefront pages, project navigation, and responsive layouts."],
    docker: ["My Docker stack", "mochi-portfolio", "I run Nginx, bots, websites, and other services as containers on my homelab."],
    network: ["My network", "tunnels + VPN", "I use Cloudflare Tunnel, private access, Traefik routes, and custom subdomains."],
    plugins: ["My server tools", "plugins + bots", "I build game-server utilities, Discord services, RCON tools, and a searchable item browser."]
  };

  document.querySelectorAll("[data-lab-console]").forEach((consoleEl) => {
    const title = consoleEl.querySelector("[data-console-title]");
    const value = consoleEl.querySelector("[data-console-value]");
    const copy = consoleEl.querySelector("[data-console-copy]");
    consoleEl.querySelectorAll("[data-console-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        const next = data[button.dataset.consoleChoice] || data.web;
        title.textContent = next[0];
        value.textContent = next[1];
        copy.textContent = next[2];
        consoleEl.querySelectorAll("[data-console-choice]").forEach((item) => item.classList.toggle("is-active", item === button));
      });
    });
  });
};

const setupRedactedName = () => {
  const variants = {
    first: ["J0?H*", "J?CIM", "JX?IM", "?OCH*", "J*C?M", "J4?IM", "J?XHM", "?0C*M"],
    last: ["E?A6O", "3D?G0", "E#A?O", "?D4G*", "E?XG0", "XD?GO", "E7?G*", "?A#GO"]
  };

  document.querySelectorAll("[data-scramble]").forEach((token) => {
    const list = variants[token.dataset.scramble] || variants.first;
    let index = 0;

    const swap = () => {
      const jump = 1 + Math.floor(Math.random() * (list.length - 1));
      index = (index + jump) % list.length;
      token.textContent = list[index];
      token.dataset.text = list[index];
      token.classList.remove("is-scrambling");
      void token.offsetWidth;
      token.classList.add("is-scrambling");
    };

    token.dataset.text = token.textContent.trim();
    window.setInterval(swap, 950 + Math.floor(Math.random() * 850));
  });
};

const setupViewportVideos = () => {
  const videos = Array.from(document.querySelectorAll("video[data-autoplay-visible]"));
  if (!videos.length) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) {
        video.play().catch(() => {});
        observer.unobserve(video);
      }
    });
  }, { rootMargin: "240px 0px", threshold: 0.05 });

  videos.forEach((video) => observer.observe(video));
};

document.addEventListener("DOMContentLoaded", async () => {
  await includePartials();
  setupNavigation();
  setupProjectBrowser();
  setupLabConsole();
  setupRedactedName();
  setupViewportVideos();
});
