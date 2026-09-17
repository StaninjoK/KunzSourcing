// Builds the German, Spanish and Polish versions of the site from the English pages.
//
// English pages in the repository root are the source of truth. Every visible text
// segment and a small set of attributes are looked up in i18n/<lang>.json (key = the
// English text with whitespace collapsed) and written to <lang>/<page>.
//
// The script also maintains three generated regions in every page, including the
// English sources: hreflang links, the language switcher and the footer language list.
//
// Usage:
//   node scripts/build-i18n.mjs            build everything (writes files)
//   node scripts/build-i18n.mjs --extract  write i18n/_segments.json (all English segments)
//   node scripts/build-i18n.mjs --check    exit 1 if a translation is missing or output is stale
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://kunzsourcing.com/";
const MODE = process.argv.includes("--extract") ? "extract" : process.argv.includes("--check") ? "check" : "build";

export const LANGS = [
  { code: "en", name: "English", locale: "en_GB" },
  { code: "de", name: "Deutsch", locale: "de_DE" },
  { code: "es", name: "Español", locale: "es_ES" },
  { code: "pl", name: "Polski", locale: "pl_PL" },
];
const PAGES = ["index.html", "sourcing.html", "wool.html", "beef.html", "legal-notice.html", "terms.html", "privacy.html"];
const SITEMAP_PAGES = ["index.html", "sourcing.html", "wool.html", "beef.html"];

const UI = {
  en: { choose: "Choose language", languages: "Languages" },
  de: { choose: "Sprache wählen", languages: "Sprachen" },
  es: { choose: "Elegir idioma", languages: "Idiomas" },
  pl: { choose: "Wybierz język", languages: "Języki" },
};

// Text that is identical in every language (brand names, contact data).
const KEEP = new Set([
  "Kunz",
  "Sourcing",
  "Kunz Sourcing",
  "Kunz Global",
  "Kunz Agrotech",
  "Kunz Akquise",
  "by Kunz Global · Uruguay",
  "µm",
  "Instagram",
  "Facebook",
  "Stanley Kunz",
  "Stanley Kunz Pazer",
  "+49 6344 9269681",
  "@kunzsourcing",
]);
const isKeep = (s) =>
  KEEP.has(s) ||
  /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(s) ||
  /^(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z]{2,})+(\/\S*)?$/i.test(s);

const TRANSLATED_ATTRS = ["alt", "placeholder", "aria-label", "title"];
const TRANSLATED_META = ["description", "og:title", "og:description", "twitter:title", "twitter:description"];

const TOKEN = /<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<[^>]+>|[^<]+/gi;

