import fs from 'node:fs';
import path from 'node:path';

const FOTOS_HOME_PATH = path.resolve('./public/Fotos Home');
const FOTO_FOTOS_PATH = path.resolve('./public/Foto Fotos');
const UPLOADS_PATH = path.resolve('./public/data/uploads');
const GALLERY_PATH = path.resolve('./public/data/gallery.json');

export function getGalleryItems() {
  const seenFiles = new Set();
  let allItems = [];

  try {
    const homeFiles = fs.readdirSync(FOTOS_HOME_PATH)
      .filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f) && !f.includes('_640.'))
      .sort();
    homeFiles.forEach((file, index) => {
      seenFiles.add(file.toLowerCase());
      allItems.push({
        id: `home-photo-${index}`,
        src: `/Fotos Home/${encodeURIComponent(file)}`,
        titel: file.replace(/\.(png|jpe?g|webp|gif)$/i, ''),
        zichtbaar: true,
        source: 'Fotos Home'
      });
    });
  } catch (_) {}

  try {
    const fotoFiles = fs.readdirSync(FOTO_FOTOS_PATH)
      .filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f) && !f.includes('_640.'))
      .filter(f => !seenFiles.has(f.toLowerCase()))
      .sort();
    fotoFiles.forEach((file, index) => {
      seenFiles.add(file.toLowerCase());
      allItems.push({
        id: `foto-fotos-${index}`,
        src: `/Foto Fotos/${encodeURIComponent(file)}`,
        titel: file.replace(/\.(png|jpe?g|webp|gif)$/i, ''),
        zichtbaar: true,
        source: 'Foto Fotos'
      });
    });
  } catch (_) {}

  // Read from persistent uploads directory (admin uploads that survive deploys)
  try {
    if (fs.existsSync(UPLOADS_PATH)) {
      const uploadFiles = fs.readdirSync(UPLOADS_PATH)
        .filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f) && !f.includes('_640.'))
        .filter(f => !seenFiles.has(f.toLowerCase()))
        .sort();
      uploadFiles.forEach((file, index) => {
        seenFiles.add(file.toLowerCase());
        allItems.push({
          id: `upload-${index}`,
          src: `/data/uploads/${encodeURIComponent(file)}`,
          titel: file.replace(/\.(png|jpe?g|webp|gif)$/i, ''),
          zichtbaar: true,
          source: 'Foto Fotos'
        });
      });
    }
  } catch (_) {}

  if (fs.existsSync(GALLERY_PATH)) {
    try {
      const content = fs.readFileSync(GALLERY_PATH, 'utf-8');
      const galleryData = JSON.parse(content);
      if (Array.isArray(galleryData)) {
        const bySrc = new Map();
        galleryData.forEach(item => {
          if (item.src) bySrc.set(item.src, item);
        });

        allItems = allItems.map(item => {
          const match = bySrc.get(item.src);
          if (match) {
            return {
              ...item,
              zichtbaar: match.zichtbaar !== false,
              titel: match.titel || item.titel
            };
          }
          return item;
        });

        galleryData.forEach(item => {
          if (item.src && !item.src.startsWith('/')) {
            if (!allItems.some(i => i.src === item.src)) {
              allItems.push({
                id: item.id,
                src: item.src,
                titel: item.titel || '',
                zichtbaar: item.zichtbaar !== false,
                source: 'Extern'
              });
            }
          }
        });
      }
    } catch (_) {}
  }

  return allItems;
}
