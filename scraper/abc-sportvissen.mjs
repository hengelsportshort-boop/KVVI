import { writeFileSync } from 'fs';

const BASE = 'https://www.abc-sportvissen.be';
const INDEX_DIR = '/paginas-visreizen/paginas-vislocaties-divers/vislocaties%20en%20stekken';
const INDEX_URL = BASE + INDEX_DIR + '/Vislocaties-home.htm';

const TYPE_MAP = {
  'KAN': { group: 3,         color: '#ffcc00' },
  'RIV': { group: 1622341650, color: '#2a4ea1' },
  'AOB': { group: 8,          color: '#000080' },
  'POL': { group: 439529756,  color: '#3cc954' },
  'APV': { group: 4,          color: '#e32c31' },
  'FOR': { group: 7,          color: '#94a3b8' },
};

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'unknown';
}

function extractLinks(html) {
  const links = [];
  const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  let seenSectionHeader = false;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const row = match[0];
    const text = row.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

    // Section headers like "Visstekken Oost Vlaanderen", "Visstekken Antwerpen", etc.
    // West-Vlaanderen has no header — it's everything before the first section header.
    if (row.includes('colspan') && /visstekken/i.test(text)) {
      seenSectionHeader = true;
      continue;
    }

    // Skip rows before the first section header (those are West-Vlaanderen)
    if (!seenSectionHeader) continue;

    const tds = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi);
    if (!tds || tds.length < 4) continue;

    const type1 = tds[0].replace(/<[^>]+>/g, '').trim();
    const name1 = extractLinkInfo(tds[1]);
    const type2 = tds[2].replace(/<[^>]+>/g, '').trim();
    const name2 = extractLinkInfo(tds[3]);

    if (name1) links.push({ ...name1, type: type1 || null });
    if (name2) links.push({ ...name2, type: type2 || null });
  }
  return links;
}

function extractLinkInfo(tdHtml) {
  const aMatch = tdHtml.match(/<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<\/a>/i);
  if (!aMatch) return null;
  const href = aMatch[1];
  const text = tdHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  const fullUrl = href.startsWith('http') ? href : BASE + INDEX_DIR + '/' + href.replace(/^(\.\/)?/, '').replace(/ /g, '%20');
  return { title: text, url: fullUrl, page: href };
}

function extractDetail(detailHtml, url) {
  const titleMatch = detailHtml.match(/<font size="4" color="#FF0000"><b>([\s\S]*?)<\/b><\/font>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Onbekend';

  const imageMatch = detailHtml.match(/<img[^>]*src="([^"]*)"[^>]*width="485"/i);
  const image = imageMatch ? (imageMatch[1].startsWith('http') ? imageMatch[1] : BASE + '/' + imageMatch[1].replace(/^\//, '')) : null;

  const videoMatch = detailHtml.match(/href="(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^"]*)"/i);
  const video = videoMatch ? videoMatch[1] : null;

  const coordsMatch = detailHtml.match(/ll=([\d.-]+),([\d.-]+)/);
  const coords = coordsMatch ? [parseFloat(coordsMatch[2]), parseFloat(coordsMatch[1])] : null;

  const sections = {};
  const tables = detailHtml.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || [];
  for (const table of tables) {
    const rows = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    for (const row of rows) {
      const cells = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
      if (cells.length >= 2) {
        const label = cells[0].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        const value = cells[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        if (label && value && value.length > 2) {
          sections[label] = value;
        }
      }
    }
  }

  const vissoorten = sections['Vissoorten'] || null;
  const gegevens = sections['Gegevens'] || null;
  const vergunning = sections['Vergunning'] || null;
  const bijzonderheden = sections['Bijzonderheden'] || null;
  const stekken = sections['Stekken'] || null;

  let descriptionLines = [];
  if (gegevens) descriptionLines.push(gegevens);
  if (vissoorten) descriptionLines.push('Vissoorten: ' + vissoorten);
  if (bijzonderheden) descriptionLines.push('Bijzonderheden: ' + bijzonderheden);
  if (vergunning) descriptionLines.push('Vergunning: ' + vergunning);
  if (stekken) descriptionLines.push('Stekken: ' + stekken);
  const description = descriptionLines.join('\n\n') || sections['Gegevens'] || '';

  return { title, description, image, video, coords, url, raw: sections };
}

async function fetchPage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const text = await res.text();
  return text;
}

async function main() {
  console.log('Fetching index page...');
  const indexHtml = await fetchPage(INDEX_URL);

  console.log('Extracting links...');
  const links = extractLinks(indexHtml);
  console.log(`Found ${links.length} location links`);

  const features = [];
  let id = 1000000;

  for (const link of links) {
    if (!link.title || link.title === '&nbsp;') continue;

    console.log(`\nFetching: ${link.title}`);
    console.log(`  URL: ${link.url}`);

    let detailHtml;
    try {
      detailHtml = await fetchPage(link.url);
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
      continue;
    }

    const detail = extractDetail(detailHtml, link.url);
    console.log(`  Title: ${detail.title}`);
    console.log(`  Image: ${detail.image ? 'yes' : 'no'}`);
    console.log(`  Video: ${detail.video ? 'yes' : 'no'}`);
    console.log(`  Coords: ${JSON.stringify(detail.coords)}`);

    const typeInfo = TYPE_MAP[link.type] || { group: null, color: '#94a3b8' };

    const feature = {
      type: 'Feature',
      id: id++,
      geometry: {
        type: 'Point',
        coordinates: detail.coords || [3.0, 51.0],
      },
      properties: {
        title: detail.title,
        description: detail.description || '',
        'marker-color': typeInfo.color,
        group: typeInfo.group,
        url: detail.url,
      },
    };

    if (detail.image) feature.properties.image = detail.image;
    if (detail.video) feature.properties.video = detail.video;
    if (detail.description) feature.properties.description = detail.description;

    features.push(feature);
  }

  const geojson = {
    type: 'FeatureCollection',
    features,
  };

  const outPath = '/Users/claude/KVVI/public/data/abc-sportvissen.geojson';
  writeFileSync(outPath, JSON.stringify(geojson, null, 2));
  console.log(`\nDone! Written ${features.length} features to ${outPath}`);
}

main().catch(console.error);
