document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.querySelector(".hamburger");
  const sidebar = document.querySelector(".sidebar");

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
