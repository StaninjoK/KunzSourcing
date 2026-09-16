// Static checks for the site (no dependencies). Exit code 1 on any failure.
//  - every internal link, image and asset reference resolves to a file
//  - every page has title, description, canonical, viewport and (index/wool) Open Graph tags
//  - every <img> has alt, width and height; lazy images are not the hero
//  - no leftover placeholders, no prices/MOQs slipped into public copy
//  - sitemap entries exist as files; redirect stubs point to existing pages
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const warn = [];

async function listHtml(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "scripts") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listHtml(full)));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[2] ?? m[3] ?? m[4]) : null;
}

const pages = await listHtml(root);
const publicPages = pages.filter((p) => !path.basename(p).startsWith("_"));

for (const file of publicPages) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const html = await readFile(file, "utf8");
  const dir = path.dirname(file);
  const isRedirect = /http-equiv="refresh"/i.test(html) || rel === "404.html";

  // --- head checks
  if (!/<title>[^<]{5,}<\/title>/i.test(html)) problems.push(`${rel}: missing <title>`);
  if (!/<meta name="viewport"/i.test(html)) problems.push(`${rel}: missing viewport meta`);
  if (!/<html lang="/i.test(html)) problems.push(`${rel}: missing lang attribute`);
  if (!isRedirect) {
    if (!/<meta name="description" content="[^"]{40,}"/i.test(html)) problems.push(`${rel}: missing/short meta description`);
    if (!/<link rel="canonical"/i.test(html)) problems.push(`${rel}: missing canonical`);
  }
  if (["index.html", "wool.html"].includes(rel)) {
    for (const tag of ["og:title", "og:description", "og:image", "og:url", "twitter:card"]) {
      if (!html.includes(`property="${tag}"`) && !html.includes(`name="${tag}"`)) problems.push(`${rel}: missing ${tag}`);
    }
  }

  // --- placeholders / forbidden public content
  if (/lorem ipsum|TODO|TBD|\[insert/i.test(html)) problems.push(`${rel}: placeholder text found`);
  if (!isRedirect && /(USD|EUR|€|\$)\s?\d/.test(html)) problems.push(`${rel}: a price-like value is present in public copy`);
  if (!isRedirect && /minimum order quantity[^.]*\d+\s?(t|kg|tonnes)/i.test(html)) problems.push(`${rel}: an MOQ figure is present in public copy`);

  // --- links and assets
  const refs = [];
  for (const m of html.matchAll(/<(a|link|script|img|source)\b[^>]*>/gi)) {
    const tag = m[0];
    for (const name of ["href", "src", "srcset"]) {
      const v = attr(tag, name);
      if (!v) continue;
      if (name === "srcset") v.split(",").forEach((part) => refs.push(part.trim().split(/\s+/)[0]));
      else refs.push(v);
    }
  }
  for (const ref of refs) {
    if (!ref || /^(https?:|mailto:|tel:|data:|#|javascript:)/i.test(ref)) continue;
    const clean = ref.split("#")[0].split("?")[0];
    if (!clean) continue;
    const target = clean.startsWith("/") ? path.join(root, clean) : path.join(dir, clean);
    if (!(await exists(target))) problems.push(`${rel}: broken reference "${ref}"`);
  }

  // --- in-page anchors
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/href="#([^"]+)"/g)) {
    if (!ids.has(m[1])) problems.push(`${rel}: anchor #${m[1]} has no target`);
  }
  for (const m of html.matchAll(/href="([a-z0-9.-]+\.html)(?:\?[^"#]*)?#([^"]+)"/gi)) {
    const otherFile = path.join(dir, m[1]);
    if (await exists(otherFile)) {
      const other = await readFile(otherFile, "utf8");
      if (!new RegExp(`\\sid="${m[2]}"`).test(other)) problems.push(`${rel}: anchor ${m[1]}#${m[2]} has no target`);
    }
  }

  // --- images
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    if (attr(tag, "alt") === null) problems.push(`${rel}: <img> without alt: ${tag.slice(0, 80)}`);
    if (!attr(tag, "width") || !attr(tag, "height")) problems.push(`${rel}: <img> without width/height: ${tag.slice(0, 80)}`);
  }
  const lazyHero = /fetchpriority="high"[^>]*loading="lazy"|loading="lazy"[^>]*fetchpriority="high"/.test(html);
  if (lazyHero) problems.push(`${rel}: hero image must not be lazy`);

  // --- rough tag balance for the main structural elements
  for (const t of ["section", "header", "footer", "main", "nav", "form", "picture", "figure", "table", "ul", "ol", "dl"]) {
    const open = (html.match(new RegExp(`<${t}\\b`, "gi")) || []).length;
    const close = (html.match(new RegExp(`</${t}>`, "gi")) || []).length;
    if (open !== close) problems.push(`${rel}: unbalanced <${t}> (${open} open / ${close} close)`);
  }
  const divOpen = (html.match(/<div\b/gi) || []).length;
  const divClose = (html.match(/<\/div>/gi) || []).length;
  if (divOpen !== divClose) problems.push(`${rel}: unbalanced <div> (${divOpen} open / ${divClose} close)`);
}

// --- sitemap
const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
for (const m of sitemap.matchAll(/<loc>https:\/\/kunzsourcing\.com\/([^<]*)<\/loc>/g)) {
  const f = m[1] || "index.html";
  if (!(await exists(path.join(root, f)))) problems.push(`sitemap.xml: ${f} does not exist`);
}
if (!(await exists(path.join(root, "CNAME")))) problems.push("CNAME is missing (custom domain would be lost)");
if (!(await exists(path.join(root, "assets", "img", "og-image.jpg")))) warn.push("assets/img/og-image.jpg missing");

console.log(`checked ${publicPages.length} pages`);
for (const w of warn) console.log("warning: " + w);
if (problems.length) {
  for (const p of problems) console.error("FAIL " + p);
  process.exit(1);
}
console.log("all checks passed");
