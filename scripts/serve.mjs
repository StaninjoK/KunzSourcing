// Minimal static file server for local preview (no dependencies).
// Usage: node scripts/serve.mjs [port]   → http://127.0.0.1:8090
import { createServer } from "node:http";
import { stat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.argv[2] || 8090);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    let file = path.join(root, pathname);
    if (!file.startsWith(root)) throw Object.assign(new Error("forbidden"), { code: "EACCES" });
    let info = await stat(file).catch(() => null);
    if (info && info.isDirectory()) {
      if (!pathname.endsWith("/")) {
        // Like GitHub Pages: /de → /de/
        res.writeHead(301, { location: pathname + "/" });
        res.end();
        return;
      }
      file = path.join(file, "index.html");
      info = await stat(file).catch(() => null);
    }
    if (!info && !path.extname(file)) {
      // Like GitHub Pages: /impressum → /impressum.html
      const withHtml = file + ".html";
      const alt = await stat(withHtml).catch(() => null);
      if (alt) {
        file = withHtml;
        info = alt;
      }
    }
    if (!info) {
      const notFound = path.join(root, "404.html");
      const body = await readFile(notFound).catch(() => Buffer.from("Not found"));
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      res.end(body);
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": types[path.extname(file).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(String(err && err.message));
  }
}).listen(port, "127.0.0.1", () => console.log(`serving ${root} at http://127.0.0.1:${port}`));
