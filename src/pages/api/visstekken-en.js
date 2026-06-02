import { readFileSync, writeFileSync, statSync } from 'fs';
import path from 'path';

const GEOJSON_PATH = path.resolve('./public/data/fisheries.geojson');

function getEtag() {
  try { return 'W/"' + statSync(GEOJSON_PATH).mtimeMs + '"'; } catch { return ''; }
}

export async function GET({ request }) {
  const etag = getEtag();
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304 });
  }
  try {
    const raw = readFileSync(GEOJSON_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, no-cache',
        'ETag': etag,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}

export async function POST({ request }) {
  try {
    const body = await request.json();

    if (body.type !== 'FeatureCollection' || !Array.isArray(body.features)) {
      return new Response(JSON.stringify({ error: 'Invalid GeoJSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    writeFileSync(GEOJSON_PATH, JSON.stringify(body, null, 2), 'utf-8');
    return new Response(JSON.stringify({ success: true, count: body.features.length }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
