/* Kunz Sourcing — site.js (no dependencies) */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  /* ----- Language ----- */
  var LANG = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  var STRINGS = {
    en: {
      openMenu: "Open menu",
      closeMenu: "Close menu",
      sending: "Sending …",
      mailOk: function (to) {
        return "Your e-mail client should open with the request prefilled. If it does not, write to " + to + " with the same details.";
      },
      sent: "Thank you. Your request has been received; we reply within one working day.",
      failed: function (to) {
        return "The request could not be sent. Please e-mail " + to + " directly.";
      },
    },
    de: {
      openMenu: "Menü öffnen",
      closeMenu: "Menü schließen",
      sending: "Wird gesendet …",
      mailOk: function (to) {
        return "Ihr E-Mail-Programm sollte sich mit der vorausgefüllten Anfrage öffnen. Falls nicht, schreiben Sie bitte mit denselben Angaben an " + to + ".";
      },
      sent: "Vielen Dank. Ihre Anfrage ist eingegangen; wir antworten innerhalb eines Werktags.",
      failed: function (to) {
        return "Die Anfrage konnte nicht gesendet werden. Bitte schreiben Sie direkt an " + to + ".";
      },
      hint: "Diese Seite gibt es auch auf Deutsch.",
      hintCta: "Auf Deutsch lesen",
      hintClose: "Schließen",
    },
    es: {
      openMenu: "Abrir menú",
      closeMenu: "Cerrar menú",
      sending: "Enviando …",
      mailOk: function (to) {
        return "Su programa de correo debería abrirse con la solicitud completada. Si no ocurre, escriba a " + to + " con los mismos datos.";
      },
      sent: "Gracias. Hemos recibido su solicitud y respondemos en un día hábil.",
      failed: function (to) {
        return "No se pudo enviar la solicitud. Escriba directamente a " + to + ".";
      },
      hint: "Esta página también está disponible en español.",
      hintCta: "Leer en español",
      hintClose: "Cerrar",
    },
    pl: {
      openMenu: "Otwórz menu",
      closeMenu: "Zamknij menu",
      sending: "Wysyłanie …",
      mailOk: function (to) {
        return "Program pocztowy powinien otworzyć się z wypełnionym zapytaniem. Jeśli tak się nie stanie, prosimy napisać na adres " + to + ", podając te same dane.";
      },
      sent: "Dziękujemy. Zapytanie zostało przyjęte; odpowiadamy w ciągu jednego dnia roboczego.",
      failed: function (to) {
        return "Nie udało się wysłać zapytania. Prosimy napisać bezpośrednio na adres " + to + ".";
      },
      hint: "Ta strona jest dostępna również po polsku.",
      hintCta: "Czytaj po polsku",
      hintClose: "Zamknij",
    },
  };
  var t = STRINGS[LANG] || STRINGS.en;
  var store = {
    get: function (k) {
      try {
        return window.localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    set: function (k, v) {
      try {
        window.localStorage.setItem(k, v);
      } catch (e) {
        /* storage unavailable */
      }
    },
  };

  /* ----- Language switcher ----- */
  var switchers = document.querySelectorAll("[data-lang-switch]");
  Array.prototype.forEach.call(switchers, function (d) {
    d.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a[data-lang]") : null;
      if (a) store.set("ks_lang_pref", a.getAttribute("data-lang"));
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll(".footer__langs a[data-lang]"), function (a) {
    a.addEventListener("click", function () {
      store.set("ks_lang_pref", a.getAttribute("data-lang"));
    });
  });
  document.addEventListener("click", function (e) {
    Array.prototype.forEach.call(switchers, function (d) {
      if (d.open && !d.contains(e.target)) d.open = false;
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    Array.prototype.forEach.call(switchers, function (d) {
      if (d.open) {
        d.open = false;
        var s = d.querySelector("summary");
        if (s) s.focus();
      }
    });
  });

  /* ----- Suggest the visitor's language on English pages ----- */
  if (LANG === "en" && switchers.length && !store.get("ks_lang_hint")) {
    var pref = store.get("ks_lang_pref");
    if (!pref) {
      var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
      for (var i = 0; i < list.length; i++) {
        var c = String(list[i] || "").slice(0, 2).toLowerCase();
        if (STRINGS[c]) {
          pref = c;
          break;
        }
      }
    }
    var target = pref && pref !== "en" && STRINGS[pref] ? switchers[0].querySelector('a[data-lang="' + pref + '"]') : null;
    if (target) {
      var s = STRINGS[pref];
      var hint = document.createElement("div");
      hint.className = "lang-hint";
      hint.setAttribute("role", "region");
      hint.setAttribute("aria-label", s.hint);
      hint.setAttribute("lang", pref);
      hint.innerHTML =
        '<p></p><a class="lang-hint__cta"></a><button type="button" class="lang-hint__close"><span aria-hidden="true">×</span></button>';
      hint.querySelector("p").textContent = s.hint;
      var cta = hint.querySelector("a");
      cta.textContent = s.hintCta;
      cta.href = target.getAttribute("href");
      cta.addEventListener("click", function () {
        store.set("ks_lang_pref", pref);
      });
      var close = hint.querySelector("button");
      close.setAttribute("aria-label", s.hintClose);
      close.addEventListener("click", function () {
        store.set("ks_lang_hint", "1");
        hint.classList.remove("is-in");
        window.setTimeout(function () {
          hint.remove();
        }, 400);
      });
      document.body.appendChild(hint);
      window.setTimeout(function () {
        hint.classList.add("is-in");
      }, 900);
    }
  }

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
    toggle.setAttribute("aria-label", open ? t.closeMenu : t.openMenu);
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
    window.matchMedia("(min-width: 1181px)").addEventListener("change", function (e) {
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

    // Pre-select options from the query string, e.g. ?product=Scoured%20wool;
    // plain text fields (e.g. ?cuts=Striploin) are filled only while still empty.
    new URLSearchParams(location.search).forEach(function (v, k) {
      var el = form.elements.namedItem(k);
      if (el && el.tagName === "INPUT" && el.type === "text" && !el.value) {
        el.value = v.slice(0, 200);
        return;
      }
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
      var lines = [KIND + " via kunzsourcing.com (" + LANG.toUpperCase() + ")", ""];
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
        say(t.mailOk(TO), "ok");
        return;
      }

      var label = button.innerHTML;
      button.disabled = true;
      button.textContent = t.sending;
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
          say(t.sent, "ok");
        })
        .catch(function () {
          say(t.failed(TO), "error");
        })
        .finally(function () {
          button.innerHTML = label;
          button.disabled = false;
        });
    });
  });
})();
