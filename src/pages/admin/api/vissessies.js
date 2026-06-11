export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const DATA_PATH = path.resolve('./public/data/vissessies.json');
const BACKUP_DIR = path.resolve('./public/data/backups');

function autoBackup() {
  try {
    if (!fs.existsSync(DATA_PATH)) return;
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('vissessies-') && f.endsWith('.json'));
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const newest = files.map(f => fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs).sort((a, b) => b - a)[0];
    if (!newest || (now - newest) > oneWeek) {
      const dateStr = new Date().toISOString().split('T')[0];
      fs.copyFileSync(DATA_PATH, path.join(BACKUP_DIR, `vissessies-${dateStr}.json`));
    }
  } catch {}
}

export async function GET() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
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
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
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
