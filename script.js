const includePartials = async () => {
  const includeElements = Array.from(document.querySelectorAll("x-include"));

  await Promise.all(includeElements.map(async (element) => {
    const src = element.getAttribute("src");
    if (!src) return;

    try {
      const response = await fetch(src);
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
    web: ["Web stack", "portfolio.sichi.me", "Hosted portfolio, Sichi Shop screenshots, category pages, and project navigation."],
    docker: ["Docker stack", "mochi-portfolio", "Nginx container, proxy network, and self-hosted services grouped in the homelab."],
    mail: ["Email stack", "domain mail", "Custom domain mail, DNS records, and server notes documented in the homelab category."],
    plugins: ["Plugin work", "server tools", "Game server utilities, Discord bot services, and searchable item browser tooling."]
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

document.addEventListener("DOMContentLoaded", async () => {
  await includePartials();
  setupNavigation();
  setupProjectBrowser();
  setupLabConsole();
});
