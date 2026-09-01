/* ============================================
   Home page scatter → grid scroll animation.

   Each .scatter-item already sits in its real, final grid cell
   (see .work-grid in style.css). On load, we push it away from
   that cell using a translate/rotate/scale transform defined by
   its data-* attributes. As the user scrolls through the tall
   .hero-scatter spacer, we ease that transform back down to
   nothing — so the item settles into its natural grid position.

   Nothing here changes layout or link behavior; if JS fails to
   load, items simply sit in a normal grid.
   ============================================ */

(function () {
  const hero = document.querySelector(".hero-scatter");
  const items = document.querySelectorAll(".scatter-item");

  if (!hero || items.length === 0) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion) {
    // Skip the scatter entirely — items stay in their natural grid spot.
    return;
  }

  // Read each item's scattered starting point from its data attributes.
  const itemData = Array.prototype.map.call(items, function (item) {
    return {
      el: item,
      ox: parseFloat(item.dataset.ox) || 0, // vw
      oy: parseFloat(item.dataset.oy) || 0, // vh
      orot: parseFloat(item.dataset.orot) || 0, // deg
      oscale: parseFloat(item.dataset.oscale) || 1,
    };
  });

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  let ticking = false;

  function update() {
    ticking = false;

    const rect = hero.getBoundingClientRect();
    const scrollableDistance = hero.offsetHeight - window.innerHeight;

    let progress = scrollableDistance > 0 ? -rect.top / scrollableDistance : 1;
    progress = Math.min(Math.max(progress, 0), 1);

    const eased = easeOutCubic(progress);
    const remaining = 1 - eased;

    itemData.forEach(function (d) {
      const x = d.ox * remaining;
      const y = d.oy * remaining;
      const rot = d.orot * remaining;
      const scale = d.oscale + (1 - d.oscale) * eased;

      d.el.style.transform =
        "translate(" + x + "vw, " + y + "vh) " +
        "rotate(" + rot + "deg) " +
        "scale(" + scale + ")";
    });
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  update();
})();
