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
    aboutContent: document.getElementById("about-content"),
    projectTitle: document.getElementById("project-title"),
    projectMeta: document.getElementById("project-meta"),
    projectDescription: document.getElementById("project-description"),
    projectMedia: document.getElementById("project-media"),
    navCenter: document.querySelector(".nav-center"),
    contactToggle: document.getElementById("contact-toggle"),
    contactMenu: document.getElementById("contact-menu"),
    contactEmailLink: document.getElementById("contact-email-link"),
    contactLinkedinLink: document.getElementById("contact-linkedin-link"),
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
    setUpContactMenu();
  }

  /* ---------- contact dropdown ---------- */

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

    function open() {
      menu.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      document.addEventListener("click", onOutsideClick);
      document.addEventListener("keydown", onKeydown);
    }
    function close() {
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      document.removeEventListener("click", onOutsideClick);
      document.removeEventListener("keydown", onKeydown);
    }
    function onOutsideClick(e) {
      if (!menu.contains(e.target) && e.target !== toggle) close();
    }
    function onKeydown(e) {
      if (e.key === "Escape") { close(); toggle.focus(); }
    }

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menu.hidden) open(); else close();
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

    if (projects.length === 0) {
      els.empty.hidden = false;
      return;
    }
    els.empty.hidden = true;

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
    els.aboutContent.appendChild(photoWrap);

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
    if (els.contactMenu && !els.contactMenu.hidden) {
      els.contactMenu.hidden = true;
      els.contactToggle.setAttribute("aria-expanded", "false");
    }
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
