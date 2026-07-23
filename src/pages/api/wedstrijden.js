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

    const headers = lines[0].split(';').map(h => h.trim());
    const rows = lines.slice(1).map(l => l.split(';').map(c => c.trim()));

    // Bereken Totaal kg Adjust (formule: som - laagste bij >=4 deelnames)
    const dateIndices = headers
      .map((h, i) => ({ h: (h || '').toString(), i }))
      .filter(item => item.h.includes('/') && item.i > 1)
      .map(item => item.i);
    const totalIndex = headers.findIndex(h => (h || '').toLowerCase().includes('totaal kg'));

    if (totalIndex >= 0 && dateIndices.length > 0) {
      for (const row of rows) {
        const name = (row[1] || '').toLowerCase();
        if (!name || name.includes('totaal') || name.includes('beste') || name.includes('slechtste')) continue;
        const pairs = dateIndices.map(di => {
          const val = (row[di] || '').toString().trim();
          const hasValue = val !== '' && val !== '--';
          let weight = 0;
          if (hasValue) {
            const cleaned = val.replace(/\./g, '').replace(/gr/gi, '').replace(/,/g, '.').trim();
            weight = parseFloat(cleaned);
            if (!Number.isFinite(weight)) weight = 0;
          }
          return { hasValue, weight };
        });
        const totalWeight = pairs.reduce((s, p) => s + p.weight, 0);
        const deelnames = pairs.filter(p => p.hasValue).length;
        let finalTotal = totalWeight;
        if (deelnames >= 4) {
          const filteredWeights = pairs.filter(p => p.hasValue).map(p => p.weight);
          finalTotal = totalWeight - Math.min(...filteredWeights);
        }
        const kgValue = finalTotal / 1000;
        row[totalIndex] = kgValue > 0 ? `${kgValue.toFixed(3).replace('.', ',')} gr` : '0,000 gr';
      }
    }

    return new Response(JSON.stringify({ headers, rows, raw: content }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

const ALLOWED_GROEPEN = ['Zaterdagvissers', 'Veteranen'];

export async function POST({ request }) {
  try {
    const { groep, jaar, csvContent } = await request.json();
    if (!csvContent) {
      return new Response(JSON.stringify({ error: 'Geen CSV content' }), { status: 400 });
    }

    const safeGroep = ALLOWED_GROEPEN.includes(groep) ? groep : 'Zaterdagvissers';
    const safeJaar = /^\d{4}$/.test(String(jaar)) ? String(jaar) : '2026';
    const dir = path.resolve(`./public/data/${safeJaar}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const csvPad = path.resolve(`./public/data/${safeJaar}/${safeGroep}.csv`);
    fs.writeFileSync(csvPad, csvContent, 'utf-8');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}