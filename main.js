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
    navLeft: document.querySelector(".nav-left"),
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
    // The name is drawn twice (a small and a big version, crossfaded by
    // CSS when the about page toggles body.is-about), so set both.
    if (els.navCenter) {
      var nameText = DATA.site.name || "Portfolio";
      els.navCenter.querySelectorAll(".nav-name").forEach(function (span) {
        span.textContent = nameText;
      });
    }
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

  /* ---------- project page media (with skinny-pair grouping) ---------- */

  /* Builds one <figure> for a single media item — same video/image/
     caption logic that used to sit directly inline in renderProject's
     media loop, just pulled out so both the normal one-per-row path
     and the side-by-side "skinny pair" path (below) can share it.
     `index` is always the item's position in the FULL media array,
     never its position within a paired row, so lightbox prev/next
     navigation (openLightbox(media, index)) keeps working exactly as
     before regardless of how things are visually grouped. */
  function buildMediaFigure(item, index, media, project) {
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
    return figure;
  }

  /* A plain image or video stretched to the column's full width (see
     .project-media img/video, width: 100%) turns any narrow/tall one
     into something very long on the page. When two such "skinny"
     items fall right next to each other in the list — any mix of
     images and videos — put them side by side in one row instead —
     each one ends up smaller, but both are visible at once without
     the long scroll. Never pairs a skinny item next to a non-skinny
     one: needs each item's real pixel dimensions to know what's
     skinny, so every item is probed first -- a throwaway Image() for
     a still image (same URL the real <img> will use, so no extra
     bytes, just means layout waits for that load instead of images
     streaming in one by one), or a throwaway <video preload="metadata">
     for a video (this only needs to fetch enough of the file for its
     dimensions, not the whole thing, so it's cheap). */
  function renderProjectMedia(media, project) {
    var SKINNY_RATIO = 4 / 3; // height:width -- counts as "skinny" once taller than this relative to its own width

    function probeImage(src) {
      return new Promise(function (resolve) {
        var probe = new Image();
        probe.onload = function () {
          resolve({ w: probe.naturalWidth, h: probe.naturalHeight });
        };
        probe.onerror = function () { resolve(null); };
        probe.src = src;
      });
    }

    function probeVideo(src) {
      return new Promise(function (resolve) {
        var probe = document.createElement("video");
        probe.preload = "metadata";
        probe.muted = true;
        probe.onloadedmetadata = function () {
          resolve({ w: probe.videoWidth, h: probe.videoHeight });
        };
        probe.onerror = function () { resolve(null); };
        probe.src = src;
      });
    }

    Promise.all(
      media.map(function (item) {
        if (!item.src) return Promise.resolve(null);
        return item.type === "video" ? probeVideo(item.src) : probeImage(item.src);
      })
    ).then(function (dims) {
      var isSkinny = dims.map(function (d) {
        return !!d && d.w > 0 && d.h / d.w > SKINNY_RATIO;
      });

      var i = 0;
      while (i < media.length) {
        if (isSkinny[i] && i + 1 < media.length && isSkinny[i + 1]) {
          var row = document.createElement("div");
          row.className = "media-row";
          // Natural width:height ratio of each paired item, stashed on
          // the row itself so layoutMediaRows() can size them without
          // re-probing — it already has everything it needs right here.
          row.dataset.ratios = (dims[i].w / dims[i].h) + "," + (dims[i + 1].w / dims[i + 1].h);
          row.appendChild(buildMediaFigure(media[i], i, media, project));
          row.appendChild(buildMediaFigure(media[i + 1], i + 1, media, project));
          els.projectMedia.appendChild(row);
          i += 2;
        } else {
          els.projectMedia.appendChild(buildMediaFigure(media[i], i, media, project));
          i += 1;
        }
      }
      layoutMediaRows();
    });
  }

  /* Sizes every paired row currently on the project page so its two
     images/videos match in HEIGHT rather than just width — the same
     "justified" idea the home gallery already uses for its thumbnails
     (shared height, width whatever that works out to for each item's
     own ratio), just applied to a two-item row instead of a whole
     grid. Flexbox alone can't solve for this (growing/shrinking width
     to fill a row doesn't know to keep each item's height in sync with
     the other), so this does the math directly: read the row's
     rendered width and the gap between its two items, then divide that
     available width across both items in proportion to their ratios
     — the height that falls out of that is exactly the shared height
     that makes their combined width fill the row. Runs once right
     after a project's media is built, and again (debounced) on window
     resize, since the available width changes with the viewport (and,
     at the 600px breakpoint, media-row itself switches to a stacked
     column — handled below by just clearing the explicit sizing and
     letting the plain width: 100% rule for that state take back over). */
  function layoutMediaRows() {
    if (!els.projectMedia) return;
    var rows = els.projectMedia.querySelectorAll(".media-row");
    rows.forEach(function (row) {
      var figures = row.querySelectorAll(":scope > figure");
      var parts = (row.dataset.ratios || "").split(",").map(Number);
      if (figures.length !== 2 || parts.length !== 2 || !parts[0] || !parts[1]) return;

      var stacked = getComputedStyle(row).flexDirection === "column";
      if (stacked) {
        figures.forEach(function (figure) {
          var el = figure.querySelector("img, video");
          if (el) {
            el.style.width = "";
            el.style.height = "";
          }
        });
        return;
      }

      var gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      var available = row.getBoundingClientRect().width - gap;
      if (available <= 0) return;
      var sharedHeight = available / (parts[0] + parts[1]);

      figures.forEach(function (figure, index) {
        var el = figure.querySelector("img, video");
        if (!el) return;
        el.style.height = sharedHeight + "px";
        el.style.width = sharedHeight * parts[index] + "px";
      });
    });
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

  /* ---------- About page: floating bubbles ----------
     Each bio paragraph is a circle that drifts slowly around the window,
     bounces off the window edges and off the other bubbles (equal-ish
     "balloon" collisions: momentum is exchanged by mass, so big bubbles
     shove small ones), and can be grabbed, dragged and thrown. Bubble
     colors are spread across the same hue range as the gallery filter
     pills (HUE_START..HUE_END, categoryColor above). The markup is built
     by renderAbout(); startAboutBubbles() sizes and animates it once the
     about view is actually visible (so the layer has real dimensions). */

  var aboutBubbles = null;

  function stopAboutBubbles() {
    if (aboutBubbles) {
      aboutBubbles.stop();
      aboutBubbles = null;
    }
  }

  function startAboutBubbles() {
    stopAboutBubbles();
    var layer = els.aboutContent.querySelector(".about-bubbles");
    if (!layer) return;
    var els2 = Array.prototype.slice.call(layer.querySelectorAll(".about-bubble"));
    if (!els2.length) return;

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var RESTITUTION = 0.9; // how bouncy bubble-bubble and bubble-wall hits are
    var COVERAGE = 0.34; // share of the window the bubbles may fill
    var MIN_FONT = 9;
    var MAX_FONT = 24;
    var INNER = 1.3; // text box side as a share of the diameter. The box is bigger than the bubble (a circle only fits a 0.707 square) so the text runs right up to the rim on every side; the lens squeezes the overshoot in and the rim clips the far corners.
    var W = layer.clientWidth;
    var H = layer.clientHeight;
    var rafId = 0;
    var lastT = 0;
    var held = null;

    var bodies = els2.map(function (el, i) {
      var n = els2.length;
      var hue = n <= 1 ? (HUE_START + HUE_END) / 2 : HUE_START + (HUE_END - HUE_START) * (i / (n - 1));
      el.style.setProperty("--bubble-color", "hsla(" + Math.round(hue) + ", 72%, 70%, 0.72)");
      // The text is the same color as the bubble, but fully opaque.
      el.style.setProperty("--bubble-ink", "hsl(" + Math.round(hue) + ", 72%, 70%)");
      var textEl = el.firstChild;
      // Split the paragraph into words made of one inline-block span per
      // letter, so each letter can be bent individually (warpBubble). The
      // bubble itself carries the real text for screen readers.
      var lensCanvas = document.createElement("canvas");
      lensCanvas.className = "about-bubble-lens";
      lensCanvas.setAttribute("aria-hidden", "true");
      el.insertBefore(lensCanvas, textEl);
      var fullText = textEl.textContent;
      el.setAttribute("aria-label", fullText);
      textEl.setAttribute("aria-hidden", "true");
      textEl.textContent = "";
      var glyphs = [];
      fullText.split(" ").forEach(function (word, wi) {
        if (wi > 0) textEl.appendChild(document.createTextNode(" "));
        var w = document.createElement("span");
        w.className = "w";
        for (var ci = 0; ci < word.length; ci++) {
          var g = document.createElement("span");
          g.className = "g";
          g.textContent = word.charAt(ci);
          w.appendChild(g);
          glyphs.push(g);
        }
        textEl.appendChild(w);
      });
      return { el: el, hue: hue, text: fullText, glyphs: glyphs, canvas: lensCanvas, ctx: null, imgData: null, lut: null, lensOn: false, textEl: textEl, chars: fullText.length, x: 0, y: 0, vx: 0, vy: 0, r: 40, m: 1600, cruise: 26 + Math.random() * 16, tx: 0, ty: 0, pvx: 0, pvy: 0 };
    });

    // Pick the largest font (so bubble diameters follow) at which all the
    // bubbles together fit in COVERAGE of the window, then size each bubble
    // to its text and shrink its font if the text still overflows.
    function sizeBubbles() {
      var f, total;
      for (f = MAX_FONT; f >= MIN_FONT; f -= 0.5) {
        total = 0;
        bodies.forEach(function (b) {
          var d = diameterFor(b, f);
          total += Math.PI * d * d / 4;
        });
        if (total <= W * H * COVERAGE) break;
      }
      bodies.forEach(function (b) {
        var d = diameterFor(b, f);
        b.glyphs.forEach(function (g) { g.style.transform = ""; }); // measure the flat text
        b.el.style.width = b.el.style.height = d + "px";
        var box = d * INNER;
        b.textEl.style.width = box + "px";
        b.textEl.style.lineHeight = "";
        // Largest font whose text block still fits the box's height
        // (binary search; short paragraphs may grow up to 1.5x the shared size)...
        var lo = 7.5, hi = f * 1.5;
        for (var it = 0; it < 12; it++) {
          var mid = (lo + hi) / 2;
          b.textEl.style.fontSize = mid + "px";
          if (b.textEl.scrollHeight <= box) lo = mid; else hi = mid;
        }
        var fs = lo;
        b.textEl.style.fontSize = fs + "px";
        // ...then spread the lines so the block is exactly as tall as the box:
        // no empty band above or below the text.
        var natural = b.textEl.scrollHeight;
        var lines = Math.max(1, Math.round(natural / (fs * 1.38)));
        var lh = box / lines;
        b.textEl.style.lineHeight = Math.min(Math.max(lh, fs * 1.15), fs * 2.1) + "px";
        b.r = d / 2;
        b.m = b.r * b.r;
        warpBubble(b);
      });
    }

    // Bend the text as if it sat inside a glass sphere: letters near the
    // middle are magnified a little, and the further out they are the more
    // they get squeezed toward the rim (radially) and spread around it
    // (tangentially), like looking through a fish-eye lens. Each letter
    // gets one rigid transform (position, rotation, squeeze), which is
    // computed once per layout, not per frame.
    function warpBubble(b) {
      b.glyphs.forEach(function (g) { g.style.transform = ""; });
      var br = b.el.getBoundingClientRect();
      var cx = br.left + br.width / 2, cy = br.top + br.height / 2, R = br.width / 2;
      b.glyphs.forEach(function (g) {
        var gr = g.getBoundingClientRect();
        var px = gr.left + gr.width / 2 - cx, py = gr.top + gr.height / 2 - cy;
        var rho = Math.sqrt(px * px + py * py) / R;
        if (rho < 1e-3) return;
        // q: how far out the letter is, as a share of the part of the flat
        // text the bubble shows (LENS_REACH radii). Letters past the rim
        // (q > 1) are hidden; they're cut off by the bubble's edge.
        var q = rho / LENS_REACH;
        g.style.visibility = q > 1.04 ? "hidden" : "";
        var lens = lensAt(Math.min(q, 0.9999));
        var th = Math.atan2(py, px);
        var ox = Math.cos(th) * lens.out * R, oy = Math.sin(th) * lens.out * R;
        var deg = th * 180 / Math.PI;
        g.style.transform =
          "translate(" + (ox - px).toFixed(2) + "px," + (oy - py).toFixed(2) + "px) " +
          "rotate(" + deg.toFixed(2) + "deg) scale(" + lens.radial.toFixed(3) + "," + lens.tangent.toFixed(3) + ") rotate(" + (-deg).toFixed(2) + "deg)";
      });
    }
    // Lens profile. Going from the bubble's rim inward, source radius is
    // s(u) = (1-A)u + A(2/pi)asin(u) (A=0 is no warp, A=1 a full sphere);
    // we need the inverse (where a letter at source radius rho lands), which
    // is tabulated once and looked up by linear interpolation.
    var LENS_A = 0.85; // photo lens strength (used further down)
    var TEXT_LENS_A = 0.93; // text warp strength: 0 = flat, 1 = full sphere
    var LENS_FIT = 1; // output radius multiplier (1 = the lens fills the whole bubble)
    var LENS_REACH = 1.3; // flat-text radius (in bubble radii) that lands on the rim
    var lensTable = [];
    for (var li = 0; li <= 800; li++) {
      var u = li / 800 * 0.99995;
      lensTable.push([(1 - TEXT_LENS_A) * u + TEXT_LENS_A * (2 / Math.PI) * Math.asin(u), u]);
    }
    function lensAt(rho) {
      var lo = 0, hi = lensTable.length - 1;
      while (hi - lo > 1) {
        var mid = (lo + hi) >> 1;
        if (lensTable[mid][0] < rho) lo = mid; else hi = mid;
      }
      var a = lensTable[lo], c = lensTable[hi];
      var t = (rho - a[0]) / (c[0] - a[0] || 1);
      var u = a[1] + (c[1] - a[1]) * t;
      var slope = (c[1] - a[1]) / (c[0] - a[0] || 1); // du/drho
      return {
        out: u * LENS_FIT,
        radial: Math.max(0.15, slope / LENS_REACH) * LENS_FIT,
        tangent: (u / rho / LENS_REACH) * LENS_FIT
      };
    }
    function diameterFor(b, f) {
      var textArea = b.chars * 0.72 * f * 1.4 * f * 1.15; // 0.72em: average width of a bold all-caps letter
      var d = Math.sqrt(textArea) / INNER;
      d = Math.max(d, 5.5 * f, 88); // short paragraphs still get a bubble you can grab
      return Math.min(d, Math.min(W, H) * 0.85);
    }

    function clampToWindow(b) {
      if (b.x < b.r) b.x = b.r;
      if (b.x > W - b.r) b.x = Math.max(b.r, W - b.r);
      if (b.y < b.r) b.y = b.r;
      if (b.y > H - b.r) b.y = Math.max(b.r, H - b.r);
    }

    function placeBubbles() {
      var order = bodies.slice().sort(function (a, b) { return b.r - a.r; });
      var placed = [];
      order.forEach(function (b) {
        var best = null;
        for (var tries = 0; tries < 300; tries++) {
          var x = b.r + Math.random() * Math.max(1, W - 2 * b.r);
          var y = b.r + Math.random() * Math.max(1, H - 2 * b.r);
          var ok = placed.every(function (p) {
            var dx = p.x - x, dy = p.y - y, min = p.r + b.r + 6;
            return dx * dx + dy * dy >= min * min;
          });
          if (ok) { best = { x: x, y: y }; break; }
          if (!best) best = { x: x, y: y };
        }
        b.x = best.x;
        b.y = best.y;
        var ang = Math.random() * Math.PI * 2;
        var sp = reduceMotion ? 0 : b.cruise;
        b.vx = Math.cos(ang) * sp;
        b.vy = Math.sin(ang) * sp;
        placed.push(b);
      });
    }

    function render() {
      bodies.forEach(function (b) {
        b.el.style.transform = "translate3d(" + (b.x - b.r).toFixed(2) + "px," + (b.y - b.r).toFixed(2) + "px,0)";
        drawLens(b);
      });
    }

    // ----- seeing the photo through a bubble -----
    // While a bubble sits over the photo, its canvas shows that part of the
    // photo bent by the same glass-sphere lens as the text (magnified in
    // the middle, squeezed toward the rim, and lining up exactly with the
    // untouched photo at the rim so there is no seam). It is drawn per
    // pixel on a canvas, only for bubbles currently touching the photo.
    // If the browser won't let the page read the photo's pixels (e.g. the
    // site opened straight from disk), the effect quietly switches off.
    var photoEl = els.aboutContent.querySelector(".about-photo");
    var photoImg = photoEl && photoEl.querySelector("img");
    var LENS_SCALE = Math.min(window.devicePixelRatio || 1, 1.5);
    var photo = null;
    var photoFailed = !photoImg;

    function preparePhoto() {
      if (photoFailed || !photoImg.complete || !photoImg.naturalWidth) return;
      var r = photoEl.getBoundingClientRect();
      var w = Math.round(r.width * LENS_SCALE), h = Math.round(r.height * LENS_SCALE);
      if (!w || !h) return;
      try {
        var c = document.createElement("canvas");
        c.width = w; c.height = h;
        var cx = c.getContext("2d");
        var nw = photoImg.naturalWidth, nh = photoImg.naturalHeight;
        var sc = Math.max(w / nw, h / nh); // object-fit: cover
        cx.drawImage(photoImg, (w - nw * sc) / 2, (h - nh * sc) / 2, nw * sc, nh * sc);
        cx.getImageData(0, 0, 1, 1); // throws right here if the photo's pixels are off-limits
        photo = { left: r.left, top: r.top, cssW: r.width, cssH: r.height, canvas: c };
      } catch (err) {
        photoFailed = true;
      }
    }

    // For each pixel of a bubble's canvas: where (relative to the bubble's
    // centre, in CSS px) the lens takes its colour from.
    function buildLut(b) {
      var n = Math.max(2, Math.ceil(b.r * 2 * LENS_SCALE));
      var lx = new Float32Array(n * n), ly = new Float32Array(n * n), inside = new Uint8Array(n * n);
      for (var py = 0; py < n; py++) {
        for (var px = 0; px < n; px++) {
          var ox = (px + 0.5) / n * 2 - 1, oy = (py + 0.5) / n * 2 - 1; // -1..1 across the bubble
          var u = Math.sqrt(ox * ox + oy * oy), i = py * n + px;
          if (u >= 1) continue;
          var s = (1 - LENS_A) * u + LENS_A * (2 / Math.PI) * Math.asin(u); // source radius, in bubble radii
          var k = u > 1e-6 ? s / u : 1;
          lx[i] = ox * k * b.r;
          ly[i] = oy * k * b.r;
          inside[i] = 1;
        }
      }
      b.lut = { n: n, r: b.r, lx: lx, ly: ly, inside: inside };
      b.canvas.width = n;
      b.canvas.height = n;
      b.ctx = b.canvas.getContext("2d");
      b.imgData = b.ctx.createImageData(n, n);
    }

    // The lens looks at a small "backdrop" picture of whatever lies under
    // the bubble (the photo and any sticky notes, on the black page), drawn
    // fresh each frame on a scratch canvas, and bends that. Notes are DOM
    // text, so each one is drawn from a cached bitmap that copies its colors
    // and the position of every word.
    var patchCanvas = document.createElement("canvas");
    var patchCtx = patchCanvas.getContext("2d", { willReadFrequently: true });

    function noteBitmap(note) {
      if (note._bmp) return note._bmp;
      var w = note.offsetWidth, h = note.offsetHeight, S = LENS_SCALE;
      var c = document.createElement("canvas");
      c.width = Math.ceil(w * S);
      c.height = Math.ceil(h * S);
      var x = c.getContext("2d");
      x.scale(S, S);
      x.fillStyle = note.style.getPropertyValue("--note-color") || "#f6e58d";
      x.fillRect(0, 0, w, h);
      var cs = getComputedStyle(note);
      x.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      x.fillStyle = "#1c1c1c";
      x.textBaseline = "alphabetic";
      var asc = x.measureText("Hg").fontBoundingBoxAscent || parseFloat(cs.fontSize) * 0.95;
      Array.prototype.forEach.call(note.querySelectorAll("span"), function (sp) {
        x.fillText(sp.textContent, sp.offsetLeft, sp.offsetTop + asc);
      });
      if (!document.fonts || document.fonts.status === "loaded") note._bmp = c; // else redo once fonts arrive
      return c;
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (notesLayer) Array.prototype.forEach.call(notesLayer.children, function (n) { n._bmp = null; });
      });
    }

    function drawLens(b) {
      if (!photo && !photoFailed) preparePhoto();
      var bl = b.x - b.r, bt = b.y - b.r, br = b.x + b.r, bb2 = b.y + b.r;
      var pr = photo ? { l: photo.left, t: photo.top, r: photo.left + photo.cssW, b: photo.top + photo.cssH }
             : photoEl ? (function (rc) { return { l: rc.left, t: rc.top, r: rc.right, b: rc.bottom }; })(photoEl.getBoundingClientRect())
             : null;
      var overPhoto = !!pr && !(br < pr.l || bl > pr.r || bb2 < pr.t || bt > pr.b);
      var over = [];
      if (notesLayer) {
        Array.prototype.forEach.call(notesLayer.children, function (n) {
          var nw = n._w, nh = n._h;
          if (n._x + nw > bl && n._x < br && n._y + nh > bt && n._y < bb2) over.push(n);
        });
      }
      // Over the photo but its pixels aren't readable (or not loaded yet):
      // no lens for this bubble rather than a wrong one.
      var usePhoto = overPhoto && !!photo;
      if ((overPhoto && !photo) || (!usePhoto && !over.length)) {
        if (b.lensOn) { b.canvas.style.display = "none"; b.lensOn = false; }
        return;
      }
      if (!b.lut || b.lut.r !== b.r) buildLut(b);
      var L = b.lut, n = L.n, out = b.imgData.data, S = n / (2 * b.r);

      // 1) paint the backdrop under the bubble
      if (patchCanvas.width !== n) { patchCanvas.width = n; patchCanvas.height = n; }
      patchCtx.setTransform(1, 0, 0, 1, 0, 0);
      patchCtx.fillStyle = "#000";
      patchCtx.fillRect(0, 0, n, n);
      patchCtx.setTransform(S, 0, 0, S, -bl * S, -bt * S);
      if (usePhoto) patchCtx.drawImage(photo.canvas, photo.left, photo.top, photo.cssW, photo.cssH);
      over.sort(function (p, q) { return (parseInt(p.style.zIndex, 10) || 0) - (parseInt(q.style.zIndex, 10) || 0); });
      over.forEach(function (note) {
        var nw = note._w, nh = note._h;
        patchCtx.save();
        patchCtx.translate(note._x + nw / 2, note._y + nh / 2);
        patchCtx.rotate(note._tilt || 0);
        patchCtx.drawImage(noteBitmap(note), -nw / 2, -nh / 2, nw, nh);
        patchCtx.restore();
      });
      var d = patchCtx.getImageData(0, 0, n, n).data;

      // 2) bend it
      var lim = n - 1.001;
      for (var i = 0, o = 0; i < n * n; i++, o += 4) {
        if (!L.inside[i]) { out[o + 3] = 0; continue; }
        var fx = (b.r + L.lx[i]) * S, fy = (b.r + L.ly[i]) * S;
        fx = fx < 0 ? 0 : fx > lim ? lim : fx;
        fy = fy < 0 ? 0 : fy > lim ? lim : fy;
        var x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0;
        var p = (y0 * n + x0) * 4, q = p + n * 4;
        for (var c = 0; c < 3; c++) {
          var a = d[p + c], bq = d[p + 4 + c], cc = d[q + c], dd = d[q + 4 + c];
          out[o + c] = a + (bq - a) * tx + ((cc - a) + ((dd - cc) - (bq - a)) * tx) * ty;
        }
        out[o + 3] = 255;
      }
      b.ctx.putImageData(b.imgData, 0, 0);
      if (!b.lensOn) { b.canvas.style.display = "block"; b.lensOn = true; }
    }

    function collide() {
      for (var i = 0; i < bodies.length; i++) {
        for (var j = i + 1; j < bodies.length; j++) {
          var a = bodies[i], b = bodies[j];
          var dx = b.x - a.x, dy = b.y - a.y;
          var min = a.r + b.r;
          var d2 = dx * dx + dy * dy;
          if (d2 >= min * min) continue;
          var dist = Math.sqrt(d2);
          var nx, ny;
          if (dist < 1e-4) { var ang = Math.random() * Math.PI * 2; nx = Math.cos(ang); ny = Math.sin(ang); dist = 0; }
          else { nx = dx / dist; ny = dy / dist; }
          var ia = a === held ? 0 : 1 / a.m;
          var ib = b === held ? 0 : 1 / b.m;
          var sum = ia + ib;
          if (sum === 0) continue;
          var overlap = min - dist;
          a.x -= nx * overlap * ia / sum; a.y -= ny * overlap * ia / sum;
          b.x += nx * overlap * ib / sum; b.y += ny * overlap * ib / sum;
          var rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) {
            var imp = -(1 + RESTITUTION) * rv / sum;
            a.vx -= imp * ia * nx; a.vy -= imp * ia * ny;
            b.vx += imp * ib * nx; b.vy += imp * ib * ny;
          }
        }
      }
    }

    function step(dt) {
      var sub = 2, h = dt / sub;
      for (var s = 0; s < sub; s++) {
        bodies.forEach(function (b) {
          if (b === held) {
            // Follow the pointer; its velocity (for shoving others / the
            // throw on release) is derived from how far it moved.
            var nvx = (b.tx - b.x) / h, nvy = (b.ty - b.y) / h;
            b.vx = b.vx * 0.5 + nvx * 0.5;
            b.vy = b.vy * 0.5 + nvy * 0.5;
            b.x = b.tx; b.y = b.ty;
            return;
          }
          // Ease the speed back toward a slow cruise (so a throw settles
          // down after a couple of seconds) and let the heading wander a
          // little so the drift never looks mechanical.
          var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          var target = reduceMotion ? 0 : b.cruise;
          if (sp < 0.5 && target > 0) {
            var a0 = Math.random() * Math.PI * 2;
            b.vx = Math.cos(a0) * target; b.vy = Math.sin(a0) * target;
            sp = target;
          }
          if (sp > 0) {
            var rate = reduceMotion ? 1.6 : 0.5;
            var ns = sp + (target - sp) * (1 - Math.exp(-rate * h));
            var turn = reduceMotion ? 0 : (Math.random() - 0.5) * 1.2 * h;
            var cos = Math.cos(turn), sin = Math.sin(turn);
            var ux = (b.vx * cos - b.vy * sin) / sp, uy = (b.vx * sin + b.vy * cos) / sp;
            b.vx = ux * ns; b.vy = uy * ns;
          }
          b.x += b.vx * h;
          b.y += b.vy * h;
          // Window edges: reflect.
          if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * RESTITUTION; }
          else if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * RESTITUTION; }
          if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy) * RESTITUTION; }
          else if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy) * RESTITUTION; }
        });
        collide();
        collide();
        bodies.forEach(function (b) { if (b !== held) clampToWindow(b); });
      }
    }

    function frame(t) {
      rafId = requestAnimationFrame(frame);
      var dt = lastT ? Math.min((t - lastT) / 1000, 1 / 30) : 1 / 60;
      lastT = t;
      if (dt <= 0) return;
      step(dt);
      render();
    }

    // ----- dragging -----
    var lastDown = { b: null, t: 0, x: 0, y: 0 };
    function onDown(e) {
      var el = e.target.closest && e.target.closest(".about-bubble");
      if (!el || held) return;
      var b = bodies.filter(function (x) { return x.el === el; })[0];
      if (!b) return;
      e.preventDefault();
      // Second press on the same bubble within ~0.4s and about the same
      // spot = double click / double tap: pop it.
      if (lastDown.b === b && e.timeStamp - lastDown.t < 400 &&
          Math.hypot(e.clientX - lastDown.x, e.clientY - lastDown.y) < 16) {
        lastDown = { b: null, t: 0, x: 0, y: 0 };
        popBubble(b);
        return;
      }
      lastDown = { b: b, t: e.timeStamp, x: e.clientX, y: e.clientY };
      held = b;
      b.grabDX = e.clientX - b.x;
      b.grabDY = e.clientY - b.y;
      b.tx = b.x; b.ty = b.y;
      b.vx = b.vy = 0;
      b.lastMoveT = e.timeStamp;
      b.samples = [{ t: e.timeStamp, x: e.clientX, y: e.clientY }];
      el.classList.add("is-held");
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    }
    function onMove(e) {
      if (!held || !held.el.hasPointerCapture || !held.el.hasPointerCapture(e.pointerId)) return;
      held.tx = Math.min(Math.max(e.clientX - held.grabDX, held.r), Math.max(held.r, W - held.r));
      held.ty = Math.min(Math.max(e.clientY - held.grabDY, held.r), Math.max(held.r, H - held.r));
      held.lastMoveT = e.timeStamp;
      held.samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
      if (held.samples.length > 12) held.samples.shift();
    }
    function onUp(e) {
      if (!held) return;
      var b = held;
      held = null;
      b.el.classList.remove("is-held");
      // Throw velocity comes from the pointer's last ~120ms of travel (not
      // from the bubble's own smoothed speed, which dips between events).
      // If the pointer sat still before release, don't fling it.
      var recent = b.samples.filter(function (s) { return e.timeStamp - s.t <= 120; });
      var vx = 0, vy = 0;
      if (recent.length >= 2 && e.timeStamp - b.lastMoveT <= 90) {
        var first = recent[0], last = recent[recent.length - 1];
        var span = (last.t - first.t) / 1000;
        if (span > 0.004) { vx = (last.x - first.x) / span; vy = (last.y - first.y) / span; }
      }
      var sp = Math.sqrt(vx * vx + vy * vy), MAX = 900;
      if (sp > MAX) { vx *= MAX / sp; vy *= MAX / sp; }
      b.vx = vx;
      b.vy = vy;
    }
    layer.addEventListener("pointerdown", onDown);
    layer.addEventListener("pointermove", onMove);
    layer.addEventListener("pointerup", onUp);
    layer.addEventListener("pointercancel", onUp);

    // ----- popping: a double click bursts the bubble and leaves a sticky
    // note with the paragraph, flat and readable. Notes sit in their own
    // layer (under the bubbles) and can be dragged around the window.
    var notesLayer = els.aboutContent.querySelector(".about-notes");
    var noteZ = 1;
    var dragNote = null;
    var NOTE_TOP_MARGIN = 64; // keep notes clear of the nav strip when they fit

    function popBubble(b) {
      var i = bodies.indexOf(b);
      if (i === -1) return;
      bodies.splice(i, 1);
      if (held === b) held = null;
      var x = b.x, y = b.y, r = b.r;
      b.el.style.setProperty("--px", (x - r).toFixed(1) + "px");
      b.el.style.setProperty("--py", (y - r).toFixed(1) + "px");
      b.el.classList.remove("is-held");
      b.el.style.transform = ""; // the .is-popping CSS takes over positioning
      if (reduceMotion) {
        b.el.remove();
      } else {
        b.el.classList.add("is-popping");
        setTimeout(function () { b.el.remove(); }, 260);
        // a ring of little droplets flying outward
        var color = b.el.style.getPropertyValue("--bubble-color");
        for (var k = 0; k < 14; k++) {
          var th = (k / 14) * Math.PI * 2 + Math.random() * 0.4;
          var dist = 28 + Math.random() * 46;
          var bit = document.createElement("span");
          bit.className = "about-pop-bit";
          bit.style.setProperty("--bubble-color", color);
          bit.style.setProperty("--s", (4 + Math.random() * 7).toFixed(1) + "px");
          bit.style.setProperty("--cx", (x + Math.cos(th) * r).toFixed(1) + "px");
          bit.style.setProperty("--cy", (y + Math.sin(th) * r).toFixed(1) + "px");
          bit.style.setProperty("--dx", (Math.cos(th) * dist).toFixed(1) + "px");
          bit.style.setProperty("--dy", (Math.sin(th) * dist).toFixed(1) + "px");
          layer.appendChild(bit);
          setTimeout((function (el) { return function () { el.remove(); }; })(bit), 600);
        }
      }
      if (notesLayer) spawnNote(b, x, y);
      // Last bubble gone: the instructions have done their job, so fade them out.
      if (!bodies.length) {
        var hintEl = els.aboutContent.querySelector(".about-hint");
        if (hintEl) hintEl.classList.add("is-gone");
      }
    }

    function clampNote(note, x, y) {
      var w = note.offsetWidth, h = note.offsetHeight;
      note._w = w; note._h = h; // cached: drawLens reads these every frame
      var minY = (H - h - 8 >= NOTE_TOP_MARGIN) ? NOTE_TOP_MARGIN : 8;
      note._x = Math.min(Math.max(x, 8), Math.max(8, W - w - 8));
      note._y = Math.min(Math.max(y, minY), Math.max(minY, H - h - 8));
      note.style.left = note._x + "px";
      note.style.top = note._y + "px";
    }

    function spawnNote(b, x, y) {
      var note = document.createElement("div");
      note.className = "about-note";
      // One span per word (so the lens can copy where each word sits).
      // The last words are joined by non-breaking spaces so the final line
      // is never a single stray word (an "orphan"): two words, or three
      // when the last two are short.
      var noteWords = b.text.split(" ");
      var glue = noteWords.length;
      if (glue >= 3) {
        glue = noteWords.length - 2;
        if (noteWords[noteWords.length - 1].length + noteWords[noteWords.length - 2].length < 11 && noteWords.length >= 4) glue--;
      }
      noteWords.forEach(function (word, wi) {
        if (wi > 0) note.appendChild(document.createTextNode(wi > glue ? "\u00a0" : " "));
        var sp = document.createElement("span");
        sp.textContent = word;
        note.appendChild(sp);
      });
      note.style.setProperty("--note-color", "hsl(" + Math.round(b.hue) + ", 78%, 86%)");
      var tiltDeg = (Math.random() - 0.5) * 6;
      note._tilt = tiltDeg * Math.PI / 180;
      note.style.setProperty("--tilt", tiltDeg.toFixed(1) + "deg");
      note.style.width = Math.min(300, Math.max(200, W * 0.3)) + "px";
      note.style.fontSize = W < 600 ? "13px" : "14px";
      note.style.zIndex = ++noteZ;
      if (!reduceMotion) note.classList.add("is-new");
      notesLayer.appendChild(note);
      clampNote(note, x - note.offsetWidth / 2, y - note.offsetHeight / 2);
    }

    function onNoteDown(e) {
      var note = e.target.closest && e.target.closest(".about-note");
      if (!note || dragNote) return;
      e.preventDefault();
      dragNote = note;
      note._gx = e.clientX - note._x;
      note._gy = e.clientY - note._y;
      note.style.zIndex = ++noteZ;
      note.classList.remove("is-new");
      note.classList.add("is-dragging");
      try { note.setPointerCapture(e.pointerId); } catch (err) {}
    }
    function onNoteMove(e) {
      if (!dragNote) return;
      clampNote(dragNote, e.clientX - dragNote._gx, e.clientY - dragNote._gy);
    }
    function onNoteUp() {
      if (!dragNote) return;
      dragNote.classList.remove("is-dragging");
      dragNote = null;
    }
    if (notesLayer) {
      notesLayer.addEventListener("pointerdown", onNoteDown);
      notesLayer.addEventListener("pointermove", onNoteMove);
      notesLayer.addEventListener("pointerup", onNoteUp);
      notesLayer.addEventListener("pointercancel", onNoteUp);
    }

    // ----- resize -----
    var resizeQueued = false;
    function onResize() {
      if (resizeQueued) return;
      resizeQueued = true;
      requestAnimationFrame(function () {
        resizeQueued = false;
        var ow = W, oh = H;
        W = layer.clientWidth;
        H = layer.clientHeight;
        if (!W || !H) return;
        photo = null; // its position/size changed; re-read lazily
        sizeBubbles();
        bodies.forEach(function (b) {
          b.x *= W / ow; b.y *= H / oh;
          clampToWindow(b);
          b.tx = b.x; b.ty = b.y;
        });
        collide(); collide();
        bodies.forEach(clampToWindow);
        if (notesLayer) Array.prototype.forEach.call(notesLayer.children, function (n) { clampNote(n, n._x, n._y); });
        render();
      });
    }
    window.addEventListener("resize", onResize);

    sizeBubbles();
    placeBubbles();
    render();
    rafId = requestAnimationFrame(frame);

    aboutBubbles = {
      stop: function () {
        cancelAnimationFrame(rafId);
        window.removeEventListener("resize", onResize);
        layer.removeEventListener("pointerdown", onDown);
        layer.removeEventListener("pointermove", onMove);
        layer.removeEventListener("pointerup", onUp);
        layer.removeEventListener("pointercancel", onUp);
        if (notesLayer) {
          notesLayer.removeEventListener("pointerdown", onNoteDown);
          notesLayer.removeEventListener("pointermove", onNoteMove);
          notesLayer.removeEventListener("pointerup", onNoteUp);
          notesLayer.removeEventListener("pointercancel", onNoteUp);
        }
      }
    };
  }

  function renderAbout() {
    var site = DATA.site;
    els.aboutContent.innerHTML = "";

    var layout = document.createElement("div");
    layout.className = "about-layout";

    // Left: photo. (The name used to sit under it; on this page it now
    // lives up in the nav instead — see the body.is-about rules in
    // style.css.)
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

    layout.appendChild(left);

    // The bio is no longer a text column: startAboutBubbles() (below)
    // turns each paragraph into a floating, draggable bubble inside this
    // fixed full-window layer. (No email here — the Contact menu in the
    // nav already covers that.)
    var bubbleLayer = document.createElement("div");
    bubbleLayer.className = "about-bubbles";
    bubbleLayer.setAttribute("role", "list");
    (site.about || "").split(/\n\s*\n/).forEach(function (para) {
      para = para.replace(/\s+/g, " ").trim();
      if (!para) return;
      var bubble = document.createElement("div");
      bubble.className = "about-bubble";
      bubble.setAttribute("role", "listitem");
      var text = document.createElement("div");
      text.className = "about-bubble-text";
      text.textContent = para;
      bubble.appendChild(text);
      bubbleLayer.appendChild(bubble);
    });
    // Sticky notes left by popped bubbles live in their own layer, under
    // the bubbles (see startAboutBubbles).
    var notesLayer = document.createElement("div");
    notesLayer.className = "about-notes";
    els.aboutContent.appendChild(notesLayer);
    var hint = document.createElement("p");
    hint.className = "about-hint";
    var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    hint.textContent = coarse ? "double tap a bubble to pop it" : "double click a bubble to pop it";
    els.aboutContent.appendChild(hint);
    els.aboutContent.appendChild(bubbleLayer);

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
    renderProjectMedia(media, project);

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

    // Grows the star over anything clickable — links, buttons, filter
    // pills, gallery cards, form fields. Delegated on document so it
    // keeps working for pills/cards that get rebuilt (filters, project
    // list) after this runs once at startup. Deliberately NOT
    // .pill-tag: those read-only category badges aren't clickable on
    // their own — on the project page (where they sit in the meta
    // row) they shouldn't make the cursor look interactive, and the
    // ones on gallery cards already count via the surrounding
    // .project-card link.
    var HOVER_TARGETS = "a, button, input, textarea, .pill, .project-card, .about-bubble, .about-note";
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
    // Lets CSS restyle the nav's name (bigger, heading font) only while
    // the about page is showing.
    document.body.classList.toggle("is-about", name === "about");
    // The about page never scrolls (the bubbles fill the window).
    document.documentElement.classList.toggle("is-about", name === "about");
    if (name !== "about") stopAboutBubbles();
    // Marks which nav item matches the page (CSS draws a small star next
    // to it): About on the about page, the name (home) on the work
    // pages — home and individual projects alike.
    if (els.navLeft) {
      if (name === "about") els.navLeft.setAttribute("aria-current", "page");
      else els.navLeft.removeAttribute("aria-current");
    }
    if (els.navCenter) {
      if (name !== "about") els.navCenter.setAttribute("aria-current", "page");
      else els.navCenter.removeAttribute("aria-current");
      // Hover note: on the about and project pages it says where the name
      // leads. On the gallery page there is no note.
      if (name === "home") els.navCenter.removeAttribute("data-tip");
      else els.navCenter.setAttribute("data-tip", "go back to my gallery page");
    }
    window.scrollTo(0, 0);
    closeContactMenu();
    closeLightbox();
  }

  function route() {
    var hash = location.hash || "#";
    if (hash === "#about") {
      renderAbout();
      showView("about");
      startAboutBubbles();
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

  // Re-run the paired-media-row sizing math (layoutMediaRows, above)
  // whenever the viewport resizes, since the width available to each
  // row changes with it. rAF-coalesced so a drag-resize doesn't run it
  // dozens of times a second; harmless (and cheap) to call when the
  // project view isn't even showing, since it just no-ops if there
  // are no .media-row elements to find.
  var mediaRowResizeQueued = false;
  window.addEventListener("resize", function () {
    if (mediaRowResizeQueued) return;
    mediaRowResizeQueued = true;
    requestAnimationFrame(function () {
      mediaRowResizeQueued = false;
      layoutMediaRows();
    });
  });

  route();
})();
