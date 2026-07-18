import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';

const DATA_DIR = resolve('./public/data');

const FILES = [
  'wedstrijdkalender.json',
  'tips-tricks.json',
  'hengelshop.json',
  'gallery.json',
  'legende.json',
  'hengelmap.csv',
  'bezoekers.json',
  ['2026', 'Veteranen.csv'],
  ['2026', 'Zaterdagvissers.csv'],
  ['specials', '2026.json'],
  ['kamp-izegem', '2026.json'],
  ['vrouwvissing', '2026.json'],
  ['seniorenvissing', '2026.json'],
];

export async function GET() {
  const data = {};
  for (const file of FILES) {
    const filePath = join(DATA_DIR, ...(Array.isArray(file) ? file : [file]));
    try {
      if (statSync(filePath).isFile()) {
        data[Array.isArray(file) ? file.join('/') : file] = readFileSync(filePath, 'utf-8');
      }
    } catch {}
  }
  return new Response(JSON.stringify(data, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
