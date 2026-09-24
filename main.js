/*
  Outlaw Pizza — main.js
  Phone-order pickup shop, no online ordering anywhere live: there is
  intentionally no contact form and no backend here. Every "order" action
  is a tel: click-to-call link. Do not add a "Send Message" form later.
*/

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------- Mobile nav toggle --------------------------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("main-nav");
    if (!toggle || !nav) return;

    var backdrop = document.createElement("div");
    backdrop.className = "nav-backdrop";
    document.body.appendChild(backdrop);

    function openNav() {
      nav.classList.add("is-open");
      backdrop.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      var firstLink = nav.querySelector("a");
      if (firstLink) firstLink.focus();
    }

    function closeNav() {
      nav.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }

    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.contains("is-open");
      if (isOpen) {
        closeNav();
      } else {
        openNav();
      }
    });

    backdrop.addEventListener("click", closeNav);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        closeNav();
        toggle.focus();
      }
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) closeNav();
    });
  }

  /* ------------------------------ Smooth scroll ------------------------------ */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function (e) {
        var id = link.getAttribute("href").slice(1);
        if (!id) return;
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      });
    });
  }

  /* --------------------------- Scroll reveal (IO) ----------------------------- */
  function initReveal() {
    var targets = document.querySelectorAll(".reveal");
    if (!targets.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    targets.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ------------------------------- Hero scrub --------------------------------- */
  function initHero() {
    var hero = document.getElementById("hero");
    if (!hero) return;

    var canvas = document.getElementById("hero-canvas");
    var video = document.getElementById("hero-video");
    var staticImg = document.getElementById("hero-static");
    var scrollCue = hero.querySelector(".hero-scroll-cue");

    var frameCount = parseInt(hero.dataset.frameCount, 10) || 0;
    var framePath = hero.dataset.framePath || "";

    if (prefersReducedMotion) {
      hero.classList.add("is-static");
      return;
    }

    var isMobile = window.matchMedia("(max-width: 860px)").matches;

    if (isMobile) {
      initMobileVideo();
    } else {
      initDesktopScrub();
    }

    /* --- Mobile: play the trimmed clip once when the hero scrolls into view --- */
    function initMobileVideo() {
      if (!video) return;

      video.addEventListener("playing", function () {
        video.classList.add("is-active");
        if (staticImg) staticImg.style.opacity = "0";
      });

      var played = false;
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && !played) {
              played = true;
              video.preload = "auto";
              video.play().catch(function () {
                /* autoplay blocked — static poster remains visible */
              });
              io.disconnect();
            }
          });
        },
        { threshold: 0.4 }
      );
      io.observe(hero);
    }

    /* --- Desktop/tablet: scrub a preloaded frame sequence on scroll position --- */
    function initDesktopScrub() {
      if (!canvas || !frameCount || !framePath) return;

      var ctx = canvas.getContext("2d");
      var images = new Array(frameCount);
      var loadedCount = 0;
      var ready = false;
      var currentFrame = 1;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);

      function sizeCanvas() {
        var rect = hero.getBoundingClientRect();
        canvas.width = hero.clientWidth * dpr;
        canvas.height = window.innerHeight * dpr;
      }

      function drawFrame(index) {
        var img = images[index - 1];
        if (!img || !img.complete || img.naturalWidth === 0) return;

        var cw = canvas.width;
        var ch = canvas.height;
        var iw = img.naturalWidth;
        var ih = img.naturalHeight;
        var scale = Math.max(cw / iw, ch / ih);
        var dw = iw * scale;
        var dh = ih * scale;
        var dx = (cw - dw) / 2;
        var dy = (ch - dh) / 2;

        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, dx, dy, dw, dh);
      }

      function nearestLoadedFrame(target) {
        if (images[target - 1] && images[target - 1].complete) return target;
        for (var offset = 1; offset < frameCount; offset++) {
          var down = target - offset;
          var up = target + offset;
          if (down >= 1 && images[down - 1] && images[down - 1].complete) return down;
          if (up <= frameCount && images[up - 1] && images[up - 1].complete) return up;
        }
        return null;
      }

      function pad3(n) {
        return String(n).padStart(3, "0");
      }

      function loadFrames() {
        for (var i = 1; i <= frameCount; i++) {
          (function (idx) {
            var img = new Image();
            img.decoding = "async";
            img.onload = function () {
              loadedCount++;
              if (idx === 1) {
                canvas.classList.add("is-active");
                if (staticImg) staticImg.style.opacity = "0";
                drawFrame(1);
                ready = true;
              } else if (ready) {
                drawFrame(currentFrame);
              }
            };
            img.src = framePath + "frame-" + pad3(idx) + ".jpg";
            images[idx - 1] = img;
          })(i);
        }
      }

      function updateFrameFromScroll() {
        var rect = hero.getBoundingClientRect();
        var scrollable = hero.offsetHeight - window.innerHeight;
        if (scrollable <= 0) return;

        var progress = -rect.top / scrollable;
        progress = Math.max(0, Math.min(1, progress));

        if (scrollCue) {
          scrollCue.style.opacity = progress > 0.03 ? "0" : "1";
        }

        var target = Math.round(progress * (frameCount - 1)) + 1;
        var frameToDraw = nearestLoadedFrame(target);
        if (frameToDraw) {
          currentFrame = frameToDraw;
          drawFrame(frameToDraw);
        }
      }

      var ticking = false;
      function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          updateFrameFromScroll();
          ticking = false;
        });
      }

      sizeCanvas();
      loadFrames();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener(
        "resize",
        function () {
          sizeCanvas();
          drawFrame(currentFrame);
        },
        { passive: true }
      );
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initSmoothScroll();
    initReveal();
    initHero();
  });
})();
