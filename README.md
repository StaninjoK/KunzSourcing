# Kunz Sourcing — website

Static website for **kunzsourcing.com**, hosted on GitHub Pages (branch `main`, root). No framework, no build step, no runtime dependencies.

## Structure

| Path | Purpose |
| --- | --- |
| `index.html` | Home: hero, Uruguay as origin, what we source (wool + beef), process, presence, documentation, Kunz Global, general sourcing request |
| `sourcing.html` | What we source: product-area panels, side-by-side comparison, further categories |
| `wool.html` | Wool & natural fibres: at a glance, product forms, fineness, processing, certificate data, shipping timeline, pricing factors, wool request form |
| `beef.html` | Beef: at a glance, current programme note, cut catalogue (five cut groups plus packing and standard), Uruguay as beef origin, quality & documentation, process, logistics, pricing factors, beef request form (`?type=` and `?cuts=` prefill it) |
| `legal-notice.html`, `terms.html`, `privacy.html` | Legal pages (English) |
| `404.html` | GitHub Pages error page |
| `grosshandel-wolle.html`, `handfearbereien.html`, `grosshandel-fleisch.html`, `impressum.html`, `agb.html`, `datenschutz.html` | Redirect stubs for the URLs of the previous site |
| `assets/css/site.css` | Design system and all styles |
| `assets/js/site.js` | Header state, mobile menu, scroll reveal, sourcing-request form |
| `assets/img/` | Optimised photos (WebP + JPEG, several widths), logo, OG image |
| `scripts/` | `serve.mjs` (local preview), `check.mjs` (link/meta/image checks), `build-images.mjs` (regenerates `assets/img` from the originals) |
| `CNAME` | Custom domain for GitHub Pages — do not delete |

## Languages

English is the source language (pages in the repository root). German, Spanish and Polish pages live in `de/`, `es/` and `pl/` and are **generated** — do not edit them by hand.

1. Edit the English page.
2. `node scripts/build-i18n.mjs --extract` writes all English text segments to `i18n/_segments.json`.
3. Add or update the translations in `i18n/de.json`, `i18n/es.json`, `i18n/pl.json` (key = English text).
4. `node scripts/build-i18n.mjs` regenerates the three language folders, the hreflang links, the language switcher, the footer language list and `sitemap.xml`.
5. `node scripts/build-i18n.mjs --check` fails if a translation is missing or a generated file is stale.

Form option values stay in English on purpose (they end up in the request e-mail and in `?product=` links). UI texts created by JavaScript (form messages, menu labels, language hint) are in `assets/js/site.js`.

The old German URLs (`grosshandel-wolle`, `handfearbereien`, `grosshandel-fleisch`, `impressum`, `agb`, `datenschutz`) redirect to the matching pages in `de/`.

## Local preview and checks

```bash
node scripts/serve.mjs        # http://127.0.0.1:8090
node scripts/check.mjs        # exits 1 on broken links, missing meta or images without size
```

## Regenerating images

The original photos are not in the repository. `scripts/build-images.mjs` reads them from the folder `Kunz Sourcing` two levels above this repo (override with `KS_SRC`) and needs the `sharp` package (`SHARP_PATH` may point to an existing installation).

The beef catalogue photos (`cut-*`) are product shots taken from the plant's specification sheets. Only neutral product photos are used; labels, cartons with print and plant logos are left out or blurred (`cut-carton`). `node scripts/build-images.mjs --only cuts` rebuilds just these.

## Sourcing request form

`assets/js/site.js` opens the visitor's e-mail client with the request prefilled (no server needed). To send requests through a form endpoint instead (for example a Google Apps Script web app that answers `{"ok":true}`), set `data-endpoint="…"` on the `<form id="sourcing-request">` in `index.html`.

## Content rules

- No prices and no minimum order quantities in public copy (`scripts/check.mjs` fails on price-like values).
- Only facts confirmed by suppliers or documents: fineness range, bale weight, container loads, lead time, delivery terms, certificates.
- Suppliers are not named publicly.
