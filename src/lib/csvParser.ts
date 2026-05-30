import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// We definiëren hoe een visser-resultaat eruit ziet
export interface VisserResultaat {
    naam: string;
    plaats: string;
    gewichten: number[]; // Gewichten per wedstrijd
    totaalGewicht: number;
    vorigeStand: number;
    huidigeStand: number;
    trend: 'stijger' | 'daler' | 'gelijk';
}

export function getWedstrijdData(groep: string, jaar: string): VisserResultaat[] {
    // Pad naar het CSV bestand, bijv: public/data/2024/Zaterdagvissers.csv
    const filePath = path.resolve(`./public/data/${jaar}/${groep}.csv`);
    
    if (!fs.existsSync(filePath)) {
        return [];
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // De CSV parser: we gaan ervan uit dat Numbers puntkomma's of komma's gebruikt
    const records: any[] = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: [',', ';'] 
    });

    return records.map((row: Record<string, string>): VisserResultaat => {
        // Logica voor trendbepaling (simpel voorbeeld op basis van laatste twee wedstrijden)
        const gewichten = Object.keys(row)
            .filter(key => key.includes('W')) // Stel je koppen zijn W1, W2, W3...
            .map(key => parseFloat(row[key]) || 0);

        const huidigeStand = parseInt(row['Stand']) || 0;
        const vorigeStand = parseInt(row['VorigeStand']) || 0;

        let trend: 'stijger' | 'daler' | 'gelijk' = 'gelijk';
        if (huidigeStand < vorigeStand) trend = 'stijger'; // Stand 1 is beter dan 2
        else if (huidigeStand > vorigeStand) trend = 'daler';

        return {
            naam: row['Naam'],
            plaats: row['Plaats'],
            gewichten: gewichten,
            totaalGewicht: parseFloat(row['Totaal']) || 0,
            vorigeStand,
            huidigeStand,
            trend
        };
    });
}