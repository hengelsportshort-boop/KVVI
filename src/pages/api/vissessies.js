export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const DATA_PATH = path.resolve('./public/data/vissessies.json');

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
    if (!Array.isArray(data)) {
      return new Response(JSON.stringify({ ok: false, error: 'Volledige dataset verwacht' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return new Response(JSON.stringify({ ok: true, count: data.length }), {
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
