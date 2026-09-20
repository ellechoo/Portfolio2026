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
    pile: document.getElementById("intro-pile"),
    list: document.getElementById("project-list"),
    empty: document.getElementById("empty-state"),
    aboutContent: document.getElementById("about-content"),
    projectTitle: document.getElementById("project-title"),
    projectMeta: document.getElementById("project-meta"),
    projectDescription: document.getElementById("project-description"),
    projectMedia: document.getElementById("project-media"),
    contactLink: document.getElementById("contact-link"),
    navCenter: document.querySelector(".nav-center"),
  };

  function readData() {
    var tag = document.getElementById("site-data");
    var fallback = { site: { name: "Portfolio", tagline: "", email: "", about: "" }, projects: [] };
    if (!tag) return fallback;
    try {
      var parsed = JSON.parse(tag.textContent);
      parsed.site = parsed.site || fallback.site;
      parsed.projects = Array.isArray(parsed.projects) ? parsed.projects : [];
      return parsed;
    } catch (e) {
      console.error("Couldn't parse site data:", e);
      return fallback;
    }
  }

  function sortedProjects() {
    return DATA.projects.slice().sort(function (a, b) {
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
    if (els.contactLink && DATA.site.email) {
      els.contactLink.href = "mailto:" + DATA.site.email;
    }
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
      attachVideoHoverPlay(wrap, video);

      var hint = document.createElement("div");
      hint.className = "play-hint";
      hint.innerHTML = '<svg viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10"></polygon></svg>';
      wrap.appendChild(hint);
    } else {
      var img = document.createElement("img");
      img.src = thumb.src;
      img.alt = project.title || "";
      img.loading = "lazy";
      wrap.appendChild(img);
    }
    return wrap;
  }

  /* Videos play on hover for pointer devices, and autoplay briefly
     when scrolled into view on touch devices (no hover to rely on). */
  function attachVideoHoverPlay(wrap, video) {
    var canHover = window.matchMedia("(hover: hover)").matches;

    if (canHover) {
      wrap.addEventListener("mouseenter", function () {
        wrap.classList.add("is-playing");
        video.currentTime = 0;
        video.play().catch(function () {});
      });
      wrap.addEventListener("mouseleave", function () {
        wrap.classList.remove("is-playing");
        video.pause();
      });
    } else if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              wrap.classList.add("is-playing");
              video.play().catch(function () {});
            } else {
              wrap.classList.remove("is-playing");
              video.pause();
            }
          });
        },
        { threshold: 0.6 }
      );
      io.observe(wrap);
    }
  }

  /* ---------- home ---------- */

  function renderHome() {
    var projects = sortedProjects();

    els.list.innerHTML = "";
    els.pile.innerHTML = "";

    if (projects.length === 0) {
      els.empty.hidden = false;
      els.pile.hidden = true;
      return;
    }
    els.empty.hidden = true;

    // intro pile: first up to 5 projects with a usable thumbnail image
    var pileSource = projects.slice(0, 5);
    if (pileSource.length > 0) {
      els.pile.hidden = false;
      pileSource.forEach(function (project) {
        var item = document.createElement("div");
        item.className = "pile-item";
        var thumb = project.thumbnail;
        var src = thumb && thumb.type === "video" ? thumb.poster : thumb && thumb.src;
        var img = document.createElement("img");
        img.src = src || (thumb ? thumb.src : "");
        img.alt = "";
        item.appendChild(img);
        els.pile.appendChild(item);
      });
    } else {
      els.pile.hidden = true;
    }

    projects.forEach(function (project) {
      var row = document.createElement("a");
      row.className = "project-row";
      row.href = "#p/" + encodeURIComponent(project.id);

      var media = buildThumbMedia(project);
      if (media) row.appendChild(media);

      var caption = document.createElement("div");
      caption.className = "project-caption";

      var tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = project.tag || "";
      caption.appendChild(tag);

      var name = document.createElement("span");
      name.className = "name";
      name.textContent = project.title || "Untitled";
      caption.appendChild(name);

      row.appendChild(caption);
      els.list.appendChild(row);
    });

    setUpReveal();
  }

  function setUpReveal() {
    var rows = document.querySelectorAll(".project-row");
    if (rows.length === 0) return;

    var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !("IntersectionObserver" in window)) return;

    rows.forEach(function (row) {
      row.classList.add("reveal-ready");
    });

    var observer = new IntersectionObserver(
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
  }

  /* ---------- about ---------- */

  function renderAbout() {
    var site = DATA.site;
    els.aboutContent.innerHTML = "";

    var h1 = document.createElement("h1");
    h1.textContent = site.name || "About";
    els.aboutContent.appendChild(h1);

    var p = document.createElement("p");
    p.textContent = site.about || "";
    els.aboutContent.appendChild(p);

    if (site.email) {
      var contact = document.createElement("p");
      var a = document.createElement("a");
      a.className = "email-link";
      a.href = "mailto:" + site.email;
      a.textContent = site.email;
      contact.appendChild(a);
      els.aboutContent.appendChild(contact);
    }
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
    [project.tag, project.year, project.client].forEach(function (bit) {
      if (!bit) return;
      var span = document.createElement("span");
      span.textContent = bit;
      els.projectMeta.appendChild(span);
    });

    els.projectDescription.textContent = project.description || "";

    els.projectMedia.innerHTML = "";
    (project.media || []).forEach(function (item) {
      var figure = document.createElement("figure");
      var el;
      if (item.type === "video") {
        el = document.createElement("video");
        el.src = item.src;
        if (item.poster) el.poster = item.poster;
        el.controls = true;
        el.playsInline = true;
        el.preload = "metadata";
      } else {
        el = document.createElement("img");
        el.src = item.src;
        el.alt = item.caption || project.title || "";
        el.loading = "lazy";
      }
      figure.appendChild(el);
      if (item.caption) {
        var figcaption = document.createElement("figcaption");
        figcaption.textContent = item.caption;
        figure.appendChild(figcaption);
      }
      els.projectMedia.appendChild(figure);
    });

    return true;
  }

  /* ---------- router ---------- */

  function showView(name) {
    els.home.hidden = name !== "home";
    els.about.hidden = name !== "about";
    els.project.hidden = name !== "project";
    window.scrollTo(0, 0);
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
  window.addEventListener("hashchange", route);
  route();
})();
