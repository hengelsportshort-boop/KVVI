export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';
import { getGalleryItems } from '../../lib/gallery';

const GALLERY_PATH = path.resolve('./public/data/gallery.json');
const FOTO_FOTOS_PATH = path.resolve('./public/Foto Fotos');
const UPLOADS_PATH = path.resolve('./public/data/uploads');
const HOME_UPLOADS_PATH = path.resolve('./public/data/home-uploads');

export async function GET() {
  try {
    const items = getGalleryItems();
    return new Response(JSON.stringify(items), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
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
      const category = formData.get('category') || 'fotos';
      
      if (!file) {
        return new Response(JSON.stringify({ error: 'Geen bestand geüpload' }), { status: 400 });
      }
      
      // Validate file type (check MIME + extension as fallback)
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
      const extension = file.name.split('.').pop().toLowerCase();
      if (!allowedMimes.includes(file.type) && !allowedExts.includes(extension)) {
        return new Response(JSON.stringify({ error: 'Alleen JPG, PNG, WebP en GIF bestanden zijn toegestaan' }), { status: 400 });
      }
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}`;
      const filename = `Schermafbeelding ${dateStr} ${timeStr}.${extension}`;
      
      // Determine target directory
      const targetDir = category === 'home' ? HOME_UPLOADS_PATH : UPLOADS_PATH;
      
      // Save file to persistent uploads directory (survives deploys)
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const filePath = path.join(targetDir, filename);
      const buffer = await file.arrayBuffer();
      fs.writeFileSync(filePath, new Uint8Array(buffer));

      // Voeg toe aan gallery.json zodat de foto zichtbaar is op de publieke pagina's
      const srcPath = category === 'home'
        ? `/data/home-uploads/${encodeURIComponent(filename)}`
        : `/data/uploads/${encodeURIComponent(filename)}`;
      try {
        let gallery = [];
        if (fs.existsSync(GALLERY_PATH)) {
          gallery = JSON.parse(fs.readFileSync(GALLERY_PATH, 'utf-8'));
          if (!Array.isArray(gallery)) gallery = [];
        }
        gallery.push({
          id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          src: srcPath,
          titel: filename.replace(/\.(png|jpe?g|webp|gif)$/i, ''),
          zichtbaar: true,
          showOnHome: category === 'home'
        });
        fs.writeFileSync(GALLERY_PATH, JSON.stringify(gallery, null, 2), 'utf-8');
      } catch (_) {}

      return new Response(JSON.stringify({ 
        success: true, 
        filename: filename,
        category: category,
        message: category === 'home' ? 'Home foto succesvol geüpload' : 'Foto succesvol geüpload'
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
      zichtbaar: item.zichtbaar !== false,
      showOnHome: item.showOnHome === true
    }));

    // Preserve external URL items (legacy) that are not managed via admin
    if (fs.existsSync(GALLERY_PATH)) {
      try {
        const content = fs.readFileSync(GALLERY_PATH, 'utf-8');
        const existing = JSON.parse(content);
        if (Array.isArray(existing)) {
          const incomingSrcs = new Set(cleaned.map(i => i.src));
          existing.forEach(item => {
            if (item.src && !item.src.startsWith('/') && !incomingSrcs.has(item.src)) {
              cleaned.push(item);
            }
          });
        }
      } catch (_) {}
    }

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
    let targetDir = null;
    
    // Check all directories
    const dirs = [FOTO_FOTOS_PATH, UPLOADS_PATH, HOME_UPLOADS_PATH].filter(d => {
      try { return fs.statSync(d).isDirectory(); } catch { return false; }
    });
    
    for (const dir of dirs) {
      try {
        const files = fs.readdirSync(dir);
        
        // First try exact match
        targetFile = files.find(file => file === filename);
        if (targetFile) {
          actualFilename = filename;
          targetDir = dir;
          break;
        }
        
        // Try to find by partial match (handle encoding issues)
        const decodedFilename = decodeURIComponent(filename);
        targetFile = files.find(file => file === decodedFilename);
        if (targetFile) {
          actualFilename = decodedFilename;
          targetDir = dir;
          break;
        }
        
        // Try to find by removing URL encoding artifacts
        const cleanFilename = filename.replace(/%20/g, ' ').replace(/%2F/g, '/');
        targetFile = files.find(file => file.includes(cleanFilename) || cleanFilename.includes(file));
        if (targetFile) {
          actualFilename = targetFile;
          targetDir = dir;
          break;
        }
      } catch (_) {}
    }
    
    if (!targetFile || !targetDir) {
      return new Response(JSON.stringify({ error: 'Bestand niet gevonden' }), { status: 404 });
    }
    
    const filePath = path.join(targetDir, actualFilename);
    
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
