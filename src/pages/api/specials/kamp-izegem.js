export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const BASE_DIR = path.resolve('./public/data/kamp-izegem');

function getYear(url) {
  const y = url ? url.searchParams.get('year') : null;
  return y || String(new Date().getFullYear());
}

function getFilePath(year) {
  return path.join(BASE_DIR, `${year}.json`);
}

export async function GET({ url }) {
  try {
    const year = getYear(url);
    const filePath = getFilePath(year);
    if (!fs.existsSync(filePath)) {
      const prevYear = String(parseInt(year) - 1);
      const prevPath = getFilePath(prevYear);
      if (fs.existsSync(prevPath)) {
        const prevContent = fs.readFileSync(prevPath, 'utf-8');
        const prevData = JSON.parse(prevContent);
        prevData.year = year;
        fs.writeFileSync(filePath, JSON.stringify(prevData, null, 2), 'utf-8');
        return new Response(JSON.stringify(prevData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'Geen data' }), { status: 404 });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function POST({ request, url }) {
  try {
    const year = getYear(url);
    const body = await request.json();
    const filePath = getFilePath(year);
    if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf-8');
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}