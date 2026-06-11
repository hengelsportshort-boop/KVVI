export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const DATA_PATH = path.resolve('./public/data/vissessies.json');
const BACKUP_DIR = path.resolve('./public/data/backups');

function getBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    return fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('vissessies-') && f.endsWith('.json'))
      .sort()
      .reverse();
  } catch { return []; }
}

export async function GET() {
  return new Response(JSON.stringify({ backups: getBackups() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { action, file, data } = body;

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    if (action === 'create') {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const fileName = `vissessies-${dateStr}.json`;
      const filePath = path.join(BACKUP_DIR, fileName);
      if (!fs.existsSync(DATA_PATH)) throw new Error('Geen vissessies-data gevonden');
      fs.copyFileSync(DATA_PATH, filePath);
      return new Response(JSON.stringify({ ok: true, file: fileName }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    if (action === 'restore') {
      if (!file) throw new Error('Geen backup-bestand opgegeven');
      const filePath = path.join(BACKUP_DIR, file);
      if (!fs.existsSync(filePath)) throw new Error('Backup niet gevonden: ' + file);
      fs.copyFileSync(filePath, DATA_PATH);
      const raw = fs.readFileSync(DATA_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return new Response(JSON.stringify({ ok: true, count: parsed.length }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    if (action === 'upload') {
      const rows = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : null);
      if (!rows) throw new Error('Geen geldige data in upload');
      fs.writeFileSync(DATA_PATH, JSON.stringify(rows, null, 2), 'utf-8');
      return new Response(JSON.stringify({ ok: true, count: rows.length }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    if (action === 'list') {
      return new Response(JSON.stringify({ backups: getBackups() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    if (action === 'download') {
      if (!file) throw new Error('Geen backup-bestand opgegeven');
      const filePath = path.join(BACKUP_DIR, file);
      if (!fs.existsSync(filePath)) throw new Error('Backup niet gevonden: ' + file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      return new Response(raw, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${file}"`
        }
      });
    }

    throw new Error('Onbekende actie. Gebruik: create, restore, upload, download, list');
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
