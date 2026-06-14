export const prerender = false;
import fs from 'node:fs';
import path from 'node:path';

const ADMIN_KEY = (process.env.ADMIN_KEY || 'eV4VhIuB8dGjK2mN9pQrX5wZ7yC3fA0s').trim();
const DATA_PATH = path.resolve('./public/data/vissessies.json');

function checkAuth(cookies) {
  const token = cookies.get('admin_token');
  return token && token.value === ADMIN_KEY;
}

function readData() {
  let data = [];
  try { data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')); } catch {}
  return data;
}

export async function GET({ cookies }) {
  if (!checkAuth(cookies)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
  const data = readData();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export async function POST({ request, cookies }) {
  try {
    if (!checkAuth(cookies)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    const entry = await request.json();
    if (entry.stek) entry.stek = entry.stek.replace(/\s+/g, ' ').trim();
    if (entry.datum) entry.datum = entry.datum.trim();
    const data = readData();
    const idx = data.findIndex(e => e.stek === entry.stek && e.datum === entry.datum);
    if (idx >= 0) data[idx] = entry;
    else data.push(entry);
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
