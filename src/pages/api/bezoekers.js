export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const DATA_PATH = path.resolve('./public/data/bezoekers.json');

export async function GET({ request }) {
  try {
    let data = { count: 0 };
    try {
      const raw = fs.readFileSync(DATA_PATH, 'utf-8');
      data = JSON.parse(raw);
    } catch {}

    // Admin visits niet tellen
    const cookies = request.headers.get('cookie') || '';
    const adminKey = process.env.ADMIN_KEY;
    const isAdmin = adminKey && cookies.split(';').some(c => {
      const parts = c.trim().split('=');
      return parts[0] === 'admin_token' && parts[1] === adminKey;
    });

    if (!isAdmin) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      const now = Date.now();

      let visits = {};
      try {
        const v = fs.readFileSync(DATA_PATH.replace('.json', '-ips.json'), 'utf-8');
        visits = JSON.parse(v);
      } catch {}

      const lastVisit = visits[ip] || 0;
      if (now - lastVisit > 3600000) {
        data.count += 1;
        visits[ip] = now;
        fs.writeFileSync(DATA_PATH, JSON.stringify(data), 'utf-8');
        fs.writeFileSync(DATA_PATH.replace('.json', '-ips.json'), JSON.stringify(visits), 'utf-8');
      }
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ count: 0 }), { status: 200 });
  }
}
