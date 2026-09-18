// Generates the optimised images in assets/img from the original photos.
// The originals stay outside the repository (folder "Kunz Sourcing" two levels up).
//
// Usage:  node scripts/build-images.mjs
// Env:    KS_SRC      root folder that contains "Bilder von Tops Produktion" (default: ../..)
//         SHARP_PATH  path to a sharp installation, if "sharp" is not resolvable from this folder
//
// Output: assets/img/<name>-<width>.webp + .jpg and assets/img/manifest.json (final pixel sizes).

import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const outDir = path.join(repo, "assets", "img");
const srcRoot = path.resolve(process.env.KS_SRC || path.join(repo, "..", ".."));

function loadSharp() {
  const candidates = [process.env.SHARP_PATH, "sharp"].filter(Boolean);
  for (const c of candidates) {
    try {
      return require(c);
    } catch {
      /* try next */
    }
  }
  throw new Error("sharp not found. Set SHARP_PATH to a sharp installation or run `npm install sharp` once.");
}

const sharp = loadSharp();

const PROD = "Bilder von Tops Produktion/WhatsApp Image 2026-07-10 at ";
const BACKUP = "Webseite/KunzSourcing_Website_BACKUP_before_redesign_2026-09-16/live-github-main-2026-09-16/Images/";

// aspect = [w, h] crops the source; position follows sharp's gravity names.
const images = [
  { name: "warehouse-bales", src: PROD + "13.47.56 (1).jpeg", widths: [1600, 1200, 800, 480] },
  { name: "tops-cans", src: PROD + "13.47.52.jpeg", widths: [1600, 1200, 800, 480] },
  { name: "gill-slivers", src: PROD + "13.47.42.jpeg", widths: [1600, 1200, 800, 480] },
  { name: "scouring", src: PROD + "13.47.57.jpeg", widths: [1200, 800, 480] },
  { name: "scoured-dryer", src: PROD + "13.47.59.jpeg", widths: [1200, 800, 480] },
  { name: "forklift-bales", src: PROD + "13.47.56.jpeg", widths: [1200, 800, 480] },
  { name: "tops-hand", src: PROD + "13.47.51.jpeg", aspect: [4, 5], widths: [740, 560, 400] },
  { name: "tops-bump", src: PROD + "13.47.55.jpeg", aspect: [4, 5], widths: [740, 560, 400] },
  { name: "tops-cage", src: PROD + "13.47.52 (1).jpeg", aspect: [4, 5], widths: [740, 560, 400] },
  { name: "tops-can-coil", src: PROD + "13.47.39 (3).jpeg", aspect: [4, 5], widths: [740, 560, 400] },
  { name: "tops-shelf", src: PROD + "13.47.38.jpeg", aspect: [4, 5], widths: [740, 560, 400] },
  { name: "greasy-wool", src: PROD + "13.47.41 (1).jpeg", aspect: [4, 5], widths: [740, 560, 400] },
  { name: "warehouse-tall", src: PROD + "13.47.56 (2).jpeg", aspect: [4, 5], widths: [740, 560, 400] },
  // Home selector: 4:3 close-up of the combed fibre on a tops bump, no rack or machinery in frame
  { name: "wool-fibre", src: PROD + "13.47.55.jpeg", crop: { left: 30, top: 580, width: 687, height: 515 }, warm: true, widths: [680, 480] },
  {
    name: "bales-export",
    src: "Webseite/Webseite Aktuell/Images/nicht genutzte Bilder für Webseite/Original-Verladung.jpeg",
    aspect: [4, 5],
    widths: [1200, 800, 480],
  },
  {
    // 4:5 window starting below the top of the frame, so the face sits in the upper third
    name: "stanley-kunz",
    src: BACKUP + "WhatsApp Image 2026-09-07 at 21.14.54.jpeg",
    crop: { left: 0, top: 250, width: 857, height: 1071 },
    widths: [840, 600, 400],
  },
];

// Beef visuals: renders from the previous website (no real plant photos yet).
const OLD = "Webseite/Webseite Aktuell/Images/";
images.push(
  { name: "cattle-pasture", src: OLD + "Weiderinder.png", crop: { left: 0, top: 600, width: 1122, height: 600 }, widths: [1100, 800, 480] },
  { name: "cattle-tall", src: OLD + "Weiderinder.png", aspect: [4, 5], widths: [740, 560, 400] },
  // Home selector: same 4:3 frame as wool-fibre
  { name: "cattle-home", src: OLD + "Weiderinder.png", crop: { left: 0, top: 500, width: 1122, height: 842 }, widths: [1100, 800, 480] },
  { name: "beef-cuts", src: OLD + "Cuts.png", widths: [1200, 800, 480] },
  { name: "beef-carcass", src: OLD + "Hälfte.png", widths: [1200, 800, 480] }
);

