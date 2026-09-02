/* ============================================
   Home page: fade + rise each project row into view as it's
   scrolled to. No scroll-jacking, no pinning — this only toggles a
   class using IntersectionObserver; the actual motion is plain CSS
   (see .project-row.reveal-ready in style.css).

   If IntersectionObserver isn't available, or JS fails, rows are
   simply left in their default fully-visible state.
   ============================================ */

(function () {
  const rows = document.querySelectorAll(".project-row");
  if (rows.length === 0) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    return;
  }

  rows.forEach(function (row) {
    row.classList.add("reveal-ready");
  });

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );

  rows.forEach(function (row) {
    observer.observe(row);
  });
})();
