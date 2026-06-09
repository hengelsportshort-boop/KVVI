export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const DATA_FILE = path.resolve('./public/data/hengelshop.json');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const defaults = { _categories: ['00_IMPORT'], Carpshop24: [], Lisarde: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    if (!raw._categories) raw._categories = ['00_IMPORT'];
    for (const shop of ['Carpshop24', 'Lisarde']) {
      if (!raw[shop]) raw[shop] = [];
    }
    return raw;
  } catch {
    return { _categories: ['00_IMPORT'], Carpshop24: [], Lisarde: [] };
  }
}

function syncCategories(data) {
  const cats = new Set(data._categories || []);
  for (const shop of ['Carpshop24', 'Lisarde']) {
    if (Array.isArray(data[shop])) {
      for (const p of data[shop]) {
        if (p && p.categorie) cats.add(p.categorie);
      }
    }
  }
  data._categories = [...cats].sort();
}

function saveData(data) {
  if (!data._categories) data._categories = ['00_IMPORT'];
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function properCase(s) {
  const str = (s || '').toString().trim();
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function normalize(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/* ---- Parsers ---- */

function parseCarpshop24(text) {
  const producten = [];
  const regels = text.split('\n').map(r => r.trim()).filter(r => r);
  const processed = new Set();

  for (let i = 0; i < regels.length; i++) {
    if (processed.has(i)) continue;
    const prijsMatch = regels[i].match(/€\s?(\d+[.,]\d{2})/);
    if (!prijsMatch) continue;

    try {
      const prijs = parseFloat(prijsMatch[1].replace(',', '.'));
      if (i >= 2) {
        const naam = regels[i - 1];
        const merk = regels[i - 2].toUpperCase();

        if (/VERWIJDER|SUBTOTAAL|TOTAAL|€/i.test(naam)) continue;

        producten.push({ merk, naam, categorie: 'Webshop', prijs, bron: 'CARPSHOP24' });
        processed.add(i);
        for (let j = i + 1; j < Math.min(i + 5, regels.length); j++) {
          if (/VERWIJDER|€/.test(regels[j])) processed.add(j);
        }
      }
    } catch {}
  }
  return producten;
}

function parseLisarde(text) {
  const producten = [];
  const regels = text.split('\n').map(r => r.trim()).filter(r => r);
  const processed = new Set();
  const bekendeMerken = ['BKK', 'BERKLEY', 'SHIMANO', 'DAIWA', 'GURU', 'KORDA', 'FOX'];

  for (let i = 0; i < regels.length; i++) {
    if (processed.has(i)) continue;
    const prijsMatch = regels[i].match(/€\s?(\d+[.,]\d{2})/);
    if (!prijsMatch) continue;

    try {
      const prijs = parseFloat(prijsMatch[1].replace(',', '.'));
      if (i >= 1) {
        let ruweNaam = regels[i - 1];
        if (/TOTAAL|SUBTOTAAL|BTW|WINKELWAGEN/i.test(ruweNaam) || /€/.test(ruweNaam)) continue;

        let merk = 'LISARDE';
        let naam = ruweNaam;

        if (ruweNaam.includes(':')) {
          const parts = ruweNaam.split(':');
          merk = parts[0].trim().toUpperCase();
          naam = parts.slice(1).join(':').trim();
        } else {
          for (const m of bekendeMerken) {
            if (ruweNaam.toUpperCase().startsWith(m)) {
              merk = m;
              naam = ruweNaam.replace(new RegExp('^' + m, 'i'), '').replace(/^[:\-\s]+/, '');
              break;
            }
          }
        }

        producten.push({ merk, naam, categorie: 'Hengelsport', prijs, bron: 'LISARDE' });
        processed.add(i);
        for (let j = i + 1; j < Math.min(i + 3, regels.length); j++) {
          if (/€/.test(regels[j]) && !regels[j].includes(':')) processed.add(j);
        }
      }
    } catch {}
  }
  return producten;
}

function importParse(text) {
  const producten = [];
  const regels = text.split('\n').map(r => r.trim()).filter(r => r);
  const labelRE = /^(price|prijs?|totaal?|subtotaal?|btw|quantity|aantal|total|subtotal|verwijder|delete)$/i;

  for (let i = 0; i < regels.length; i++) {
    const prices = [];
    let rest = regels[i];
    let pos = 0;
    while (pos < rest.length) {
      const m = rest.slice(pos).match(/€?\s?(\d+[.,]\d{2})/);
      if (!m) break;
      prices.push(m[0].trim());
      pos += m.index + m[0].length;
    }
    if (prices.length === 0) continue;
    if (prices.length > 1) continue;

    const prijsRaw = prices[0];
    let naam = regels[i].split(prijsRaw)[0].replace(/^[-\s]+/, '').trim();
    let merk = '';

    if ((!naam || naam.length < 2) && i > 0) {
      let prev = i - 1;
      while (prev >= 0 && (labelRE.test(regels[prev]) || /^\d+$/.test(regels[prev]) || /^€/.test(regels[prev]) || regels[prev].length < 2)) {
        prev--;
      }
      if (prev >= 0) {
        naam = regels[prev];
        if (naam.includes(':')) {
          const parts = naam.split(':');
          merk = properCase(parts[0]);
          naam = parts.slice(1).join(':').trim();
        } else {
          let brandPrev = prev - 1;
          while (brandPrev >= 0 && (labelRE.test(regels[brandPrev]) || /^\d+$/.test(regels[brandPrev]) || /^€/.test(regels[brandPrev]) || regels[brandPrev].length < 2)) {
            brandPrev--;
          }
          if (brandPrev >= 0 && regels[brandPrev].split(/\s+/).length <= 3) {
            merk = properCase(regels[brandPrev]);
          }
        }
      }
    }

    if (naam.length < 2) continue;
    if (labelRE.test(naam)) continue;
    if (/verwijder/i.test(naam)) continue;
    if (/^€?\s?\d+.*€/.test(naam)) continue;

    if (!merk && naam.includes(':')) {
      const parts = naam.split(':');
      merk = properCase(parts[0]);
      naam = parts.slice(1).join(':').trim();
    }

    naam = properCase(naam).replace(/[\r\n]+/g, ' ').trim();
    const exists = producten.some(p => p.naam.toLowerCase() === naam.toLowerCase());
    if (!exists) {
      producten.push({ naam, prijs: prijsRaw, merk: properCase(merk), categorie: '00_IMPORT', bestel: '0' });
    }
  }
  return producten;
}

/* ---- API Handlers ---- */

export async function GET({ url }) {
  try {
    const data = loadData();
    const shop = url.searchParams.get('shop') || 'Carpshop24';

    if (!data[shop]) {
      return new Response(JSON.stringify({ products: [], shop }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cats = data._categories || [];
    return new Response(JSON.stringify({ products: data[shop], shop, categories: cats }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Onbekende fout' }), { status: 500 });
  }
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { action, shop, content, naam, prijs, categorie, itemIds, targetCat, newCatName, productId, bestel, source } = body;
    const data = loadData();
    const s = shop || 'Carpshop24';

    if (!data[s]) data[s] = [];

    if (action === 'import' && content) {
      const parsed = importParse(content);
      let added = 0;
      for (const p of parsed) {
        const exists = data[s].some(i => (i.naam || '').toLowerCase() === p.naam.toLowerCase());
        if (!exists) {
          data[s].push({
            id: Date.now() + Math.random(),
            merk: p.merk || '',
            naam: p.naam,
            prijs: p.prijs,
            categorie: p.categorie || '00_IMPORT',
            bestel: p.bestel || '0'
          });
          added++;
        }
      }
      syncCategories(data);
      saveData(data);
      return new Response(JSON.stringify({ success: true, count: added, shop: s }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'add_manual') {
      data[s].push({
        id: Date.now() + Math.random(),
        merk: '',
        naam: properCase(naam || 'Onbekend').replace(/[\r\n]+/g, ' ').trim(),
        prijs: prijs || '€ 0,00',
        categorie: newCatName || categorie || '00_IMPORT',
        bestel: '0'
      });
      syncCategories(data);
      saveData(data);
      return new Response(JSON.stringify({ success: true, shop: s }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'update_bestel' && productId !== undefined && bestel !== undefined) {
      const idx = data[s].findIndex(i => i.id === productId);
      if (idx !== -1) {
        data[s][idx].bestel = String(bestel);
        saveData(data);
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'update_product' && productId !== undefined) {
      const idx = data[s].findIndex(i => i.id === productId);
      if (idx !== -1) {
        if (naam !== undefined) data[s][idx].naam = properCase(naam).replace(/[\r\n]+/g, ' ').trim();
        if (prijs !== undefined) data[s][idx].prijs = prijs;
        if (categorie !== undefined) data[s][idx].categorie = categorie;
        if (body.merk !== undefined) data[s][idx].merk = properCase(body.merk);
        syncCategories(data);
        saveData(data);
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'bulk_move') {
      const target = newCatName || targetCat || 'OVERIG';
      if (itemIds && Array.isArray(itemIds)) {
        for (const id of itemIds) {
          const idx = data[s].findIndex(i => i.id === id);
          if (idx !== -1) data[s][idx].categorie = target;
        }
        syncCategories(data);
        saveData(data);
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'reset_bestel') {
      if (data[s]) {
        for (const item of data[s]) {
          item.bestel = '0';
        }
        saveData(data);
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Onbekende actie' }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Onbekende fout' }), { status: 500 });
  }
}

export async function DELETE({ request }) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop') || 'Carpshop24';
    const id = parseFloat(url.searchParams.get('id'));

    if (!id) {
      // Clear entire shop (preserve categories)
      const data = loadData();
      data[shop] = [];
      saveData(data);
      return new Response(JSON.stringify({ success: true, shop }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = loadData();
    if (data[shop]) {
      data[shop] = data[shop].filter(i => i.id !== id);
      saveData(data);
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Onbekende fout' }), { status: 500 });
  }
}