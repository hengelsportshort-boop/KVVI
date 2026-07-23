import fs from 'node:fs';
import path from 'node:path';

const FOTOS_HOME_PATH = path.resolve('./public/Fotos Home');
const FOTO_FOTOS_PATH = path.resolve('./public/Foto Fotos');

export function getGalleryItems() {
  const seenFiles = new Set();
  let allItems = [];

  try {
    const homeFiles = fs.readdirSync(FOTOS_HOME_PATH)
      .filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f) && !f.includes('_640.'))
      .sort((a, b) => fs.statSync(path.join(FOTOS_HOME_PATH, b)).mtimeMs - fs.statSync(path.join(FOTOS_HOME_PATH, a)).mtimeMs);
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
      .sort((a, b) => fs.statSync(path.join(FOTO_FOTOS_PATH, b)).mtimeMs - fs.statSync(path.join(FOTO_FOTOS_PATH, a)).mtimeMs);
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

  return allItems;
}
