/* ============================================
   Portfolio renderer + tiny hash router.

   All content lives as JSON in the #site-data <script> tag in
   index.html. This file reads it once and renders three views —
   home, about, project — switching between them on the URL hash.
   Nothing here needs a server: it works opened directly from disk
   or hosted (e.g. GitHub Pages).
   ============================================ */

(function () {
  "use strict";

  var DATA = readData();
  var els = {
    home: document.getElementById("home-view"),
    about: document.getElementById("about-view"),
    project: document.getElementById("project-view"),
    list: document.getElementById("project-list"),
    empty: document.getElementById("empty-state"),
    emptyMessage: document.getElementById("empty-message"),
    categoryFilter: document.getElementById("category-filter"),
    aboutContent: document.getElementById("about-content"),
    projectTitle: document.getElementById("project-title"),
    projectMeta: document.getElementById("project-meta"),
    projectDescription: document.getElementById("project-description"),
    projectLink: document.getElementById("project-link"),
    projectMedia: document.getElementById("project-media"),
    nextProject: document.getElementById("next-project"),
    nextProjectTitle: document.getElementById("next-project-title"),
    navCenter: document.querySelector(".nav-center"),
    contactToggle: document.getElementById("contact-toggle"),
    contactMenu: document.getElementById("contact-menu"),
    contactEmailLink: document.getElementById("contact-email-link"),
    contactLinkedinLink: document.getElementById("contact-linkedin-link"),
    lightbox: document.getElementById("lightbox"),
    lightboxStage: document.getElementById("lightbox-stage"),
    lightboxClose: document.getElementById("lightbox-close"),
    lightboxPrev: document.getElementById("lightbox-prev"),
    lightboxNext: document.getElementById("lightbox-next"),
    lightboxCounter: document.getElementById("lightbox-counter"),
    cursorStar: document.getElementById("cursor-star"),
  };

  function readData() {
    var tag = document.getElementById("site-data");
    var fallback = { site: { name: "Portfolio", tagline: "", email: "", about: "", categories: [] }, projects: [] };
    if (!tag) return fallback;
    try {
      var parsed = JSON.parse(tag.textContent);
      parsed.site = parsed.site || fallback.site;
      parsed.site.categories = Array.isArray(parsed.site.categories) ? parsed.site.categories : [];
      parsed.projects = Array.isArray(parsed.projects) ? parsed.projects : [];
      return parsed;
    } catch (e) {
      console.error("Couldn't parse site data:", e);
      return fallback;
    }
  }

  // Which single category the home page filter is currently narrowed
  // to. null = show everything ("All"). One at a time, not a
  // multi-select — lives at module scope (not reset per render) so it
  // survives clicking into a project and back.
  var activeCategory = null;

  // Every category pill / tag gets its own color, spread across a
  // cool-toned range (green -> blue -> violet) by the category's
  // position in site.categories — so the same category always reads
  // as the same color, and reordering categories in admin.html
  // reshuffles the palette accordingly.
  var HUE_START = 212; // blue
  var HUE_END = 285; // violet/purple
  function categoryColor(name) {
    var cats = DATA.site.categories || [];
    var idx = cats.indexOf(name);
    if (idx === -1) idx = 0;
    var n = cats.length;
    var hue = n <= 1 ? (HUE_START + HUE_END) / 2 : HUE_START + (HUE_END - HUE_START) * (idx / (n - 1));
    // Softer than a fully saturated color, so filled pills stay light
    // enough for the dark text to read clearly and outlined tags stay
    // light enough to pop against the black background — but not so
    // washed out that the hues lose their punch.
    return "hsl(" + Math.round(hue) + ", 72%, 70%)";
  }

  // Most recent year first; a missing/non-numeric year sorts last
  // rather than jumping to the top. Projects sharing a year fall back
  // to "order" (admin's manual up/down arrows), so that still controls
  // arrangement within a year.
  function yearValue(project) {
    var n = parseInt(project.year, 10);
    return isNaN(n) ? -Infinity : n;
  }

  function sortedProjects() {
    return DATA.projects.slice().sort(function (a, b) {
      var byYear = yearValue(b) - yearValue(a);
      if (byYear !== 0) return byYear;
      return (a.order || 0) - (b.order || 0);
    });
  }

  function findProject(id) {
    for (var i = 0; i < DATA.projects.length; i++) {
      if (DATA.projects[i].id === id) return DATA.projects[i];
    }
    return null;
  }

  /* ---------- chrome (nav bits that come from site data) ---------- */

  function renderChrome() {
    document.title = DATA.site.name ? DATA.site.name + " — Design" : "Design";
    if (els.navCenter) els.navCenter.textContent = DATA.site.name || "Portfolio";
    setUpContactMenu();
  }

  /* ---------- contact dropdown ---------- */
  /* Shown on hover via plain CSS (see .nav-right:hover .contact-menu),
     and toggled open/closed by click via the .is-open class — click
     is what makes it usable on touch, and keeps it open once opened
     even if the pointer drifts off the button. */

  function closeContactMenu() {
    var toggle = els.contactToggle, menu = els.contactMenu;
    if (!menu || !menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", onOutsideClick);
    document.removeEventListener("keydown", onContactKeydown);
  }

  function onOutsideClick(e) {
    var menu = els.contactMenu, toggle = els.contactToggle;
    if (!menu.contains(e.target) && e.target !== toggle) closeContactMenu();
  }
  function onContactKeydown(e) {
    if (e.key === "Escape") { closeContactMenu(); els.contactToggle.focus(); }
  }

  function setUpContactMenu() {
    var toggle = els.contactToggle, menu = els.contactMenu;
    if (!toggle || !menu) return;

    if (DATA.site.email) {
      els.contactEmailLink.href = "mailto:" + DATA.site.email;
      els.contactEmailLink.hidden = false;
    } else if (els.contactEmailLink) {
      els.contactEmailLink.hidden = true;
    }

    if (DATA.site.linkedin) {
      els.contactLinkedinLink.href = DATA.site.linkedin;
      els.contactLinkedinLink.hidden = false;
    } else if (els.contactLinkedinLink) {
      els.contactLinkedinLink.hidden = true;
    }

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menu.classList.contains("is-open")) {
        closeContactMenu();
      } else {
        menu.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        document.addEventListener("click", onOutsideClick);
        document.addEventListener("keydown", onContactKeydown);
      }
    });
  }

  /* ---------- media element builder (shared by thumbnails + detail) ---------- */

  function buildThumbMedia(project) {
    var thumb = project.thumbnail;
    if (!thumb || !thumb.src) return null;
    var wrap = document.createElement("div");
    wrap.className = "project-image";

    if (thumb.type === "video") {
      var video = document.createElement("video");
      video.src = thumb.src;
      if (thumb.poster) video.poster = thumb.poster;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "metadata";
      wrap.appendChild(video);
      autoplayInView(video, wrap);
    } else {
      var img = document.createElement("img");
      img.src = thumb.src;
      img.alt = project.title || "";
      img.loading = "lazy";
      wrap.appendChild(img);
    }
    return wrap;
  }

  /* Videos play automatically (muted, looped) as soon as they're on
     screen — no hover or click needed — and pause again once
     scrolled out of view, so we're not running dozens of videos at
     once further down the page. `container`, if given, gets an
     "is-playing" class toggled to drive the existing hover-zoom
     effect on gallery cards. */
  function autoplayInView(video, container) {
    video.muted = true;
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              if (container) container.classList.add("is-playing");
              video.play().catch(function () {});
            } else {
              if (container) container.classList.remove("is-playing");
              video.pause();
            }
          });
        },
        { threshold: 0.15 }
      );
      io.observe(video);
    } else {
      if (container) container.classList.add("is-playing");
      video.play().catch(function () {});
    }
  }

  /* ---------- home ---------- */

  function renderHome() {
    renderCategoryFilter();
    buildProjectCards();
    applyCategoryFilter();
  }

  /* Pill row: "All" plus one pill per category from site data.
     Single-select — clicking a category shows only that category,
     replacing whatever was active; clicking the already-active one
     (or "All") clears back to showing everything. Filter clicks only
     ever call applyCategoryFilter() below, never rebuild the cards —
     see the comment on buildProjectCards(). */
  function renderCategoryFilter() {
    var bar = els.categoryFilter;
    if (!bar) return;
    var categories = DATA.site.categories || [];

    if (categories.length === 0) {
      bar.hidden = true;
      bar.innerHTML = "";
      return;
    }
    bar.hidden = false;
    bar.innerHTML = "";

    // Single ring shared by every pill in this row — moved and resized
    // (rather than recreated) on each pill's mouseenter, which is what
    // makes it glide from one pill to the next instead of popping in and
    // out. Sized 4px past each pill's own edge on every side, matching
    // how far the colored .is-active ring already sits outside a pill,
    // so hovering the selected pill shows both rings at once rather than
    // one swallowing the other.
    var hoverRing = document.createElement("div");
    hoverRing.className = "pill-hover-ring";
    bar.appendChild(hoverRing);

    var RING_MARGIN = 4;
    function trackHover(pill) {
      pill.addEventListener("mouseenter", function () {
        hoverRing.style.left = pill.offsetLeft - RING_MARGIN + "px";
        hoverRing.style.top = pill.offsetTop - RING_MARGIN + "px";
        hoverRing.style.width = pill.offsetWidth + RING_MARGIN * 2 + "px";
        hoverRing.style.height = pill.offsetHeight + RING_MARGIN * 2 + "px";
        hoverRing.style.opacity = "1";
      });
    }
    bar.addEventListener("mouseleave", function () {
      hoverRing.style.opacity = "0";
    });

    var allPill = makePill("All", activeCategory === null, "var(--ink)", function () {
      activeCategory = null;
      renderCategoryFilter();
      applyCategoryFilter();
    });
    bar.appendChild(allPill);
    trackHover(allPill);

    categories.forEach(function (cat) {
      var isActive = activeCategory === cat;
      var pill = makePill(cat, isActive, categoryColor(cat), function () {
        activeCategory = isActive ? null : cat;
        renderCategoryFilter();
        applyCategoryFilter();
      });
      bar.appendChild(pill);
      trackHover(pill);
    });
  }

  function makePill(label, isActive, color, onClick) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill" + (isActive ? " is-active" : "");
    btn.textContent = label;
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    if (color) btn.style.setProperty("--tag-color", color);
    btn.addEventListener("click", onClick);
    return btn;
  }

  function buildTagPill(label) {
    var span = document.createElement("span");
    span.className = "pill-tag";
    span.textContent = label;
    span.style.setProperty("--tag-color", categoryColor(label));
    return span;
  }

  // Orders a project's own categories to match the filter bar's order
  // (DATA.site.categories), so tags always read left-to-right the same
  // way the filter pills do, regardless of the order they were added
  // to the project in admin.html.
  function sortByCategoryOrder(cats) {
    var order = DATA.site.categories || [];
    return cats.slice().sort(function (a, b) {
      var ia = order.indexOf(a);
      var ib = order.indexOf(b);
      if (ia === -1) ia = order.length;
      if (ib === -1) ib = order.length;
      return ia - ib;
    });
  }

  // Two per row, media-first: small category pills + a modest title
  // below each thumbnail — no meta row, no blurb. The full write-up
  // lives on the project's own page.
  //
  // Builds every project's card ONCE, regardless of the active
  // filter — called only when the home view itself is (re)entered,
  // never on a filter click. Switching filters just shows/hides these
  // same cards (applyCategoryFilter, below). Earlier this wiped and
  // rebuilt the whole list on every filter click, which threw away
  // each <img> and made a fresh one — since the image's box has no
  // reserved size until it loads, that produced a visible pop/resize
  // each time (worse for whichever thumbnail takes longest to decode)
  // and would fight any future enter/exit animation on the cards.
  function buildProjectCards() {
    var allProjects = sortedProjects();
    els.list.innerHTML = "";

    if (allProjects.length === 0) {
      els.list.hidden = true;
      els.empty.hidden = false;
      if (els.emptyMessage) els.emptyMessage.textContent = "Nothing posted yet — new work will show up here.";
      return;
    }

    allProjects.forEach(function (project) {
      var card = document.createElement("a");
      card.className = "project-card";
      card.href = "#p/" + encodeURIComponent(project.id);

      var cats = project.categories || [];
      card.dataset.categories = cats.join("|");

      var media = buildThumbMedia(project);
      if (media) card.appendChild(media);

      var caption = document.createElement("div");
      caption.className = "project-caption";

      var topRow = document.createElement("div");
      topRow.className = "project-caption-top";

      var name = document.createElement("span");
      name.className = "name";
      name.textContent = project.title || "Untitled";
      topRow.appendChild(name);

      if (cats.length) {
        var tags = document.createElement("div");
        tags.className = "project-tags";
        sortByCategoryOrder(cats).forEach(function (cat) { tags.appendChild(buildTagPill(cat)); });
        topRow.appendChild(tags);
      }

      caption.appendChild(topRow);

      if (project.summary) {
        var summary = document.createElement("span");
        summary.className = "summary";
        summary.textContent = project.summary;
        caption.appendChild(summary);
      }

      card.appendChild(caption);
      els.list.appendChild(card);
    });
  }

  // Shows/hides the already-built cards to match activeCategory —
  // no DOM is created or destroyed, so no image ever reloads/redecodes
  // and no card ever changes size. Safe to call on every filter click.
  function applyCategoryFilter() {
    var cards = els.list.querySelectorAll(".project-card");
    if (cards.length === 0) return; // nothing built (no projects at all)

    var anyVisible = false;
    cards.forEach(function (card) {
      var cats = card.dataset.categories ? card.dataset.categories.split("|") : [];
      var show = activeCategory === null || cats.indexOf(activeCategory) !== -1;
      card.hidden = !show;
      if (show) anyVisible = true;
    });

    if (anyVisible) {
      els.list.hidden = false;
      els.empty.hidden = true;
    } else {
      els.list.hidden = true;
      els.empty.hidden = false;
      if (els.emptyMessage) els.emptyMessage.textContent = "No projects in this category yet.";
    }
  }

  /* ---------- about ---------- */

  function renderAbout() {
    var site = DATA.site;
    els.aboutContent.innerHTML = "";

    var layout = document.createElement("div");
    layout.className = "about-layout";

    // Left: photo + name.
    var left = document.createElement("div");
    left.className = "about-left";

    var photoWrap = document.createElement("div");
    photoWrap.className = "about-photo";
    if (site.photo) {
      var photoImg = document.createElement("img");
      photoImg.src = site.photo;
      photoImg.alt = site.name ? site.name : "";
      photoWrap.appendChild(photoImg);
    } else {
      photoWrap.classList.add("is-empty");
      photoWrap.textContent = "Add a photo via admin.html";
    }
    left.appendChild(photoWrap);

    var h1 = document.createElement("h1");
    h1.textContent = site.name || "About";
    left.appendChild(h1);

    layout.appendChild(left);

    // Right: bio. (No email here — the Contact menu in the nav
    // already covers that.)
    var right = document.createElement("div");
    right.className = "about-right";

    var p = document.createElement("p");
    p.textContent = site.about || "";
    right.appendChild(p);

    layout.appendChild(right);

    els.aboutContent.appendChild(layout);
  }

  /* ---------- project detail ---------- */

  function renderProject(id) {
    var project = findProject(id);
    if (!project) {
      location.hash = "#";
      return false;
    }

    els.projectTitle.textContent = project.title || "";

    els.projectMeta.innerHTML = "";
    sortByCategoryOrder(project.categories || []).forEach(function (cat) {
      els.projectMeta.appendChild(buildTagPill(cat));
    });
    [project.year, project.client].forEach(function (bit) {
      if (!bit) return;
      var span = document.createElement("span");
      span.textContent = bit;
      els.projectMeta.appendChild(span);
    });

    els.projectDescription.textContent = project.description || "";

    if (project.website) {
      els.projectLink.href = project.website;
      els.projectLink.hidden = false;
    } else {
      els.projectLink.hidden = true;
      els.projectLink.removeAttribute("href");
    }

    var media = project.media || [];

    els.projectMedia.innerHTML = "";
    media.forEach(function (item, index) {
      var figure = document.createElement("figure");
      var el;
      if (item.type === "video") {
        el = document.createElement("video");
        el.src = item.src;
        if (item.poster) el.poster = item.poster;
        el.muted = true;
        el.loop = true;
        el.controls = true;
        el.playsInline = true;
        el.preload = "metadata";
        figure.appendChild(el);
        autoplayInView(el);

        var expand = document.createElement("button");
        expand.type = "button";
        expand.className = "media-expand";
        expand.setAttribute("aria-label", "View larger");
        expand.innerHTML = '<svg viewBox="0 0 20 20"><path d="M7 3H3v4M13 3h4v4M7 17H3v-4M13 17h4v-4"/></svg>';
        expand.addEventListener("click", function (e) {
          e.stopPropagation();
          openLightbox(media, index);
        });
        figure.appendChild(expand);
      } else {
        el = document.createElement("img");
        el.src = item.src;
        el.alt = item.caption || project.title || "";
        el.loading = "lazy";
        el.addEventListener("click", function () { openLightbox(media, index); });
        figure.appendChild(el);
      }
      if (item.caption) {
        var figcaption = document.createElement("figcaption");
        figcaption.textContent = item.caption;
        figure.appendChild(figcaption);
      }
      els.projectMedia.appendChild(figure);
    });

    // Points to whatever's next going down the same date-ordered list
    // the gallery itself uses (sortedProjects — newest year first, then
    // manual order within a year), wrapping back to the first project
    // after the last one. Hidden entirely when there's nothing else to
    // link to.
    if (els.nextProject) {
      var order = sortedProjects();
      if (order.length > 1) {
        var currentIndex = 0;
        for (var i = 0; i < order.length; i++) {
          if (order[i].id === project.id) { currentIndex = i; break; }
        }
        var next = order[(currentIndex + 1) % order.length];
        els.nextProject.href = "#p/" + encodeURIComponent(next.id);
        els.nextProjectTitle.textContent = next.title || "Untitled";
        els.nextProject.hidden = false;
      } else {
        els.nextProject.hidden = true;
      }
    }

    return true;
  }

  /* ---------- lightbox ---------- */
  /* A simple zoomed-in viewer for a project's media, with a carousel
     when there's more than one item. Shown via the .is-open class
     rather than the [hidden] attribute (see the contact-menu note
     above — the same display-override risk applies here). */

  var lightboxMedia = [];
  var lightboxIndex = 0;

  function openLightbox(media, index) {
    lightboxMedia = media;
    lightboxIndex = index;
    renderLightboxItem();
    els.lightbox.classList.add("is-open");
    document.addEventListener("keydown", onLightboxKeydown);
  }

  function closeLightbox() {
    els.lightbox.classList.remove("is-open");
    els.lightboxStage.innerHTML = ""; // stop any playing video
    document.removeEventListener("keydown", onLightboxKeydown);
  }

  function showLightboxIndex(newIndex) {
    var n = lightboxMedia.length;
    lightboxIndex = (newIndex + n) % n;
    renderLightboxItem();
  }

  function renderLightboxItem() {
    var item = lightboxMedia[lightboxIndex];
    els.lightboxStage.innerHTML = "";
    var el;
    if (item.type === "video") {
      el = document.createElement("video");
      el.src = item.src;
      if (item.poster) el.poster = item.poster;
      el.controls = true;
      el.playsInline = true;
      el.autoplay = true;
    } else {
      el = document.createElement("img");
      el.src = item.src;
      el.alt = item.caption || "";
    }
    els.lightboxStage.appendChild(el);

    var multiple = lightboxMedia.length > 1;
    els.lightboxPrev.hidden = !multiple;
    els.lightboxNext.hidden = !multiple;
    els.lightboxCounter.hidden = !multiple;
    if (multiple) {
      els.lightboxCounter.textContent = (lightboxIndex + 1) + " / " + lightboxMedia.length;
    }
  }

  function onLightboxKeydown(e) {
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") showLightboxIndex(lightboxIndex - 1);
    else if (e.key === "ArrowRight") showLightboxIndex(lightboxIndex + 1);
  }

  function setUpLightbox() {
    if (!els.lightbox) return;
    els.lightboxClose.addEventListener("click", closeLightbox);
    els.lightboxPrev.addEventListener("click", function () { showLightboxIndex(lightboxIndex - 1); });
    els.lightboxNext.addEventListener("click", function () { showLightboxIndex(lightboxIndex + 1); });
    // Click the dark backdrop (not the stage or its media/controls) to close.
    els.lightbox.addEventListener("click", function (e) {
      if (e.target === els.lightbox) closeLightbox();
    });
  }

  /* ---------- custom cursor ---------- */
  /* A single four-pointed star outline tracks the mouse exactly — no
     easing/lag, replacing the native pointer. (Earlier this was a
     small dot plus a separate, slower-following star; the dot is gone
     and the star itself now plays that precise-pointer role.) Only
     wired up on a real mouse/trackpad (matchMedia check below) — touch
     devices never get the mousemove listener at all, so there's no
     risk of a ghost cursor flashing in from a tap. As it moves, it
     drops short-lived clones of itself (the "echo" trail), spaced out
     and kept brief so the trail stays light rather than crowding the
     page — each one just fades and grows slightly before removing
     itself. */
  function setUpCustomCursor() {
    if (!els.cursorStar) return;
    if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var star = els.cursorStar;

    // Drops a fading clone of the star at (x, y). Sized to match
    // whatever the live star's own size is right now (bigger while
    // hovering something clickable), so the trail doesn't visibly
    // change size out from under itself mid-hover.
    function spawnEcho(x, y) {
      var echo = star.cloneNode(true);
      echo.removeAttribute("id");
      echo.setAttribute("class", "cursor-echo");
      var size = star.classList.contains("is-active") ? 36 : 20;
      echo.style.width = size + "px";
      echo.style.height = size + "px";
      echo.style.left = x + "px";
      echo.style.top = y + "px";
      document.body.appendChild(echo);
      echo.addEventListener("animationend", function () {
        echo.remove();
      });
    }

    var lastEchoX = null, lastEchoY = null, lastEchoAt = 0;
    // Deliberately sparse — a wide gap and a longer time floor than a
    // literal "every so often" trail would use, per feedback that the
    // first pass left too much of a trail behind.
    var ECHO_MIN_DIST = 28; // px the star must move before dropping another echo
    var ECHO_MIN_INTERVAL = 150; // ms floor, so a very fast swipe doesn't flood the page

    document.addEventListener("mousemove", function (e) {
      var x = e.clientX;
      var y = e.clientY;
      star.style.left = x + "px";
      star.style.top = y + "px";
      star.classList.add("is-visible");

      var now = performance.now();
      var dx = lastEchoX === null ? Infinity : x - lastEchoX;
      var dy = lastEchoY === null ? Infinity : y - lastEchoY;
      var movedEnough = dx * dx + dy * dy > ECHO_MIN_DIST * ECHO_MIN_DIST;
      if (movedEnough && now - lastEchoAt > ECHO_MIN_INTERVAL) {
        lastEchoAt = now;
        lastEchoX = x;
        lastEchoY = y;
        spawnEcho(x, y);
      }
    });

    document.addEventListener("mouseleave", function () {
      star.classList.remove("is-visible");
    });

    // Grows the star over anything clickable — links, buttons, pills,
    // gallery cards, form fields. Delegated on document so it keeps
    // working for pills/cards that get rebuilt (filters, project list)
    // after this runs once at startup.
    var HOVER_TARGETS = "a, button, input, textarea, .pill, .pill-tag, .project-card";
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest(HOVER_TARGETS)) star.classList.add("is-active");
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest(HOVER_TARGETS)) star.classList.remove("is-active");
    });
  }

  /* ---------- router ---------- */

  function showView(name) {
    els.home.hidden = name !== "home";
    els.about.hidden = name !== "about";
    els.project.hidden = name !== "project";
    window.scrollTo(0, 0);
    closeContactMenu();
    closeLightbox();
  }

  function route() {
    var hash = location.hash || "#";
    if (hash === "#about") {
      renderAbout();
      showView("about");
    } else if (hash.indexOf("#p/") === 0) {
      var id = decodeURIComponent(hash.slice(3));
      if (renderProject(id)) showView("project");
    } else {
      renderHome();
      showView("home");
    }
  }

  renderChrome();
  setUpLightbox();
  setUpCustomCursor();
  window.addEventListener("hashchange", route);
  route();
})();
