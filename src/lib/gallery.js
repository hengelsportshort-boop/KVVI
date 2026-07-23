import fs from 'node:fs';
import path from 'node:path';

const FOTOS_HOME_PATH = path.resolve('./public/Fotos Home');
const FOTO_FOTOS_PATH = path.resolve('./public/Foto Fotos');
const UPLOADS_PATH = path.resolve('./public/data/uploads');
const HOME_UPLOADS_PATH = path.resolve('./public/data/home-uploads');
const GALLERY_PATH = path.resolve('./public/data/gallery.json');

export function getGalleryItems() {
  const seenFiles = new Set();
  let allItems = [];

  // 1. Uploads eerst (nieuwste bovenaan)
  try {
    if (fs.existsSync(HOME_UPLOADS_PATH)) {
      const homeUploadFiles = fs.readdirSync(HOME_UPLOADS_PATH)
        .filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f) && !f.includes('_640.'))
        .filter(f => !seenFiles.has(f.toLowerCase()))
        .sort()
        .reverse();
      homeUploadFiles.forEach((file, index) => {
        seenFiles.add(file.toLowerCase());
        allItems.push({
          id: `home-upload-${index}`,
          src: `/data/home-uploads/${encodeURIComponent(file)}`,
          titel: file.replace(/\.(png|jpe?g|webp|gif)$/i, ''),
          zichtbaar: true,
          showOnHome: true,
          source: 'Fotos Home'
        });
      });
    }
  } catch (_) {}

  try {
    if (fs.existsSync(UPLOADS_PATH)) {
      const uploadFiles = fs.readdirSync(UPLOADS_PATH)
        .filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f) && !f.includes('_640.'))
        .filter(f => !seenFiles.has(f.toLowerCase()))
        .sort()
        .reverse();
      uploadFiles.forEach((file, index) => {
        seenFiles.add(file.toLowerCase());
        allItems.push({
          id: `upload-${index}`,
          src: `/data/uploads/${encodeURIComponent(file)}`,
          titel: file.replace(/\.(png|jpe?g|webp|gif)$/i, ''),
          zichtbaar: true,
          showOnHome: false,
          source: 'Foto Fotos'
        });
      });
    }
  } catch (_) {}

  // 2. Seed-foto's daarna
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
        showOnHome: true,
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
        showOnHome: false,
        source: 'Foto Fotos'
      });
    });
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
              showOnHome: match.showOnHome !== undefined ? match.showOnHome : item.showOnHome,
              titel: match.titel || item.titel
            };
          }
          return item;
        });
      }
    } catch (_) {}
  }

  return allItems;
}
