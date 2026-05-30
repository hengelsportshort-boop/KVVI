import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export function laadWedstrijdData(jaar: string, groep: string) {
  const csvPad = path.resolve(`./public/data/${jaar}/${groep}.csv`);
  if (!fs.existsSync(csvPad)) return { headers: [], data: [] };
  
  const content = fs.readFileSync(csvPad, 'utf-8');
  const rows = parse(content, { delimiter: ';', skip_empty_lines: true, trim: true });

  // De eerste rij bevat de datums (vanaf index 2 tot voorlaatste kolom)
  const headers = rows[0].slice(2, -2).filter((h: string) => h !== "");
  const dataRows = rows.slice(1);

  const data = dataRows
    .filter((row: string[]) => row[0] && !isNaN(parseInt(row[0])))
    .map((row: string[]) => {
      const schoonGetal = (w: string) => {
        if (!w || w === '--') return "0";
        return w.replace(' gr', '').trim();
      };

      return {
        stand: row[0],
        naam: row[1],
        // Pak de resultaten van de datums
        wedstrijden: row.slice(2, 2 + headers.length).map(w => schoonGetal(w)),
        totaal: schoonGetal(row[row.length - 2])
      };
    });

  return { headers, data };
}