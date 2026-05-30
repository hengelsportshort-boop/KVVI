import { readFileSync } from 'fs';
import path from 'path';

const GEOJSON_PATH = path.resolve('./public/data/fisheries.geojson');

function getEtag() {
  try { return 'W/"' + readFileSync(GEOJSON_PATH).length + '"'; } catch { return ''; }
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
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'ETag': etag,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
