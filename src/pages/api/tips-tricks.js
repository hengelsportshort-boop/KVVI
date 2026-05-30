export const prerender = false;
import fs from 'node:fs';
import path from 'node:path';

const DATA_PATH = path.resolve('./public/data/tips-tricks.json');

function leesData() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { pageVisible: true, tips: [] };
  }
}

export async function GET() {
  try {
    const data = leesData();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid data' }), { status: 400 });
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(body, null, 2), 'utf-8');
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
