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
  // Home selector wool tile: merino sheep on pasture (render, labelled as illustration); crop leaves out the logo top left
  { name: "sheep-home", src: "IMG/weidebild Merino.png", crop: { left: 360, top: 240, width: 1175, height: 784 }, widths: [1100, 800, 480] },
  // Home selector: same 4:3 frame as wool-fibre
  { name: "cattle-home", src: OLD + "Weiderinder.png", crop: { left: 0, top: 500, width: 1122, height: 842 }, widths: [1100, 800, 480] },
  { name: "beef-cuts", src: OLD + "Cuts.png", widths: [1200, 800, 480] },
  { name: "beef-carcass", src: OLD + "Hälfte.png", widths: [1200, 800, 480] }
);

// Beef catalogue: product photos from the plant's specification sheets (September 2026).
// Only the product shots are used, never labels, cartons with print or plant logos.
// Each photo is brought to a white background, fitted into a 4:3 frame with soft edges,
// enlarged at most MAX_UPSCALE times and lightly sharpened.
const CUTS_SRC = "Rindfleisch Datenblaetter 2026-09/Fotos/";
const cuts = [
  "tenderloin",
  "striploin",
  "ribeye",
  "picanha",
  "heart-of-rump",
  "tri-tip",
  "topside",
  "flat",
  "knuckle",
  "flap-meat",
  "flank-steak",
  "heart-of-clod",
].map((name) => ({ name: "cut-" + name, src: CUTS_SRC + name + ".jpg", widths: [800, 480] }));
// Carton photo: cover crop, printed inner labels blurred beyond recognition.
cuts.push({
  name: "cut-carton",
  src: CUTS_SRC + "carton-heart-of-rump.jpg",
  cover: true,
  blur: [
    { left: 30, top: 205, width: 70, height: 100 },
    { left: 300, top: 150, width: 60, height: 100 },
    { left: 258, top: 55, width: 40, height: 65 },
    { left: 355, top: 55, width: 40, height: 75 },
  ],
  widths: [800, 480],
});
const MAX_UPSCALE = 2.2;

