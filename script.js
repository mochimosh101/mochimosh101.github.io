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

document.addEventListener("DOMContentLoaded", async () => {
  await includePartials();
  setupNavigation();
});
