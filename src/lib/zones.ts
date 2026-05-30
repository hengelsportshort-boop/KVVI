/**
 * MODULE 1 — ZONE SYSTEM (GEOGRAFIE LOGICA)
 * 
 * Verdeelt BE/NL/UK in vaste viszones op basis van lat/lon.
 * Elke visstek krijgt 1 vaste zone toegewezen via polygon detection.
 */

export type ZoneId = 'A' | 'B' | 'C' | 'D' | 'UK';

export interface ZoneInfo {
  id: ZoneId;
  name: string;
  description: string;
  countries: string[];
}

export const ZONE_INFO: Record<ZoneId, ZoneInfo> = {
  A: {
    id: 'A',
    name: 'Noord Nederland',
    description: 'Friesland, Groningen, Drenthe, Noord-Holland noord',
    countries: ['NL']
  },
  B: {
    id: 'B',
    name: 'Midden Nederland',
    description: 'Utrecht, Gelderland, Zuid-Holland, Flevoland, NB noord',
    countries: ['NL']
  },
  C: {
    id: 'C',
    name: 'Zuid NL + België',
    description: 'Limburg NL, Noord-Brabant zuid, volledige België',
    countries: ['NL', 'BE']
  },
  D: {
    id: 'D',
    name: 'Zuidelijke overgang',
    description: 'Zuid België + grens richting Frankrijk',
    countries: ['BE', 'FR']
  },
  UK: {
    id: 'UK',
    name: 'Verenigd Koninkrijk',
    description: 'Engeland, Wales, Schotland',
    countries: ['GB', 'UK']
  }
};

/**
 * Punten-in-polygoon test (ray casting algorithm).
 * Bepaalt of een punt (lat, lon) binnen een polygoon valt.
 */
function pointInPolygon(lat: number, lon: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Zone polygonen (vereenvoudigde bounding boxes + polygonen).
 * Deze definiëren de geografische grenzen van elke zone.
 * 
 * Notatie: [lng, lat] (let op: longitude eerst voor GeoJSON compatibiliteit)
 */
const ZONE_POLYGONS: Record<ZoneId, [number, number][]> = {
  // Zone A: Noord-Nederland (Friesland, Groningen, Drenthe, Noord-Holland noord)
  A: [
    [4.0, 53.6], [6.0, 53.6], [7.2, 53.2], [7.2, 52.8],
    [6.0, 52.5], [5.0, 52.3], [4.5, 52.5], [4.0, 52.7],
    [4.0, 53.6]
  ],

  // Zone B: Midden-Nederland
  B: [
    [4.0, 52.7], [4.5, 52.5], [5.0, 52.3], [6.0, 52.5],
    [7.2, 52.8], [7.2, 52.3], [6.5, 51.8], [5.8, 51.4],
    [4.5, 51.5], [3.5, 51.8], [3.5, 52.3], [4.0, 52.7]
  ],

  // Zone C: Zuid-NL + België
  C: [
    [2.5, 51.5], [4.5, 51.5], [5.8, 51.4], [6.5, 51.8],
    [7.2, 52.3], [7.2, 51.5], [6.0, 51.0], [5.0, 50.5],
    [4.0, 50.0], [3.0, 49.5], [2.5, 49.8], [2.5, 51.5]
  ],

  // Zone D: Zuid-België + grens Frankrijk
  D: [
    [2.5, 49.8], [3.0, 49.5], [4.0, 50.0], [5.0, 50.5],
    [6.0, 51.0], [6.5, 50.5], [6.0, 49.5], [5.0, 49.0],
    [4.0, 49.0], [2.5, 49.8]
  ],

  // Zone UK: Verenigd Koninkrijk (grove bounding box)
  UK: [
    [-6.0, 51.0], [-6.5, 53.0], [-5.0, 55.0], [-3.0, 56.0],
    [-1.0, 55.0], [1.5, 53.0], [1.5, 51.0], [0.5, 50.0],
    [-1.0, 49.5], [-3.0, 49.5], [-4.5, 50.0], [-6.0, 51.0]
  ]
};

/**
 * Bepaal de zone voor een gegeven lat/lon coördinaat.
 */
export function getZone(lat: number, lon: number): ZoneId {
  // Snelle bounding box check voor UK eerst (meest westelijk)
  // UK bounding box: minLon=-6.5, maxLon=2.0, minLat=49.5, maxLat=56.0
  if (lon < 2.0 && lon > -6.5 && lat > 49.5 && lat < 56.0) {
    if (pointInPolygon(lat, lon, ZONE_POLYGONS.UK)) return 'UK';
  }

  // Controleer zones A, B, C, D in volgorde
  // Eerst ruwe bounding box check voor NL/BE
  if (lon > 2.0 && lon < 7.5 && lat > 49.0 && lat < 53.6) {
    if (pointInPolygon(lat, lon, ZONE_POLYGONS.D)) return 'D';
    if (pointInPolygon(lat, lon, ZONE_POLYGONS.C)) return 'C';
    if (pointInPolygon(lat, lon, ZONE_POLYGONS.A)) return 'A';
    if (pointInPolygon(lat, lon, ZONE_POLYGONS.B)) return 'B';
  }

  // Fallback: bepaal op basis van landcode-achtige logica
  if (lat > 52.5) return 'A';  // Noordelijk
  if (lat > 51.5) return 'B';  // Midden
  if (lat > 50.0) return 'C';  // Zuidelijk
  if (lat > 49.0) return 'D';  // Verder zuid
  return 'C'; // Default
}

/**
 * Krijg de zone voor een GeoJSON feature op basis van zijn coördinaten.
 */
export function getZoneFromFeature(feature: any): ZoneId | null {
  if (!feature || !feature.geometry || !feature.geometry.coordinates) return null;
  
  const coords = feature.geometry.coordinates;
  // GeoJSON Point: [lng, lat]
  if (feature.geometry.type === 'Point') {
    return getZone(coords[1], coords[0]);
  }
  // Voor andere geometry types, gebruik het centroid
  if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
    // Polygon of MultiLineString
    let sumLat = 0, sumLng = 0, count = 0;
    for (const ring of coords) {
      for (const [lng, lat] of ring) {
        sumLat += lat;
        sumLng += lng;
        count++;
      }
    }
    if (count > 0) return getZone(sumLat / count, sumLng / count);
  }
  return null;
}

// Minimale GeoJSON types voor eigen gebruik
interface ZoneFeature {
  type: 'Feature';
  properties: {
    zoneId: string;
    name: string;
    description: string;
  };
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
}

interface ZoneFeatureCollection {
  type: 'FeatureCollection';
  features: ZoneFeature[];
}

/**
 * GeoJSON feature collection met zone polygonen voor weergave op de kaart.
 */
export function getZoneGeoJSON(): ZoneFeatureCollection {
  const features: ZoneFeature[] = [];
  
  for (const [zoneId, polygon] of Object.entries(ZONE_POLYGONS)) {
    const info = ZONE_INFO[zoneId as ZoneId];
    // Sluit de polygoon
    const closedPolygon = [...polygon];
    if (closedPolygon[0][0] !== closedPolygon[closedPolygon.length - 1][0] ||
        closedPolygon[0][1] !== closedPolygon[closedPolygon.length - 1][1]) {
      closedPolygon.push(closedPolygon[0]);
    }
    
    features.push({
      type: 'Feature',
      properties: {
        zoneId,
        name: info.name,
        description: info.description
      },
      geometry: {
        type: 'Polygon',
        coordinates: [closedPolygon]
      }
    });
  }
  
  return {
    type: 'FeatureCollection',
    features
  };
}