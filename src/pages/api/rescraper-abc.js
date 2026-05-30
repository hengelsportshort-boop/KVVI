import { writeFileSync } from 'fs';

const BASE = 'https://www.abc-sportvissen.be';
const INDEX_DIR = '/paginas-visreizen/paginas-vislocaties-divers/vislocaties%20en%20stekken';
const INDEX_URL = BASE + INDEX_DIR + '/Vislocaties-home.htm';

const TYPE_MAP = {
  'KAN': { group: 3, color: '#ffcc00' },
  'RIV': { group: 1622341650, color: '#2a4ea1' },
  'AOB': { group: null, color: '#000080' },
  'POL': { group: 439529756, color: '#3cc954' },
  'APV': { group: 4, color: '#e32c31' },
  'FOR': { group: 7, color: '#94a3b8' },
};

function extractLinks(html) {
  const links = [];
  const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const row = match[0];
    const tds = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi);
    if (!tds || tds.length < 4) continue;
    const type1 = tds[0].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    const name1 = extractLinkInfo(tds[1]);
    const type2 = tds[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    const name2 = extractLinkInfo(tds[3]);
    if (name1) links.push({ ...name1, type: type1 || null });
    if (name2) links.push({ ...name2, type: type2 || null });
  }
  return links;
}

function extractLinkInfo(tdHtml) {
  const aMatch = tdHtml.match(/<a[^>]*href="([^"]*)"[^>]*>/i);
  if (!aMatch) return null;
  const href = aMatch[1];
  const text = tdHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text || text === '\u00a0' || text === ' ') return null;
  const fullUrl = href.startsWith('http') ? href : BASE + INDEX_DIR + '/' + href.replace(/^(\.\/)?/, '').replace(/ /g, '%20');
  return { title: text, url: fullUrl };
}

function extractDetail(detailHtml) {
  const titleMatch = detailHtml.match(/<font size="4" color="#FF0000"><b>([\s\S]*?)<\/b><\/font>/i);
  const title = titleMatch ? titleMatch[1].replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim() : 'Onbekend';

  const imgMatch = detailHtml.match(/<img[^>]*src="([^"]*)"[^>]*width="485"/i);
  const rawImage = imgMatch ? imgMatch[1] : null;
  let image = null;
  if (rawImage) {
    const cleaned = rawImage.replace(/^\.\.\/\.\.\/\.\.\//, '').replace(/^https?:\/\/www\.abc-sportvissen\.be\//, '');
    image = 'https://www.abc-sportvissen.be/' + cleaned;
  }

  const videoMatch = detailHtml.match(/href="(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^"]*)"/i);
  const video = videoMatch ? videoMatch[1] : null;

  const coordsMatch = detailHtml.match(/ll=([\d.-]+),([\d.-]+)/);
  const coords = coordsMatch ? [parseFloat(coordsMatch[2]), parseFloat(coordsMatch[1])] : null;

  const sections = {};
  const tableRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<\/td>[\s\S]*?<\/tr>/gi;
  let match;
  while ((match = tableRegex.exec(detailHtml)) !== null) {
    const cells = match[0].match(/<td[^>]*>[\s\S]*?<\/td>/gi);
    if (cells && cells.length >= 2) {
      const label = cells[0].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
      const value = cells[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (label && value && !label.includes('Foto') && !label.includes('Plan') && value.length > 3) {
        sections[label] = value;
      }
    }
  }

  let descParts = [];
  if (sections['Gegevens']) descParts.push(sections['Gegevens']);
  if (sections['Vissoorten']) descParts.push('Vissoorten: ' + sections['Vissoorten']);
  if (sections['Bijzonderheden']) descParts.push('Bijzonderheden: ' + sections['Bijzonderheden']);
  if (sections['Vergunning']) descParts.push('Vergunning: ' + sections['Vergunning']);
  if (sections['Stekken']) descParts.push('Stekken: ' + sections['Stekken']);

  return { title, description: descParts.join('\n\n'), image, video, coords };
}

export async function POST() {
  const results = { success: false, count: 0, errors: [] };
  let idCounter = 1000000;

  try {
    const indexRes = await fetch(INDEX_URL);
    if (!indexRes.ok) throw new Error('Index fetch failed: ' + indexRes.status);
    const indexHtml = await indexRes.text();
    const links = extractLinks(indexHtml);
    const features = [];

    for (const link of links) {
      if (!link.title) continue;
      try {
        const detailRes = await fetch(link.url);
        if (!detailRes.ok) continue;
        const detailHtml = await detailRes.text();
        const detail = extractDetail(detailHtml);

        if (detail.title === 'Onbekend' && link.title) {
          detail.title = link.title;
        }

        const typeInfo = TYPE_MAP[link.type] || { group: null, color: '#94a3b8' };
        const feature = {
          type: 'Feature',
          id: idCounter++,
          geometry: { type: 'Point', coordinates: detail.coords || [3.0, 51.0] },
          properties: {
            title: detail.title,
            description: detail.description || '',
            'marker-color': typeInfo.color,
            group: typeInfo.group,
            url: link.url,
          },
        };
        if (detail.image) feature.properties.image = detail.image;
        if (detail.video) feature.properties.video = detail.video;
        if (detail.description) feature.properties.description = detail.description;
        features.push(feature);
      } catch (e) {
        results.errors.push(link.title + ': ' + e.message);
      }
    }

    const geojson = { type: 'FeatureCollection', features };
    const outPath = './public/data/abc-sportvissen.geojson';
    writeFileSync(outPath, JSON.stringify(geojson, null, 2), 'utf-8');
    results.success = true;
    results.count = features.length;
  } catch (e) {
    results.error = e.message;
  }

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
}
