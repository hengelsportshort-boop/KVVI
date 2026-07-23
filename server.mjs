import compression from 'compression';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.join(__dirname, 'dist', 'client');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = parseInt(process.env.PORT || '4321');

let astroHandler;

async function getAstroHandler() {
  if (!astroHandler) {
    const mod = await import('./dist/server/entry.mjs');
    astroHandler = mod.handler;
  }
  return astroHandler;
}

const MIME = {
  '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json',
  '.xml': 'application/xml', '.txt': 'text/plain',
};

const NO_CACHE = ['/sw.js', '/manifest.json', '/offline.html'];
const CACHE_RX = /^\/_astro\/|\.(js|css|png|jpg|jpeg|webp|svg|ico|woff2?)$/i;

function serveStatic(req, res) {
  let filePath = path.join(CLIENT_DIR, decodeURIComponent(req.url));
  if (filePath.includes('\0')) { res.writeHead(400); res.end(); return true; }
  try {
    let stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      stat = fs.statSync(filePath);
    }
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

  let publicFilePath = path.join(PUBLIC_DIR, decodeURIComponent(req.url));
  if (!publicFilePath.includes('\0')) {
    try {
      const publicStat = fs.statSync(publicFilePath);
      if (publicStat.isFile()) {
        const ext = path.extname(publicFilePath).toLowerCase();
        const mime = MIME[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': mime,
          'Content-Length': publicStat.size,
        });
        fs.createReadStream(publicFilePath).pipe(res);
        return true;
      }
    } catch { }
  }

  return false;
}

const server = http.createServer((req, res) => {
  if (req.url === '/index.html' || req.url === '/index.htm' || req.url === '/default.html') {
    res.writeHead(301, { Location: '/' });
    res.end();
    return;
  }
  if (serveStatic(req, res)) return;
  compression()(req, res, async () => {
    const handler = await getAstroHandler();
    handler(req, res);
  });
});

const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`KVVI server: http://${HOST}:${PORT}`);
});
