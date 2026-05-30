export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const LEGENDE_PATH = path.resolve('./public/data/legende.json');

export async function GET() {
  try {
    const content = fs.readFileSync(LEGENDE_PATH, 'utf-8');
    const data = JSON.parse(content);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return new Response(JSON.stringify({ error: 'Ongeldige data: array verwacht' }), { status: 400 });
    }
    fs.writeFileSync(LEGENDE_PATH, JSON.stringify(body, null, 2), 'utf-8');
    return new Response(JSON.stringify({ success: true, count: body.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}