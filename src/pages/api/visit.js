export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const LOG_PATH = path.resolve('./public/data/visits.json');

function leesLog() {
  try {
    if (fs.existsSync(LOG_PATH)) {
      return JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'));
    }
  } catch {}
  return { total: 0, today: 0, lastDate: '', byCountry: {} };
}

function schrijfLog(data) {
  fs.writeFileSync(LOG_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Eenvoudige GeoIP lookup via ip-api.com
async function lookupCountry(ip) {
  try {
    // Alleen externe IP's, niet localhost
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || !ip) return 'Lokaal';
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode`, { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    return data.country || 'Onbekend';
  } catch {
    return 'Onbekend';
  }
}

export async function POST({ request, clientAddress }) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || clientAddress || 'unknown';
    const log = leesLog();
    const today = new Date().toISOString().split('T')[0];

    // Reset dagtelling als het een nieuwe dag is
    if (log.lastDate !== today) {
      log.today = 0;
      log.lastDate = today;
    }

    log.total += 1;
    log.today += 1;

    // Land lookup (alleen 1x per dag per IP bijhouden is te complex, dus we loggen gewoon)
    // We gebruiken een eenvoudige benadering: land opzoeken en tellen
    const country = await lookupCountry(ip);
    log.byCountry[country] = (log.byCountry[country] || 0) + 1;

    schrijfLog(log);

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false }), { status: 200 });
  }
}

export async function GET() {
  try {
    const log = leesLog();
    return new Response(JSON.stringify(log), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function DELETE() {
  try {
    const empty = { total: 0, today: 0, lastDate: '', byCountry: {} };
    schrijfLog(empty);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}