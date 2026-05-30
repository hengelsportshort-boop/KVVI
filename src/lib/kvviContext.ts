import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

interface Visplaats {
  naam: string;
  lat: string;
  lng: string;
  type: string;
  link: string;
}

interface WedstrijdData {
  groep: string;
  jaar: string;
  headers: string[];
  data: string[][];
  ruweData: string;
}

/**
 * Laadt alle visplaatsen uit hengelmap.csv
 */
export function laadVisplaatsen(): Visplaats[] {
  const csvPad = path.resolve('./public/data/hengelmap.csv');
  if (!fs.existsSync(csvPad)) return [];

  const content = fs.readFileSync(csvPad, 'utf-8');
  const records: any[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';'
  });

  return records.map((row: any) => ({
    naam: row['naam'],
    lat: row['lat'],
    lng: row['lng'],
    type: row['type'],
    link: row['link']
  }));
}

/**
 * Laadt de ruwe CSV-data van een wedstrijdgroep en geeft deze als tekst terug
 */
export function laadWedstrijdRuw(jaar: string, groep: string): WedstrijdData | null {
  const csvPad = path.resolve(`./public/data/${jaar}/${groep}.csv`);
  if (!fs.existsSync(csvPad)) return null;

  const content = fs.readFileSync(csvPad, 'utf-8');
  const rows = parse(content, { 
    delimiter: [';', ','], 
    skip_empty_lines: true, 
    trim: true,
    relax_column_count: true  // Sta variërende aantallen kolommen toe
  });

  const headers = rows[0] || [];
  const data = rows.slice(1) || [];

  return {
    groep,
    jaar,
    headers,
    data,
    ruweData: content
  };
}

/**
 * Bouwt een context-blok over KVVI algemeen
 */
export function bouwKVVIAlgemeneContext(): string {
  return `
=== ALGEMENE INFORMATIE OVER KVVI ===
Naam: Koninklijke Vrije Vissers Izegem (KVVI)
Locatie: Izegem, West-Vlaanderen, België
Website: deze site (KVVI Izegem)
Discipline: Hengelsport (wedstrijdvissen op voorn en witvis)

Wedstrijdgroepen (seizoen 2026):
1. Zaterdagvissers - vissen op zaterdag
2. Veteranen - vissen op vrijdag

Data beschikbaar op de site:
- Wedstrijduitslagen per groep (CSV-bestanden met datums, gewichten per visser, standen)
- Visplaatsenkaart (hengelmap met locaties zoals Clubvijver, Kanaal, Blankaart, Gaverbeek)
- GeoJSON met viswateren in West-Vlaanderen
- Vistabel 2026 met extra wedstrijdgegevens
`.trim();
}

/**
 * Bouwt context over de visplaatsen
 */
export function bouwVisplaatsenContext(): string {
  const plaatsen = laadVisplaatsen();
  if (plaatsen.length === 0) return "Geen visplaatsen gevonden.";

  let context = "=== VISPLAATSEN (HENGELMAP) ===\n";
  plaatsen.forEach((p, i) => {
    context += `${i + 1}. ${p.naam} (${p.type}) - Coördinaten: ${p.lat}, ${p.lng}\n`;
  });

  return context;
}

/**
 * Bouwt context voor alle wedstrijdgroepen in een bepaald jaar
 */
export function bouwWedstrijdContext(jaar: string = "2026"): string {
  const groepen = ["Zaterdagvissers", "Veteranen"];
  let context = `=== WEDSTRIJDUITSLAGEN SEIZOEN ${jaar} ===\n\n`;

  for (const groep of groepen) {
    const data = laadWedstrijdRuw(jaar, groep);
    if (data) {
      context += `--- ${groep} (${jaar}) ---\n`;
      context += `Kolomkoppen: ${data.headers.join(' | ')}\n`;
      context += `Aantal deelnemers: ${data.data.filter((r: string[]) => r[0] && !isNaN(parseInt(r[0]))).length}\n`;
      
      // Maak een samenvatting van top 5
      const deelnemers = data.data.filter((r: string[]) => r[0] && !isNaN(parseInt(r[0])));
      const top5 = deelnemers.slice(0, 5);
      
      context += "\nTop 5 stand:\n";
      top5.forEach((row: string[]) => {
        const stand = row[0];
        const naam = row[1];
        const wedstrijden = row.slice(2, -2).filter(w => w && w !== '--' && w !== '');
        const totaal = row[row.length - 2] || '0';
        context += `  #${stand} ${naam} - Totaal: ${totaal} (${wedstrijden.length} wedstrijden gespeeld)\n`;
      });
      context += "\n";
    }
  }

  return context;
}

/**
 * Bouwt de volledige KVVI-context
 */
export function bouwVolledigeContext(): string {
  const delen: string[] = [
    bouwKVVIAlgemeneContext(),
    bouwVisplaatsenContext(),
    bouwWedstrijdContext("2026")
  ];

  return delen.join('\n\n');
}