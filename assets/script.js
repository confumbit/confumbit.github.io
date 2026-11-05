document.addEventListener("DOMContentLoaded", () => {
  // Open page destinations in new tabs; preserve in-page navigation and email.
  document.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) return;
    const destination = new URL(href, document.baseURI);
    if (!["http:", "https:"].includes(destination.protocol)) return;
    const samePage = destination.origin === location.origin
      && destination.pathname === location.pathname
      && destination.search === location.search;
    if (samePage && destination.hash) return;
    link.setAttribute("target", "_blank");
    const rel = new Set((link.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
    rel.add("noopener");
    rel.add("noreferrer");
    link.setAttribute("rel", [...rel].join(" "));
  });

  // Keep numbered graph points and their readable key in sync on hover/focus.
  const projectMap = document.querySelector(".project-map");
  if (projectMap) {
    const links = [...projectMap.querySelectorAll("[data-project-number]")];
    const pairs = new Map();
    for (const link of links) {
      const number = link.dataset.projectNumber;
      if (!pairs.has(number)) pairs.set(number, []);
      pairs.get(number).push(link);
    }
    let hovered = null, focused = null, highlighted = null;
    const highlightProject = () => {
      const number = (focused || hovered)?.dataset.projectNumber || null;
      if (number === highlighted) return;
      pairs.get(highlighted)?.forEach(link => link.classList.remove("is-highlighted"));
      pairs.get(number)?.forEach(link => link.classList.add("is-highlighted"));
      highlighted = number;
    };
    links.forEach((link) => {
      link.addEventListener("mouseenter", () => { hovered = link; highlightProject(); });
      link.addEventListener("mouseleave", () => { hovered = null; highlightProject(); });
      link.addEventListener("focus", () => { focused = link; highlightProject(); });
      link.addEventListener("blur", () => { focused = null; highlightProject(); });
    });
  }

  const hamburger = document.querySelector(".hamburger");
  const sidebar = document.querySelector(".sidebar");
  if (!hamburger || !sidebar) return;

  // Toggle sidebar
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    sidebar.classList.toggle("active");
  });

  // Close sidebar when clicking outside
  document.addEventListener("click", (e) => {
    if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
      hamburger.classList.remove("active");
      sidebar.classList.remove("active");
    }
  });

  // Close on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hamburger.classList.remove("active");
      sidebar.classList.remove("active");
    }
  });
});
