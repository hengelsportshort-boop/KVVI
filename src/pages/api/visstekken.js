export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const GEOJSON_PATH = path.resolve('./public/data/claudedenys-Hengelen-West-Vlaanderen.geojson');

// Functie om unieke marker_id's te genereren
function generateMarkerId() {
  return 'vko' + Math.random().toString(36).substr(2, 9);
}

// Functie om marker_id's te fixen indien nodig
function fixMarkerIds(features) {
  let needsUpdate = false;
  const usedIds = new Set();
  
  features.forEach(feature => {
    const props = feature.properties || {};
    const currentId = props.marker_id;
    
    // Check of deze ID al wordt gebruikt door een andere feature
    if (usedIds.has(currentId)) {
      // Genereer een nieuwe unieke ID
      let newId;
      do {
        newId = generateMarkerId();
      } while (usedIds.has(newId));
      
      props.marker_id = newId;
      needsUpdate = true;
    } else {
      usedIds.add(currentId);
    }
  });
  
  return needsUpdate;
}

// Functie om duplicaten te verwijderen op basis van exacte locatie
function removeDuplicates(features) {
  const seenLocations = new Set();
  const uniqueFeatures = [];
  let removed = 0;
  
  features.forEach(feature => {
    if (feature.geometry?.coordinates) {
      const coords = feature.geometry.coordinates;
      const locationKey = `${coords[0]},${coords[1]}`; // lng,lat als key
      
      if (!seenLocations.has(locationKey)) {
        seenLocations.add(locationKey);
        uniqueFeatures.push(feature);
      } else {
        removed++;
        console.log(`Duplicate gevonden: ${feature.properties?.title || 'Onbekend'} op ${locationKey}`);
      }
    } else {
      uniqueFeatures.push(feature); // Behoud features zonder coördinaten
    }
  });
  
  console.log(`Verwijderd ${removed} duplicaten op basis van locatie, ${uniqueFeatures.length} unieke features over`);
  return uniqueFeatures;
}


function getEtag() {
  try { return 'W/"' + fs.statSync(GEOJSON_PATH).mtimeMs + '"'; } catch { return ''; }
}

export async function GET({ request }) {
  const etag = getEtag();
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304 });
  }
  try {
    const content = fs.readFileSync(GEOJSON_PATH, 'utf-8');
    const data = JSON.parse(content);
    
    let needsUpdate = false;
    if (data.features) {
      if (fixMarkerIds(data.features)) needsUpdate = true;
      
      const originalCount = data.features.length;
      data.features = removeDuplicates(data.features);
      if (data.features.length !== originalCount) needsUpdate = true;
    }
    
    if (needsUpdate) {
      fs.writeFileSync(GEOJSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
    }
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'ETag': etag,
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    
    // Valideer dat het geldige GeoJSON is
    if (!body || !body.features || !Array.isArray(body.features)) {
      return new Response(JSON.stringify({ error: 'Ongeldige GeoJSON data' }), { status: 400 });
    }

    // Fix marker_id's maar bewaar marker-color voor admin
    fixMarkerIds(body.features);

    // Schrijf weg naar bestand
    fs.writeFileSync(GEOJSON_PATH, JSON.stringify(body, null, 2), 'utf-8');
    
    return new Response(JSON.stringify({ success: true, count: body.features.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}