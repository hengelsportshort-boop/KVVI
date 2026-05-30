export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const LEGENDE_MAP = {
  439529756:   { naam: 'Polderrivier',          kleur: '#3cc954' },
  1622341650:  { naam: 'Rivier',                kleur: '#2a4ea1' },
  3:           { naam: 'Kanaal',                kleur: '#ffcc00' },
  4:           { naam: 'Commercial',            kleur: '#e32c31' },
  5:           { naam: 'Karpervijver (nachtvissen)', kleur: '#1b8893' },
  6:           { naam: 'Vliegvissen',           kleur: '#b63681' },
  7:           { naam: 'Forellenvijver',        kleur: '#94a3b8' },
  1779093358120: { naam: 'Opmerkingen',        kleur: '#0bf4e4' },
  1779096235992: { naam: 'Vijvers, wachtkommen, ...', kleur: '#f5d5a8' },
  8:           { naam: 'ABC Algemeen',          kleur: '#000080' },
  1779694467153: { naam: 'Vakantiewoning',          kleur: '#b1b6fb' },
};

export function getTypeName(groupId) {
  const entry = LEGENDE_MAP[groupId];
  return entry ? entry.naam : 'Onbekend';
}

export function getTypeColor(groupId) {
  const entry = LEGENDE_MAP[groupId];
  return entry ? entry.kleur : '#94a3b8';
}

export function filterFeaturesByRadius(features, centerLat, centerLng, radiusKm) {
  return features.filter(f => {
    if (!f.geometry || f.geometry.type !== 'Point') return false;
    const [lng, lat] = f.geometry.coordinates;
    const dist = haversineDistance(centerLat, centerLng, lat, lng);
    return dist <= radiusKm;
  }).map(f => ({
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    title: f.properties?.title || 'Onbekend',
    marker_id: f.properties?.marker_id || '',
    type: getTypeName(f.properties?.group),
  }));
}

const BEKENDE_PLAATSEN = {
  'brugge': { lat: 51.2093, lng: 3.2247 },
  'gent': { lat: 51.0543, lng: 3.7174 },
  'oostende': { lat: 51.2154, lng: 2.9274 },
  'roeselare': { lat: 50.9448, lng: 3.1227 },
  'kortrijk': { lat: 50.8279, lng: 3.2649 },
  'ieper': { lat: 50.8514, lng: 2.8850 },
  'izegem': { lat: 50.9180, lng: 3.2137 },
  'torhout': { lat: 51.0649, lng: 3.1019 },
  'waregem': { lat: 50.8882, lng: 3.4315 },
  'menen': { lat: 50.7969, lng: 3.1208 },
  'wevelgem': { lat: 50.8090, lng: 3.1847 },
  'tielt': { lat: 51.0001, lng: 3.3269 },
  'veurne': { lat: 51.0728, lng: 2.6626 },
  'diksmuide': { lat: 51.0332, lng: 2.8643 },
  'poperinge': { lat: 50.8554, lng: 2.7264 },
  'nieuwpoort': { lat: 51.1295, lng: 2.7513 },
  'blankenberge': { lat: 51.3133, lng: 3.1321 },
  'bredene': { lat: 51.2470, lng: 2.9774 },
  'de panne': { lat: 51.1011, lng: 2.5884 },
  'knokke': { lat: 51.3349, lng: 3.2879 },
  'knokke-heist': { lat: 51.3349, lng: 3.2879 },
  'middelkerke': { lat: 51.1850, lng: 2.8172 },
  'koksijde': { lat: 51.1189, lng: 2.6376 },
  'de haan': { lat: 51.2739, lng: 3.0340 },
  'zeebrugge': { lat: 51.3315, lng: 3.2074 },
  'dudzele': { lat: 51.2742, lng: 3.2282 },
  'loppem': { lat: 51.1531, lng: 3.1962 },
  'beernem': { lat: 51.1409, lng: 3.3345 },
  'damme': { lat: 51.2515, lng: 3.2812 },
  'oostkamp': { lat: 51.1543, lng: 3.2361 },
  'zedelgem': { lat: 51.1448, lng: 3.1218 },
  'lichtevelde': { lat: 51.0279, lng: 3.1486 },
  'hooglede': { lat: 50.9819, lng: 3.0068 },
  'gits': { lat: 50.9973, lng: 3.0966 },
  'staden': { lat: 50.9752, lng: 3.0144 },
  'moorslede': { lat: 50.8900, lng: 3.0666 },
  'ledegem': { lat: 50.8569, lng: 3.1243 },
  'wevelgem': { lat: 50.8090, lng: 3.1847 },
  'harelbeke': { lat: 50.8540, lng: 3.3125 },
  'kuurne': { lat: 50.8520, lng: 3.2804 },
  'zwevegem': { lat: 50.8119, lng: 3.3385 },
  'deerlijk': { lat: 50.8520, lng: 3.3568 },
  'waregem': { lat: 50.8882, lng: 3.4315 },
  'wielsbeke': { lat: 50.9094, lng: 3.3716 },
  'dentergem': { lat: 50.9625, lng: 3.4167 },
  'ingelmunster': { lat: 50.9180, lng: 3.2600 },
  'meulebeke': { lat: 50.9511, lng: 3.2882 },
  'oostrozebeke': { lat: 50.9192, lng: 3.3379 },
  'wervik': { lat: 50.7807, lng: 3.0398 },
  'geluwe': { lat: 50.8113, lng: 3.0786 },
  'zandvoorde': { lat: 50.8128, lng: 2.9815 },
  'passendale': { lat: 50.9003, lng: 2.9981 },
  'zonnebeke': { lat: 50.8725, lng: 2.9850 },
  'langemark': { lat: 50.9137, lng: 2.9206 },
  'houthulst': { lat: 50.9767, lng: 2.9483 },
  'koekelare': { lat: 51.0901, lng: 2.9791 },
  'kortemark': { lat: 51.0293, lng: 3.0417 },
  'ichtegem': { lat: 51.0937, lng: 3.0159 },
  'gistel': { lat: 51.1552, lng: 2.9646 },
  'jabbeke': { lat: 51.1821, lng: 3.0945 },
  'oudenburg': { lat: 51.1847, lng: 3.0038 },
  'alveringem': { lat: 51.0118, lng: 2.7115 },
  'lo-reninge': { lat: 50.9806, lng: 2.7702 },
  'vleteren': { lat: 50.9077, lng: 2.7385 },
};

