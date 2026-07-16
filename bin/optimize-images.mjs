import { readdir, stat, rename } from 'fs/promises';
import { join, extname, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

let sharp;
try { sharp = (await import('sharp')).default; } catch { console.log('⚠️ sharp niet beschikbaar, skip image optimalisatie'); process.exit(0); }

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public');
const MAX_WIDTH = 1920;
const MOBILE_WIDTH = 640;
const JPEG_QUALITY = 80;

const dirs = ['fotos', 'Fotos Home', 'Foto Fotos'];

async function* walk(dir) {
  let entries;
  try { entries = await readdir(dir); } catch { return; }
  for (const entry of entries) {
    const full = join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function mobilePath(file) {
  const dir = dirname(file);
  const base = basename(file, extname(file));
  return join(dir, base + '_640' + extname(file));
}

async function main() {
  let totalSaved = 0;
  let count = 0;

  for (const dir of dirs) {
    const baseDir = join(PUBLIC, dir);
    for await (const file of walk(baseDir)) {
      const ext = extname(file).toLowerCase();
      if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;
      if (file.includes('_640.')) continue;

      const origSize = (await stat(file)).size;
      if (origSize < 1024) continue;

      let img = sharp(file);
      const meta = await img.metadata();
      if (!meta.width) continue;

      // Desktop versie (indien nog niet optimaal)
      if (!(meta.width <= MAX_WIDTH && meta.format === 'jpeg')) {
        let desktop = sharp(file);
        if (meta.format === 'png') {
          desktop = desktop
            .resize(MAX_WIDTH, null, { withoutEnlargement: true, fit: 'inside' })
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .jpeg({ quality: JPEG_QUALITY });
        } else {
          desktop = desktop
            .resize(MAX_WIDTH, null, { withoutEnlargement: true, fit: 'inside' })
            .jpeg({ quality: JPEG_QUALITY });
        }
        const buf = await desktop.toBuffer();
        const saved = origSize - buf.length;
        totalSaved += saved;
        count++;
        await desktop.toFile(file + '.tmp');
        await rename(file + '.tmp', file);
        if (saved > 0) {
          console.log(`  ${(saved / 1024 / 1024).toFixed(1)}MB saved: ${file.replace(PUBLIC, '')}`);
        }
      }

      // Mobiele versie (640px)
      const mob = mobilePath(file);
      const mobExists = await stat(mob).then(() => true).catch(() => false);
      if (!mobExists || (await stat(mob)).size < 1024) {
        let mobile = sharp(file)
          .resize(MOBILE_WIDTH, null, { withoutEnlargement: true, fit: 'inside' })
          .jpeg({ quality: JPEG_QUALITY });
        if (meta.format === 'png') {
          mobile = mobile.flatten({ background: { r: 255, g: 255, b: 255 } });
        }
        await mobile.toFile(mob);
        console.log(`  mobile: ${file.replace(PUBLIC, '')} → ${basename(mob)}`);
      }
    }
  }

  console.log(`\n✅ ${count} afbeeldingen geoptimaliseerd, ${(totalSaved / 1024 / 1024).toFixed(1)}MB bespaard.`);
}

main().catch(err => {
  console.error('Fout:', err);
  process.exit(1);
});
