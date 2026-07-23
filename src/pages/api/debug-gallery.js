export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';
import dataDir from '../../../lib/dataDir.js';

export async function GET() {
  const dirs = {
    dataDir,
    dataDirExists: fs.existsSync(dataDir),
    uploads: path.join(dataDir, 'uploads'),
    uploadsExists: fs.existsSync(path.join(dataDir, 'uploads')),
    homeUploads: path.join(dataDir, 'home-uploads'),
    homeUploadsExists: fs.existsSync(path.join(dataDir, 'home-uploads')),
    galleryJson: path.join(dataDir, 'gallery.json'),
    galleryJsonExists: fs.existsSync(path.join(dataDir, 'gallery.json')),
    fotosHome: path.resolve('./public/Fotos Home'),
    fotosHomeExists: fs.existsSync(path.resolve('./public/Fotos Home')),
    fotoFotos: path.resolve('./public/Foto Fotos'),
    fotoFotosExists: fs.existsSync(path.resolve('./public/Foto Fotos')),
    cwd: process.cwd(),
    dataDirEnv: process.env.DATA_DIR || '(not set)',
  };

  try {
    if (dirs.uploadsExists) {
      dirs.uploadsFiles = fs.readdirSync(dirs.uploads).slice(0, 20);
      dirs.uploadsCount = fs.readdirSync(dirs.uploads).length;
    }
    if (dirs.homeUploadsExists) {
      dirs.homeUploadsFiles = fs.readdirSync(dirs.homeUploads).slice(0, 20);
      dirs.homeUploadsCount = fs.readdirSync(dirs.homeUploads).length;
    }
    if (dirs.fotosHomeExists) {
      dirs.fotosHomeCount = fs.readdirSync(dirs.fotosHome).filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f)).length;
    }
    if (dirs.fotoFotosExists) {
      dirs.fotoFotosCount = fs.readdirSync(dirs.fotoFotos).filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f)).length;
    }
    if (dirs.galleryJsonExists) {
      const g = JSON.parse(fs.readFileSync(dirs.galleryJson, 'utf-8'));
      dirs.galleryJsonLength = Array.isArray(g) ? g.length : 'not an array';
      dirs.galleryJsonSample = Array.isArray(g) ? g.slice(0, 3) : g;
    }
  } catch (e) {
    dirs.error = e.message;
  }

  return new Response(JSON.stringify(dirs, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
