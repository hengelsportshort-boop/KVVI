export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DATA_DIR = path.resolve('./public/data');

export async function GET() {
  try {
    const tmpFile = '/tmp/kvvi-backup.tar.gz';
    const parentDir = path.dirname(DATA_DIR);
    const dirName = path.basename(DATA_DIR);

    execFileSync('tar', ['-czf', tmpFile, '-C', parentDir, dirName]);

    const data = fs.readFileSync(tmpFile);
    fs.unlinkSync(tmpFile);

    const date = new Date().toISOString().split('T')[0];
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="kvvi-data-${date}.tar.gz"`
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
