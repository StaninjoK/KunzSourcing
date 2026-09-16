# Kunz Sourcing — website

Static website for **kunzsourcing.com**, hosted on GitHub Pages (branch `main`, root). No framework, no build step, no runtime dependencies.

## Structure

| Path | Purpose |
| --- | --- |
| `index.html` | Home: hero, Uruguay as origin, categories, wool feature, process, presence, documentation, Kunz Global, sourcing request |
| `wool.html` | Wool & natural fibres: product forms, fineness, processing, certificate data, packaging & shipping |
| `legal-notice.html`, `terms.html`, `privacy.html` | Legal pages (English) |
| `404.html` | GitHub Pages error page |
| `grosshandel-wolle.html`, `handfearbereien.html`, `grosshandel-fleisch.html`, `impressum.html`, `agb.html`, `datenschutz.html` | Redirect stubs for the URLs of the previous site |
| `assets/css/site.css` | Design system and all styles |
| `assets/js/site.js` | Header state, mobile menu, scroll reveal, sourcing-request form |
| `assets/img/` | Optimised photos (WebP + JPEG, several widths), logo, OG image |
| `scripts/` | `serve.mjs` (local preview), `check.mjs` (link/meta/image checks), `build-images.mjs` (regenerates `assets/img` from the originals) |
| `CNAME` | Custom domain for GitHub Pages — do not delete |

## Local preview and checks

```bash
node scripts/serve.mjs        # http://127.0.0.1:8090
node scripts/check.mjs        # exits 1 on broken links, missing meta or images without size
```

## Regenerating images

The original photos are not in the repository. `scripts/build-images.mjs` reads them from the folder `Kunz Sourcing` two levels above this repo (override with `KS_SRC`) and needs the `sharp` package (`SHARP_PATH` may point to an existing installation).

## Sourcing request form

`assets/js/site.js` opens the visitor's e-mail client with the request prefilled (no server needed). To send requests through a form endpoint instead (for example a Google Apps Script web app that answers `{"ok":true}`), set `data-endpoint="…"` on the `<form id="sourcing-request">` in `index.html`.

## Content rules

- No prices and no minimum order quantities in public copy (`scripts/check.mjs` fails on price-like values).
- Only facts confirmed by suppliers or documents: fineness range, bale weight, container loads, lead time, delivery terms, certificates.
- Suppliers are not named publicly.
