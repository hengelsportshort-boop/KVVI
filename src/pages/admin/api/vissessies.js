export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const DATA_PATH_NEW = path.resolve('./public/data/vissessies.json');
const DATA_PATH_OLD = path.resolve('./public/data/visstanden.json');
const BACKUP_DIR = path.resolve('./public/data/backups');

function getDataPath() {
  return fs.existsSync(DATA_PATH_NEW) ? DATA_PATH_NEW : DATA_PATH_OLD;
}

function autoBackup() {
  try {
    const src = getDataPath();
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('vissessies-') && f.endsWith('.json'));
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const newest = files.map(f => fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs).sort((a, b) => b - a)[0];
    if (!newest || (now - newest) > oneWeek) {
      const dateStr = new Date().toISOString().split('T')[0];
      fs.copyFileSync(src, path.join(BACKUP_DIR, `vissessies-${dateStr}.json`));
    }
  } catch {}
}

export async function GET() {
  try {
    const raw = fs.readFileSync(getDataPath(), 'utf-8');
    return new Response(raw, {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

export async function POST({ request }) {
  try {
    const data = await request.json();
    // Merge met bestaande data in plaats van overschrijven
    let bestaand = [];
    try { bestaand = JSON.parse(fs.readFileSync(DATA_PATH_NEW, 'utf-8')); } catch {}
    if (!Array.isArray(bestaand)) bestaand = [];
    if (Array.isArray(data)) {
      // Als een volledige dataset wordt gestuurd (admin dashboard)
      // Check of het een volledige dataset is (> 1 entry of entries hebben alle velden)
      const isFullDataset = data.length > 1 || (data.length === 1 && (data[0].month || data[0].begin));
      if (isFullDataset) {
        // Volledige dataset = vervang alles
        fs.writeFileSync(DATA_PATH_NEW, JSON.stringify(data, null, 2), 'utf-8');
      } else {
        // Enkele entries: merge met bestaande data
        for (const entry of data) {
          if (!entry.stek && !entry.datum) continue;
          const stekNorm = (entry.stek || '').trim();
          const datumNorm = (entry.datum || '').trim();
          const idx = bestaand.findIndex(e => (e.stek || '').trim() === stekNorm && (e.datum || '').trim() === datumNorm);
          if (idx >= 0) {
            bestaand[idx] = { ...bestaand[idx], ...entry };
          } else {
            bestaand.push(entry);
          }
        }
        fs.writeFileSync(DATA_PATH_NEW, JSON.stringify(bestaand, null, 2), 'utf-8');
      }
    } else if (typeof data === 'object' && data.stek) {
      // Enkel object (van Feeder Assistent via sync-vissessie)
      const stekNorm = (data.stek || '').trim();
      const datumNorm = (data.datum || '').trim();
      const idx = bestaand.findIndex(e => (e.stek || '').trim() === stekNorm && (e.datum || '').trim() === datumNorm);
      if (idx >= 0) {
        bestaand[idx] = { ...bestaand[idx], ...data };
      } else {
        bestaand.push(data);
      }
      fs.writeFileSync(DATA_PATH_NEW, JSON.stringify(bestaand, null, 2), 'utf-8');
    }
    autoBackup();
    return new Response(JSON.stringify({ ok: true, count: Array.isArray(data) ? data.length : 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