const geoCache = new Map();

async function geocodeWithNominatim(placeName) {
  const key = placeName.toLowerCase().trim();
  if (geoCache.has(key)) return geoCache.get(key);

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1&accept-language=nl`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'KVVI-HengelAssistent/1.0 (https://kvvi.be)',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.length) {
      geoCache.set(key, null);
      return null;
    }
    const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    geoCache.set(key, result);
    await sleep(1100);
    return result;
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function parseLocatieQuery(query) {
  const q = query.toLowerCase().trim();
  const kmMatch = q.match(/(\d+)\s*km/);
  const radius = kmMatch ? parseInt(kmMatch[1], 10) : 10;

  const plaatsKeys = Object.keys(BEKENDE_PLAATSEN);
  for (const key of plaatsKeys) {
    if (q.includes(key)) {
      const coord = BEKENDE_PLAATSEN[key];
      return { plaats: key, lat: coord.lat, lng: coord.lng, radius };
    }
  }

  // Strip bekende locatie-keywords en extraheer plaatsnaam
  const locKw = ['zoek', 'vind', 'rondom', 'rond', 'nabij', 'in de buurt van', 'tegen', 'in', 'bij'];
  let cleaned = q;
  for (const kw of locKw.sort((a, b) => b.length - a.length)) {
    cleaned = cleaned.replace(new RegExp('\\b' + kw.replace(/ /g, '\\s+') + '\\s+', 'gi'), '');
  }
  cleaned = cleaned.trim();

  const kmPlaats = cleaned.match(/^(.+?)\s+(\d+)\s*km\s*$/);
  const alleenPlaats = cleaned.match(/^(.+?)$/);

  let plaatsNaam = null;
  if (kmPlaats) {
    plaatsNaam = kmPlaats[1].trim();
  } else if (alleenPlaats && q.match(/\b(?:km|kilometer|zoek|vind|rond|rondom|nabij|in de buurt)\b/i)) {
    plaatsNaam = alleenPlaats[1].trim();
  }

  if (!plaatsNaam || plaatsNaam.length < 2) return null;
  if (plaatsNaam.endsWith(' km')) plaatsNaam = plaatsNaam.slice(0, -3).trim();
  if (plaatsNaam.endsWith('km')) plaatsNaam = plaatsNaam.slice(0, -2).trim();
  if (!plaatsNaam) return null;

  const coord = await geocodeWithNominatim(plaatsNaam);
  if (!coord) return null;
  return { plaats: plaatsNaam, lat: coord.lat, lng: coord.lng, radius };
}
