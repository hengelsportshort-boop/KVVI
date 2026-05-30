import fs from 'node:fs';
import path from 'node:path';

export interface Wedstrijd {
  id: string;
  datum: string;
  dag: string;
  reeks: string;
}

const KALENDER_FILE = path.resolve('./public/data/wedstrijdkalender.json');

// Initialize the kalender file if it doesn't exist
function initKalenderFile() {
  if (!fs.existsSync(KALENDER_FILE)) {
    const defaultWedstrijden: Wedstrijd[] = [
      { id: '1', datum: '18/01', dag: 'Zaterdag', reeks: 'Reeks 1' },
      { id: '2', datum: '25/01', dag: 'Zaterdag', reeks: 'Reeks 2' },
      { id: '3', datum: '01/02', dag: 'Zaterdag', reeks: 'Reeks 3' },
      { id: '4', datum: '08/02', dag: 'Zaterdag', reeks: 'Reeks 4' },
      { id: '5', datum: '15/02', dag: 'Zaterdag', reeks: 'Reeks 5' },
      { id: '6', datum: '22/02', dag: 'Zaterdag', reeks: 'Reeks 6' },
      { id: '7', datum: '01/03', dag: 'Zaterdag', reeks: 'Reeks 7' },
      { id: '8', datum: '08/03', dag: 'Zaterdag', reeks: 'Reeks 8' },
      { id: '9', datum: '15/03', dag: 'Zaterdag', reeks: 'Reeks 9' },
      { id: '10', datum: '22/03', dag: 'Zaterdag', reeks: 'Reeks 10' },
      { id: '11', datum: '29/03', dag: 'Zaterdag', reeks: 'Reeks 11' },
      { id: '12', datum: '05/04', dag: 'Zaterdag', reeks: 'Reeks 12' },
      { id: '13', datum: '12/04', dag: 'Zaterdag', reeks: 'Koppelwedstrijd 1' },
      { id: '14', datum: '19/04', dag: 'Zaterdag', reeks: 'Reeks 13' },
      { id: '15', datum: '26/04', dag: 'Zaterdag', reeks: 'Reeks 14' },
      { id: '16', datum: '03/05', dag: 'Zaterdag', reeks: 'Reeks 15' },
      { id: '17', datum: '10/05', dag: 'Zaterdag', reeks: 'Reeks 16' },
      { id: '18', datum: '17/05', dag: 'Zaterdag', reeks: 'Koppelwedstrijd 2' },
      { id: '19', datum: '24/05', dag: 'Zaterdag', reeks: 'Reeks 17' },
      { id: '20', datum: '31/05', dag: 'Zaterdag', reeks: 'Reeks 18' },
      { id: '21', datum: '07/06', dag: 'Zaterdag', reeks: 'Reeks 19' },
      { id: '22', datum: '14/06', dag: 'Zaterdag', reeks: 'Reeks 20' },
      { id: '23', datum: '21/06', dag: 'Zaterdag', reeks: 'Reeks 21' },
      { id: '24', datum: '28/06', dag: 'Zaterdag', reeks: 'Reeks 22' },
      { id: '25', datum: '05/07', dag: 'Zaterdag', reeks: 'Reeks 23' },
      { id: '26', datum: '12/07', dag: 'Zaterdag', reeks: 'Reeks 24' },
      { id: '27', datum: '19/07', dag: 'Zaterdag', reeks: 'Reeks 25' },
      { id: '28', datum: '26/07', dag: 'Zaterdag', reeks: 'Reeks 26' },
      { id: '29', datum: '02/08', dag: 'Zaterdag', reeks: 'Reeks 27' },
      { id: '30', datum: '09/08', dag: 'Zaterdag', reeks: 'Reeks 28' },
      { id: '31', datum: '16/08', dag: 'Zaterdag', reeks: 'Reeks 29' },
      { id: '32', datum: '23/08', dag: 'Zaterdag', reeks: 'Reeks 30' },
      { id: '33', datum: '30/08', dag: 'Zaterdag', reeks: 'Reeks 31' },
      { id: '34', datum: '06/09', dag: 'Zaterdag', reeks: 'Reeks 32' },
      { id: '35', datum: '13/09', dag: 'Zaterdag', reeks: 'Reeks 33' },
      { id: '36', datum: '20/09', dag: 'Zaterdag', reeks: 'Reeks 34' },
      { id: '37', datum: '27/09', dag: 'Zaterdag', reeks: 'Reeks 35' },
      { id: '38', datum: '04/10', dag: 'Zaterdag', reeks: 'Reeks 36' },
      { id: '39', datum: '11/10', dag: 'Zaterdag', reeks: 'Reeks 37' },
      { id: '40', datum: '18/10', dag: 'Zaterdag', reeks: 'Reeks 38' },
      { id: '41', datum: '25/10', dag: 'Zaterdag', reeks: 'Reeks 39' },
      { id: '42', datum: '01/11', dag: 'Zaterdag', reeks: 'Reeks 40' },
      { id: '43', datum: '08/11', dag: 'Zaterdag', reeks: 'Reeks 41' },
      { id: '44', datum: '15/11', dag: 'Zaterdag', reeks: 'Reeks 42' },
      { id: '45', datum: '22/11', dag: 'Zaterdag', reeks: 'Reeks 43' },
      { id: '46', datum: '29/11', dag: 'Zaterdag', reeks: 'Reeks 44' },
      { id: '47', datum: '06/12', dag: 'Zaterdag', reeks: 'Reeks 45' },
      { id: '48', datum: '13/12', dag: 'Zaterdag', reeks: 'Reeks 46' },
      { id: '49', datum: '20/12', dag: 'Zaterdag', reeks: 'Reeks 47' },
      { id: '50', datum: '27/12', dag: 'Zaterdag', reeks: 'Reeks 48' },
    ];
    
    fs.writeFileSync(KALENDER_FILE, JSON.stringify(defaultWedstrijden, null, 2));
  }
}

export function getWedstrijden(): Wedstrijd[] {
  initKalenderFile();
  
  try {
    const data = fs.readFileSync(KALENDER_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading wedstrijden:', error);
    return [];
  }
}

export function addWedstrijd(wedstrijd: Omit<Wedstrijd, 'id'>): Wedstrijd {
  const wedstrijden = getWedstrijden();
  const newWedstrijd: Wedstrijd = {
    ...wedstrijd,
    id: Date.now().toString()
  };
  
  wedstrijden.push(newWedstrijd);
  saveWedstrijden(wedstrijden);
  
  return newWedstrijd;
}

export function updateWedstrijd(id: string, updates: Partial<Wedstrijd>): Wedstrijd | null {
  const wedstrijden = getWedstrijden();
  const index = wedstrijden.findIndex(w => w.id === id);
  
  if (index === -1) return null;
  
  wedstrijden[index] = { ...wedstrijden[index], ...updates };
  saveWedstrijden(wedstrijden);
  
  return wedstrijden[index];
}

export function deleteWedstrijd(id: string): boolean {
  const wedstrijden = getWedstrijden();
  const index = wedstrijden.findIndex(w => w.id === id);
  
  if (index === -1) return false;
  
  wedstrijden.splice(index, 1);
  saveWedstrijden(wedstrijden);
  
  return true;
}

function saveWedstrijden(wedstrijden: Wedstrijd[]): void {
  try {
    fs.writeFileSync(KALENDER_FILE, JSON.stringify(wedstrijden, null, 2));
  } catch (error) {
    console.error('Error saving wedstrijden:', error);
  }
}
