export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const GALLERY_PATH = path.resolve('./public/data/gallery.json');
const FOTOS_HOME_PATH = path.resolve('./public/Fotos Home');
const FOTO_FOTOS_PATH = path.resolve('./public/Foto Fotos');

export async function GET() {
  try {
    let allItems = [];
    const seenFiles = new Set();
    
    // Laad Fotos Home foto's
    try {
      const homeFiles = fs.readdirSync(FOTOS_HOME_PATH)
        .filter(file => /\.(png|jpe?g|webp|gif)$/i.test(file) && !file.includes('_640.'))
        .sort();
      
      const homeItems = homeFiles.map((file, index) => {
        seenFiles.add(file.toLowerCase());
        return {
          id: `home-photo-${index}`,
          src: `/Fotos Home/${encodeURIComponent(file)}`,
          titel: file.replace(/\.(png|jpe?g|webp|gif)$/i, ''),
          zichtbaar: true,
          source: 'Fotos Home'
        };
      });

      allItems.push(...homeItems);
    } catch (error) {
      console.log('Fotos Home map niet gevonden');
    }
    
    // Laad Foto Fotos foto's
    try {
      const fotoFiles = fs.readdirSync(FOTO_FOTOS_PATH)
        .filter(file => /\.(png|jpe?g|webp|gif)$/i.test(file) && !file.includes('_640.'))
        .filter(file => !seenFiles.has(file.toLowerCase())) // Voorkom dubbelen
        .sort();
      
      const fotoItems = fotoFiles.map((file, index) => {
        seenFiles.add(file.toLowerCase());
        return {
          id: `foto-fotos-${index}`,
          src: `/Foto Fotos/${encodeURIComponent(file)}`,
          titel: file.replace(/\.(png|jpe?g|webp|gif)$/i, ''),
          zichtbaar: true,
          source: 'Foto Fotos'
        };
      });
      
      allItems.push(...fotoItems);
    } catch (error) {
      console.log('Foto Fotos map niet gevonden');
    }
    
    // Als er lokale foto's zijn, geef die terug
    if (allItems.length > 0) {
      return new Response(JSON.stringify(allItems), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Fallback naar gallery.json als er geen lokale foto's zijn gevonden
    if (fs.existsSync(GALLERY_PATH)) {
      const content = fs.readFileSync(GALLERY_PATH, 'utf-8');
      const data = JSON.parse(content);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function POST({ request }) {
  try {
    const contentType = request.headers.get('content-type');
    
    // Handle file upload
    if (contentType && contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      
      if (!file) {
        return new Response(JSON.stringify({ error: 'Geen bestand geüpload' }), { status: 400 });
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        return new Response(JSON.stringify({ error: 'Alleen JPG, PNG, WebP en GIF bestanden zijn toegestaan' }), { status: 400 });
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).slice(2, 8);
      const extension = file.name.split('.').pop().toLowerCase();
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}`;
      const filename = `Schermafbeelding ${dateStr} ${timeStr}.${extension}`;
      
      // Save file to Foto Fotos directory
      const filePath = path.join(FOTO_FOTOS_PATH, filename);
      const buffer = await file.arrayBuffer();
      fs.writeFileSync(filePath, new Uint8Array(buffer));
      
      return new Response(JSON.stringify({ 
        success: true, 
        filename: filename,
        message: 'Foto succesvol geüpload'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Handle gallery data update
    const body = await request.json();
    if (!Array.isArray(body)) {
      return new Response(JSON.stringify({ error: 'Ongeldige data: array verwacht' }), { status: 400 });
    }

    const cleaned = body.map(item => ({
      id: item.id || `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      src: String(item.src || '').trim(),
      titel: String(item.titel || '').trim(),
      zichtbaar: item.zichtbaar !== false
    }));

    fs.writeFileSync(GALLERY_PATH, JSON.stringify(cleaned, null, 2), 'utf-8');
    return new Response(JSON.stringify({ success: true, count: cleaned.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function DELETE({ request }) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    
    if (!filename) {
      return new Response(JSON.stringify({ error: 'Geen filename opgegeven' }), { status: 400 });
    }
    
    // Try to find file by exact match first, then by partial match
    let targetFile = null;
    let actualFilename = null;
    
    try {
      const files = fs.readdirSync(FOTO_FOTOS_PATH);
      
      // First try exact match
      targetFile = files.find(file => file === filename);
      if (targetFile) {
        actualFilename = filename;
      } else {
        // Try to find by partial match (handle encoding issues)
        const decodedFilename = decodeURIComponent(filename);
        targetFile = files.find(file => file === decodedFilename);
        if (targetFile) {
          actualFilename = decodedFilename;
        } else {
          // Try to find by removing URL encoding artifacts
          const cleanFilename = filename.replace(/%20/g, ' ').replace(/%2F/g, '/');
          targetFile = files.find(file => file.includes(cleanFilename) || cleanFilename.includes(file));
          if (targetFile) {
            actualFilename = targetFile;
          }
        }
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Kan geen bestanden lezen' }), { status: 500 });
    }
    
    if (!targetFile) {
      return new Response(JSON.stringify({ error: 'Bestand niet gevonden' }), { status: 404 });
    }
    
    const filePath = path.join(FOTO_FOTOS_PATH, actualFilename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return new Response(JSON.stringify({ error: 'Bestand niet gevonden' }), { status: 404 });
    }
    
    // Delete file
    fs.unlinkSync(filePath);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Foto succesvol verwijderd',
      deletedFile: actualFilename
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