const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const encodeText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const encodeAttr = (s) => encodeText(s).replace(/"/g, "&quot;");
const norm = (s) => decode(s).replace(/\s+/g, " ").trim();
const hasLetters = (s) => /\p{L}/u.test(s);

// ---------- URLs ----------
const pageUrl = (page, lang) => SITE + (lang === "en" ? "" : lang + "/") + (page === "index.html" ? "" : page);
function relHref(page, from, to) {
  const up = from === "en" ? "" : "../";
  const dir = to === "en" ? "" : to + "/";
  const href = up + dir + (page === "index.html" ? "" : page);
  return href === "" ? "./" : href;
}
function localizeUrl(url, lang) {
  if (lang === "en" || !url) return url;
  if (/^([a-z][a-z0-9+.-]*:|#|\/|\.\.\/)/i.test(url)) return url;
  const file = url.split(/[?#]/)[0];
  if (!file || PAGES.includes(file)) return url;
  return "../" + url;
}

// ---------- generated regions ----------
const GLOBE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>';
const CHEVRON =
  '<svg class="lang__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

function hreflangBlock(page, lang, withOg) {
  const lines = LANGS.map((l) => `  <link rel="alternate" hreflang="${l.code}" href="${pageUrl(page, l.code)}">`);
  lines.push(`  <link rel="alternate" hreflang="x-default" href="${pageUrl(page, "en")}">`);
  if (withOg) {
    for (const l of LANGS) if (l.code !== lang) lines.push(`  <meta property="og:locale:alternate" content="${l.locale}">`);
  }
  return "<!--hreflang:start-->\n" + lines.join("\n") + "\n  <!--hreflang:end-->";
}
function switcherBlock(page, lang) {
  const items = LANGS.map(
    (l) =>
      `<li><a href="${relHref(page, lang, l.code)}" hreflang="${l.code}" lang="${l.code}" data-lang="${l.code}"${
        l.code === lang ? ' aria-current="true"' : ""
      }><span class="lang__code">${l.code.toUpperCase()}</span>${l.name}</a></li>`
  ).join("");
  return (
    `<!--lang:start--><details class="lang" data-lang-switch><summary class="lang__current" aria-label="${UI[lang].choose}">` +
    `${GLOBE}<span>${lang.toUpperCase()}</span>${CHEVRON}</summary><ul class="lang__list">${items}</ul></details><!--lang:end-->`
  );
}
function footerBlock(page, lang) {
  const links = LANGS.map(
    (l) =>
      `<a href="${relHref(page, lang, l.code)}" hreflang="${l.code}" lang="${l.code}" data-lang="${l.code}"${
        l.code === lang ? ' aria-current="true"' : ""
      }>${l.name}</a>`
  ).join("");
  return `<!--langfoot:start--><nav class="footer__langs" aria-label="${UI[lang].languages}">${links}</nav><!--langfoot:end-->`;
}

function ensureMarkers(html, page) {
  let out = html;
  if (!out.includes("<!--hreflang:start-->")) {
    out = out.replace(/(<link rel="canonical"[^>]*>)/, `$1\n  <!--hreflang:start--><!--hreflang:end-->`);
  }
  if (!out.includes("<!--lang:start-->")) {
    out = out.replace(/(\s*)(<button class="menu-toggle")/, `$1<!--lang:start--><!--lang:end-->$1$2`);
  }
  if (!out.includes("<!--langfoot:start-->")) {
    out = out.replace(/(\s*)(<div class="footer__bottom")/, `$1<!--langfoot:start--><!--langfoot:end-->$1$2`);
  }
  for (const m of ["hreflang", "lang", "langfoot"]) {
    if (!out.includes(`<!--${m}:start-->`)) throw new Error(`${page}: could not place ${m} marker`);
  }
  return out;
}
function fillRegions(html, page, lang) {
  const withOg = html.includes('property="og:locale"');
  return html
    .replace(/<!--hreflang:start-->[\s\S]*?<!--hreflang:end-->/, () => hreflangBlock(page, lang, withOg))
    .replace(/<!--lang:start-->[\s\S]*?<!--lang:end-->/, () => switcherBlock(page, lang))
    .replace(/<!--langfoot:start-->[\s\S]*?<!--langfoot:end-->/, () => footerBlock(page, lang));
}

// ---------- translation ----------
function makeLookup(lang, dict, missing, seen) {
  return (raw, where) => {
    const core = norm(raw);
    if (!core || !hasLetters(core) || isKeep(core)) return null;
    if (seen) {
      if (!seen.has(core)) seen.set(core, new Set());
      seen.get(core).add(where);
    }
    if (lang === "en") return null;
    const t = dict[core];
    if (typeof t !== "string" || !t.trim()) {
      missing.add(core);
      return null;
    }
    return t;
  };
}

function translateTag(tag, page, lang, lookup) {
  if (tag.startsWith("</") || tag.startsWith("<!")) return tag;
  const name = (tag.match(/^<([a-zA-Z0-9-]+)/) || [])[1]?.toLowerCase();
  let out = tag;

  if (name === "html") out = out.replace(/\slang="[^"]*"/, ` lang="${lang}"`);

  if (name === "link" && /rel="canonical"/.test(out)) {
    out = out.replace(/href="[^"]*"/, `href="${pageUrl(page, lang)}"`);
    return out;
  }
  if (name === "meta") {
    const key = (out.match(/\s(?:name|property)="([^"]+)"/) || [])[1];
    if (key === "og:url") return out.replace(/content="[^"]*"/, `content="${pageUrl(page, lang)}"`);
    if (key === "og:locale") {
      const loc = LANGS.find((l) => l.code === lang).locale;
      return out.replace(/content="[^"]*"/, `content="${loc}"`);
    }
    if (key && TRANSLATED_META.includes(key)) {
      return out.replace(/(\scontent=")([^"]*)(")/, (all, a, v, b) => {
        const t = lookup(v, `${page} meta ${key}`);
        return t == null ? all : a + encodeAttr(t) + b;
      });
    }
    return out;
  }

  for (const attr of TRANSLATED_ATTRS) {
    out = out.replace(new RegExp(`(\\s${attr}=")([^"]*)(")`), (all, a, v, b) => {
      const t = lookup(v, `${page} @${attr}`);
      return t == null ? all : a + encodeAttr(t) + b;
    });
  }

  if (lang !== "en") {
    out = out.replace(/(\s(?:href|src)=")([^"]*)(")/g, (all, a, v, b) => a + localizeUrl(v, lang) + b);
    out = out.replace(/(\ssrcset=")([^"]*)(")/g, (all, a, v, b) => {
      const parts = v.split(",").map((p) => {
        const [u, ...rest] = p.trim().split(/\s+/);
        return [localizeUrl(u, lang), ...rest].join(" ");
      });
      return a + parts.join(", ") + b;
    });
  }
  return out;
}

function translateDoc(html, page, lang, lookup) {
  let skip = 0;
  return html.replace(TOKEN, (tok) => {
    if (tok.startsWith("<!--")) {
      if (/:start-->$/.test(tok)) skip++;
      else if (/:end-->$/.test(tok)) skip = Math.max(0, skip - 1);
      return tok;
    }
    if (skip) return tok;
    if (/^<(script|style)\b/i.test(tok)) {
      // Keep inline content untouched, but localise an external script's src.
      return tok.replace(/^<script\b[^>]*>/i, (open) => (lang === "en" ? open : open.replace(/(\ssrc=")([^"]*)(")/, (a, b, v, c) => b + localizeUrl(v, lang) + c)));
    }
    if (tok[0] === "<") return translateTag(tok, page, lang, lookup);
    const m = tok.match(/^(\s*)([\s\S]*?)(\s*)$/);
    // Pure numbers (e.g. "83.60 %", "19.2 % / 11.5 %") use a decimal comma in de/es/pl.
    if (lang !== "en" && m[2] && !hasLetters(m[2]) && /^[\d.,\s%/–+−-]+$/.test(m[2])) {
      return m[1] + m[2].replace(/(\d)\.(\d)/g, "$1,$2") + m[3];
    }
    const t = lookup(m[2], page);
    return t == null ? tok : m[1] + encodeText(t) + m[3];
  });
}

function generatedHeader(page, lang) {
  return `<!-- Generated from ../${page} and i18n/${lang}.json by scripts/build-i18n.mjs. Edit the English page or the dictionary, then rebuild. -->\n`;
}

function sitemap() {
  const rows = [];
  for (const page of SITEMAP_PAGES) {
    for (const l of LANGS) {
      const alts = LANGS.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.code}" href="${pageUrl(page, a.code)}"/>`).join("\n");
      rows.push(
        `  <url>\n    <loc>${pageUrl(page, l.code)}</loc>\n    <lastmod>2026-09-17</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${
          page === "index.html" ? (l.code === "en" ? "1.0" : "0.9") : "0.8"
        }</priority>\n${alts}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(page, "en")}"/>\n  </url>`
      );
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows.join(
    "\n"
  )}\n</urlset>\n`;
}

// ---------- main ----------
const writes = new Map(); // path -> content
const missingByLang = new Map();
const seen = new Map();

const sources = {};
for (const page of PAGES) {
  const file = path.join(root, page);
  const src = ensureMarkers(await readFile(file, "utf8"), page);
  sources[page] = src;
  const enOut = fillRegions(src, page, "en");
  translateDoc(enOut, page, "en", makeLookup("en", {}, new Set(), seen));
  writes.set(file, enOut);
}

if (MODE === "extract") {
  const list = [...seen.entries()].map(([text, where]) => ({ text, pages: [...new Set([...where].map((w) => w.split(" ")[0]))] }));
  const out = path.join(root, "i18n", "_segments.json");
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(list, null, 2) + "\n");
  const chars = list.reduce((n, s) => n + s.text.length, 0);
  console.log(`${list.length} segments, ${chars} characters → ${path.relative(root, out)}`);
  process.exit(0);
}

for (const { code } of LANGS.filter((l) => l.code !== "en")) {
  const dictFile = path.join(root, "i18n", `${code}.json`);
  const dict = existsSync(dictFile) ? JSON.parse(await readFile(dictFile, "utf8")) : {};
  const missing = new Set();
  const lookup = makeLookup(code, dict, missing, null);
  for (const page of PAGES) {
    const filled = fillRegions(sources[page], page, code);
    const translated = translateDoc(filled, page, code, lookup);
    const withHeader = translated.replace(/^<!DOCTYPE html>\n/i, (d) => d + generatedHeader(page, code));
    writes.set(path.join(root, code, page), withHeader);
  }
  missingByLang.set(code, missing);
  const unused = Object.keys(dict).filter((k) => !seen.has(k));
  if (unused.length) console.log(`${code}: ${unused.length} unused dictionary entries`);
}
writes.set(path.join(root, "sitemap.xml"), sitemap());

let failed = false;
for (const [code, missing] of missingByLang) {
  if (missing.size) {
    failed = true;
    console.error(`${code}: ${missing.size} missing translations`);
    for (const m of [...missing].slice(0, 25)) console.error(`  - ${m.slice(0, 110)}`);
  }
}

if (MODE === "check") {
  const stale = [];
  for (const [file, content] of writes) {
    const current = existsSync(file) ? await readFile(file, "utf8") : null;
    if (current !== content) stale.push(path.relative(root, file));
  }
  if (stale.length) {
    failed = true;
    console.error(`stale or missing generated files (run node scripts/build-i18n.mjs): ${stale.join(", ")}`);
  }
  if (failed) process.exit(1);
  console.log("i18n up to date");
  process.exit(0);
}

let written = 0;
for (const [file, content] of writes) {
  const current = existsSync(file) ? await readFile(file, "utf8") : null;
  if (current === content) continue;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
  written++;
}
console.log(`i18n build: ${written} file(s) written`);
if (failed) process.exit(1);
