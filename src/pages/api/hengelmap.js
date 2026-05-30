export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

function normalize(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function loadVisplaatsen() {
  const csvPad = path.resolve('./public/data/hengelmap.csv');
  if (!fs.existsSync(csvPad)) return [];
  const content = fs.readFileSync(csvPad, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';'
  });
  return records.map((row) => ({
    naam: row.naam ?? row['naam'] ?? '',
    lat: row.lat ?? row['lat'] ?? '',
    lng: row.lng ?? row['lng'] ?? '',
    type: row.type ?? row['type'] ?? '',
    link: row.link ?? row['link'] ?? ''
  }));
}

export async function GET({ url }) {
  try {
    const q = url.searchParams.get('q') || '';
    const limit = Math.max(1, Math.min(25, parseInt(url.searchParams.get('limit') || '10', 10) || 10));

    const all = loadVisplaatsen();
    const nq = normalize(q);

    if (!nq) {
      return new Response(JSON.stringify({ query: q, results: all.slice(0, limit), total: all.length }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const scored = all
      .map((p) => {
        const name = normalize(p.naam);
        const type = normalize(p.type);
        const hay = `${name} ${type}`;
        let score = 0;
        if (name === nq) score = 100;
        else if (name.startsWith(nq)) score = 80;
        else if (hay.includes(nq)) score = 60;
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.p.naam.localeCompare(b.p.naam))
      .slice(0, limit)
      .map((x) => x.p);

    return new Response(JSON.stringify({ query: q, results: scored, total: all.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Onbekende fout' }), { status: 500 });
  }
}