async function processCut(img) {
  const input = path.join(srcRoot, img.src);
  if (!existsSync(input)) throw new Error("missing source: " + input);
  let src = sharp(input).rotate();
  const meta = await sharp(input).metadata();

  // Neutralise any printed label: heavy blur of the given boxes.
  if (img.blur) {
    // Each box is replaced by a strongly blurred copy of itself with feathered edges,
    // so the label reads as film glare and no text or logo survives.
    const patches = [];
    for (const b of img.blur) {
      const m = 10;
      const box = {
        left: Math.max(0, b.left - m),
        top: Math.max(0, b.top - m),
        width: Math.min(meta.width - Math.max(0, b.left - m), b.width + 2 * m),
        height: Math.min(meta.height - Math.max(0, b.top - m), b.height + 2 * m),
      };
      const blurred = await sharp(input).extract(box).resize(6, 6).resize(box.width, box.height, { kernel: "cubic" }).blur(8).removeAlpha().toBuffer();
      const inner = await sharp({ create: { width: box.width - 2 * m, height: box.height - 2 * m, channels: 3, background: "#ffffff" } }).png().toBuffer();
      const frame = await sharp({ create: { width: box.width, height: box.height, channels: 3, background: "#000000" } })
        .composite([{ input: inner, left: m, top: m }])
        .png()
        .toBuffer();
      const alpha = await sharp(frame).blur(m / 2).extractChannel(0).raw().toBuffer();
      const patch = await sharp(blurred).joinChannel(alpha, { raw: { width: box.width, height: box.height, channels: 1 } }).png().toBuffer();
      patches.push({ input: patch, left: box.left, top: box.top });
    }
    src = sharp(await src.composite(patches).toBuffer());
  }

  // Background to white: scale each channel so the average corner colour becomes white.
  const { data, info } = await src.clone().raw().toBuffer({ resolveWithObject: true });
  const sum = [0, 0, 0];
  let n = 0;
  const p = 8;
  for (const [cx, cy] of [[0, 0], [info.width - p, 0], [0, info.height - p], [info.width - p, info.height - p]]) {
    for (let y = cy; y < cy + p; y++)
      for (let x = cx; x < cx + p; x++) {
        const i = (y * info.width + x) * info.channels;
        sum[0] += data[i];
        sum[1] += data[i + 1];
        sum[2] += data[i + 2];
        n++;
      }
  }
  const gain = img.cover ? [1, 1, 1] : sum.map((s) => Math.min(1.3, 253 / (s / n)));
  let base = await src.linear(gain, [0, 0, 0]).modulate({ saturation: 1.04 }).toBuffer();
  if (!img.cover) {
    // Push the remaining grey backdrop (bright, almost colourless pixels) to pure white.
    // Meat and fat carry clear colour (chroma well above 16) and stay untouched.
    const { data: px, info: pi } = await sharp(base).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < px.length; i += pi.channels) {
      const r = px[i], g = px[i + 1], b = px[i + 2];
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      const light = (r + g + b) / 3;
      const t = Math.min(1, Math.max(0, (light - 185) / 45)) * Math.min(1, Math.max(0, (22 - chroma) / 10));
      if (t > 0) {
        px[i] = r + (255 - r) * t;
        px[i + 1] = g + (255 - g) * t;
        px[i + 2] = b + (255 - b) * t;
      }
    }
    base = await sharp(px, { raw: { width: pi.width, height: pi.height, channels: pi.channels } }).png().toBuffer();
  }

  const result = { name: img.name, sizes: [] };
  for (const w of img.widths) {
    const h = Math.round((w * 3) / 4);
    let out;
    if (img.cover) {
      out = sharp(base).resize({ width: w, height: h, fit: "cover", kernel: "lanczos3" }).sharpen({ sigma: 0.6 });
    } else {
      const scale = Math.min((w * 0.86) / meta.width, (h * 0.8) / meta.height, (MAX_UPSCALE * w) / 800);
      const pw = Math.round(meta.width * scale);
      const ph = Math.round(meta.height * scale);
      const photo = await sharp(base).resize(pw, ph, { kernel: "lanczos3" }).sharpen({ sigma: 0.7, m1: 0.6, m2: 1.4 }).toBuffer();
      // Soft edges so the photo melts into the white card instead of showing a rectangle.
      const f = Math.max(8, Math.round(Math.min(pw, ph) * 0.1));
      const inner = await sharp({ create: { width: pw - 2 * f, height: ph - 2 * f, channels: 3, background: "#ffffff" } }).png().toBuffer();
      const frame = await sharp({ create: { width: pw, height: ph, channels: 3, background: "#000000" } })
        .composite([{ input: inner, left: f, top: f }])
        .png()
        .toBuffer();
      const mask = await sharp(frame).blur(f / 2).extractChannel(0).raw().toBuffer();
      const soft = await sharp(photo).removeAlpha().joinChannel(mask, { raw: { width: pw, height: ph, channels: 1 } }).png().toBuffer();
      out = sharp({ create: { width: w, height: h, channels: 3, background: "#ffffff" } }).composite([
        { input: soft, left: Math.round((w - pw) / 2), top: Math.round((h - ph) / 2) },
      ]);
    }
    const buf = await out.png().toBuffer();
    const stem = path.join(outDir, `${img.name}-${w}`);
    await sharp(buf).webp({ quality: 82, effort: 5 }).toFile(stem + ".webp");
    await sharp(buf).jpeg({ quality: 84, mozjpeg: true, progressive: true }).toFile(stem + ".jpg");
    result.sizes.push({ width: w, height: h });
  }
  return result;
}

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
for (const img of cuts) {
  if (only && !only.has(img.name) && !only.has("cuts")) continue;
  const r = await processCut(img);
  manifest.push(r);
  console.log(r.name, r.sizes.map((s) => `${s.width}x${s.height}`).join(" "));
}
if (only) process.exit(0);
await processLogo();
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log("done → " + outDir);
