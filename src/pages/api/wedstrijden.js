export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

export async function GET({ url }) {
  try {
    const groep = url.searchParams.get('groep') || 'Zaterdagvissers';
    const jaar = url.searchParams.get('jaar') || '2026';
    const csvPad = path.resolve(`./public/data/${jaar}/${groep}.csv`);

    if (!fs.existsSync(csvPad)) {
      return new Response(JSON.stringify({ error: 'Bestand niet gevonden' }), { status: 404 });
    }

    const content = fs.readFileSync(csvPad, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());

    // Parse: eerste lijn = headers, rest = data
    const headers = lines[0].split(';').map(h => h.trim());
    const rows = lines.slice(1).map(l => l.split(';').map(c => c.trim()));

    return new Response(JSON.stringify({ headers, rows, raw: content }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function POST({ request }) {
  try {
    const { groep, jaar, csvContent } = await request.json();
    if (!csvContent) {
      return new Response(JSON.stringify({ error: 'Geen CSV content' }), { status: 400 });
    }

    const csvPad = path.resolve(`./public/data/${jaar || '2026'}/${groep || 'Zaterdagvissers'}.csv`);
    fs.writeFileSync(csvPad, csvContent, 'utf-8');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}