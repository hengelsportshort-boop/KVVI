import compression from 'compression';
import { handler } from './dist/server/entry.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.join(__dirname, 'dist', 'client');
const PORT = parseInt(process.env.PORT || '4321');

const MIME = {
  '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json',
  '.xml': 'application/xml', '.txt': 'text/plain',
};

const STATIC_RX = /\.(js|css|png|jpg|jpeg|webp|svg|ico|woff2?|json|xml|txt)$/;
const NO_CACHE = ['/sw.js', '/manifest.json', '/offline.html'];
const CACHE_RX = /^\/_astro\/|\.(js|css|png|jpg|jpeg|webp|svg|ico|woff2?)$/;

function serveStatic(req, res) {
  let filePath = path.join(CLIENT_DIR, decodeURIComponent(req.url));
  if (filePath.includes('\0')) { res.writeHead(400); res.end(); return true; }
  try {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME[ext] || 'application/octet-stream';
      const cache = CACHE_RX.test(req.url) && !NO_CACHE.includes(req.url);
      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': stat.size,
        ...(cache ? { 'Cache-Control': 'public, max-age=31536000, immutable' } : {}),
      });
      fs.createReadStream(filePath).pipe(res);
      return true;
    }
  } catch { }
  return false;
}

const server = http.createServer((req, res) => {
  if (serveStatic(req, res)) return;
  compression()(req, res, () => handler(req, res));
});

const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`KVVI server: http://${HOST}:${PORT}`);
});
