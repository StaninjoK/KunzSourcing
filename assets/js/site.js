/* Kunz Sourcing — site.js (no dependencies) */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  /* ----- Header state ----- */
  var header = document.querySelector(".site-header");
  var onScroll = function () {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ----- Mobile navigation ----- */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  var setMenu = function (open) {
    if (!toggle || !nav) return;
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setMenu(!document.body.classList.contains("menu-open"));
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        setMenu(false);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
    window.matchMedia("(min-width: 1061px)").addEventListener("change", function (e) {
      if (e.matches) setMenu(false);
    });
  }

  /* ----- Scroll reveal ----- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) {
      el.classList.add("is-in");
    });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -4% 0px", threshold: 0.01 }
    );
    targets.forEach(function (el) {
      io.observe(el);
    });
    // Safety net: if an observer callback is delayed (throttled tab, odd browsers),
    // reveal anything that is already inside the viewport on scroll/resize.
    var pending = Array.prototype.slice.call(targets);
    var ticking = false;
    var sweep = function () {
      ticking = false;
      var limit = window.innerHeight * 0.96;
      pending = pending.filter(function (el) {
        if (el.classList.contains("is-in")) return false;
        var r = el.getBoundingClientRect();
        if (r.top < limit && r.bottom > 0) {
          el.classList.add("is-in");
          io.unobserve(el);
          return false;
        }
        return true;
      });
      if (!pending.length) {
        window.removeEventListener("scroll", onSweep);
        window.removeEventListener("resize", onSweep);
      }
    };
    var onSweep = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(sweep);
    };
    window.addEventListener("scroll", onSweep, { passive: true });
    window.addEventListener("resize", onSweep);
    window.setTimeout(sweep, 600);
  }

  /* ----- Sub-navigation scroll spy (product pages) ----- */
  var subnav = document.querySelector(".subnav");
  if (subnav) {
    var spyLinks = Array.prototype.slice.call(subnav.querySelectorAll('a[href^="#"]'));
    var spySections = spyLinks.map(function (a) {
      return document.getElementById(a.getAttribute("href").slice(1));
    });
    var spy = function () {
      var offset = (header ? header.offsetHeight : 0) + subnav.offsetHeight + 32;
      var current = -1;
      spySections.forEach(function (s, i) {
        if (s && s.getBoundingClientRect().top <= offset) current = i;
      });
      spyLinks.forEach(function (a, i) {
        a.classList.toggle("is-active", i === current);
      });
    };
    spy();
    window.addEventListener("scroll", spy, { passive: true });
  }

  /* ----- Sourcing request forms (one per page, marked with data-request) ----- */
  // Optional: data-endpoint may point to a POST endpoint (e.g. a Google Apps Script web app)
  // that accepts application/x-www-form-urlencoded and answers {"ok":true}. Without it the
  // form opens the visitor's e-mail client with the request prefilled (no server involved).
  Array.prototype.forEach.call(document.querySelectorAll("form[data-request]"), function (form) {
    var ENDPOINT = form.getAttribute("data-endpoint") || "";
    var TO = form.getAttribute("data-mailto") || "Stanley@kunzsourcing.com";
    var KIND = form.getAttribute("data-request") || "Sourcing request";
    var feedback = form.querySelector(".form__feedback");
    var button = form.querySelector('button[type="submit"]');
    var stamp = form.elements.namedItem("t");
    var setStamp = function () {
      if (stamp) stamp.value = String(Date.now());
    };
    setStamp();

    // Pre-select options from the query string, e.g. ?product=Scoured%20wool
    new URLSearchParams(location.search).forEach(function (v, k) {
      var el = form.elements.namedItem(k);
      if (!el || el.tagName !== "SELECT") return;
      var ok = Array.prototype.some.call(el.options, function (o) {
        return o.value === v;
      });
      if (ok) el.value = v;
    });

    var say = function (text, state) {
      if (!feedback) return;
      feedback.textContent = text;
      if (state) feedback.setAttribute("data-state", state);
      else feedback.removeAttribute("data-state");
    };
    var value = function (name) {
      var el = form.elements.namedItem(name);
      return el && el.value ? String(el.value).trim() : "";
    };
    var labelOf = function (el) {
      var l = el.id ? form.querySelector('label[for="' + el.id + '"]') : null;
      var text = l ? l.textContent : el.name;
      return text.replace(/\(optional\)/i, "").replace(/\s+/g, " ").trim();
    };
    var buildMail = function () {
      var lines = [KIND + " via kunzsourcing.com", ""];
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.type === "submit" || el.type === "hidden" || el.type === "checkbox") return;
        if (el.name === "website") return;
        lines.push(labelOf(el) + ": " + (String(el.value || "").trim() || "-"));
      });
      var subject = KIND;
      if (value("product")) subject += " – " + value("product");
      if (value("company")) subject += " – " + value("company");
      return "mailto:" + TO + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var honey = form.elements.namedItem("website");
      if (honey && honey.value) return; // bot

      if (!ENDPOINT) {
        window.location.href = buildMail();
        say(
          "Your e-mail client should open with the request prefilled. If it does not, write to " +
            TO +
            " with the same details.",
          "ok"
        );
        return;
      }

      var label = button.innerHTML;
      button.disabled = true;
      button.textContent = "Sending …";
      say("", "");
      fetch(ENDPOINT, { method: "POST", body: new URLSearchParams(new FormData(form)) })
        .then(function (r) {
          return r.json().catch(function () {
            return { ok: false };
          });
        })
        .then(function (res) {
          if (!res.ok) throw new Error(res.error || "unknown");
          form.reset();
          setStamp();
          say("Thank you. Your request has been received; we reply within one working day.", "ok");
        })
        .catch(function () {
          say("The request could not be sent. Please e-mail " + TO + " directly.", "error");
        })
        .finally(function () {
          button.innerHTML = label;
          button.disabled = false;
        });
    });
  });
})();