const LOGO = "Webseite/Webseite Aktuell/Images/Logo.png";

async function processPhoto(img) {
  const input = path.join(srcRoot, img.src);
  if (!existsSync(input)) throw new Error("missing source: " + input);
  const base = sharp(input).rotate(); // honour EXIF orientation
  const meta = await base.metadata();
  const orientedW = meta.orientation && meta.orientation >= 5 ? meta.height : meta.width;
  const orientedH = meta.orientation && meta.orientation >= 5 ? meta.width : meta.height;

  let cropW = orientedW;
  let cropH = orientedH;
  if (img.crop) {
    cropW = img.crop.width;
    cropH = img.crop.height;
  } else if (img.aspect) {
    const [aw, ah] = img.aspect;
    if (orientedW / orientedH > aw / ah) cropW = Math.round(orientedH * (aw / ah));
    else cropH = Math.round(orientedW * (ah / aw));
  }

  const result = { name: img.name, sizes: [] };
  for (const w of img.widths) {
    const width = Math.min(w, cropW);
    const height = Math.round(width * (cropH / cropW));
    let pipeline = sharp(input).rotate();
    if (img.crop) {
      pipeline = pipeline.extract(img.crop);
    } else if (img.aspect) {
      pipeline = pipeline.resize({ width: cropW, height: cropH, fit: "cover", position: img.position || "centre" });
    }
    pipeline = pipeline
      .resize({ width, height, fit: "cover", position: img.position || "centre", withoutEnlargement: false })
      .modulate({ brightness: 1.02, saturation: 0.92 });
    // warm: a slight shift towards the paper tone so white fibre sits next to warm landscape photos
    if (img.warm) pipeline = pipeline.linear([1.02, 1.0, 0.95], [4, 2, -2]);
    const stem = path.join(outDir, `${img.name}-${width}`);
    await pipeline.clone().webp({ quality: 78, effort: 5 }).toFile(stem + ".webp");
    await pipeline.clone().jpeg({ quality: 80, mozjpeg: true, progressive: true }).toFile(stem + ".jpg");
    result.sizes.push({ width, height });
  }
  return result;
}

async function processLogo() {
  const input = path.join(srcRoot, LOGO);
  const logo = sharp(input).ensureAlpha();
  const meta = await logo.metadata();
  const size = Math.max(meta.width, meta.height);
  // square canvas, transparent
  const squared = () =>
    sharp(input)
      .ensureAlpha()
      .resize({ width: size, height: size, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });

  for (const s of [48, 96, 192, 512]) {
    await squared().resize(s, s).png({ compressionLevel: 9 }).toFile(path.join(outDir, `logo-${s}.png`));
  }
  await squared().resize(32, 32).png().toFile(path.join(repo, "favicon-32.png"));
  await squared().resize(192, 192).png().toFile(path.join(repo, "favicon-192.png"));
  // Apple touch icons have no transparency: flatten onto the paper colour with a margin.
  await sharp({ create: { width: 180, height: 180, channels: 3, background: "#f5f2ec" } })
    .composite([{ input: await squared().resize(140, 140).png().toBuffer(), gravity: "centre" }])
    .png()
    .toFile(path.join(repo, "apple-touch-icon.png"));

  // White version of the mark for dark backgrounds: keep the alpha, replace the colour.
  const alpha = await squared().resize(192, 192).extractChannel("alpha").toBuffer();
  await sharp({ create: { width: 192, height: 192, channels: 3, background: "#ffffff" } })
    .joinChannel(alpha)
    .png()
    .toFile(path.join(outDir, "logo-white-192.png"));
}

// `--only name[,name]` rebuilds just those photos (no logo, manifest untouched).
const onlyArg = process.argv.indexOf("--only");
const only = onlyArg > -1 ? new Set(process.argv[onlyArg + 1].split(",")) : null;

await mkdir(outDir, { recursive: true });
const manifest = [];
for (const img of images) {
  if (only && !only.has(img.name)) continue;
  const r = await processPhoto(img);
  manifest.push(r);
  console.log(r.name, r.sizes.map((s) => `${s.width}x${s.height}`).join(" "));
}
if (only) process.exit(0);
await processLogo();
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log("done → " + outDir);
