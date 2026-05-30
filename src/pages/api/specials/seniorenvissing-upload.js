export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const UPLOAD_DIR = path.resolve('./public/images/senioren');

export async function POST({ request }) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file) {
        return new Response(JSON.stringify({ error: 'Geen bestand geüpload' }), { status: 400 });
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        return new Response(JSON.stringify({ error: 'Alleen JPG, PNG, WebP en GIF bestanden zijn toegestaan' }), { status: 400 });
      }

      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }

      const ext = file.name.split('.').pop().toLowerCase();
      const timestamp = Date.now();
      const random = Math.random().toString(36).slice(2, 6);
      const filename = `senioren-${timestamp}-${random}.${ext}`;
      const filePath = path.join(UPLOAD_DIR, filename);
      const buffer = await file.arrayBuffer();
      fs.writeFileSync(filePath, new Uint8Array(buffer));

      return new Response(JSON.stringify({
        success: true,
        url: `/images/senioren/${filename}`,
        message: 'Foto succesvol geüpload'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Ongeldig verzoek' }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
