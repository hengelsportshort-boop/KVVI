
# KVVI Website — Richtsnoeren

## Absolute regels
- **GEEN wijzigingen aan inhoud of werking** van de website. Alleen prestatie-optimalisaties zijn toegestaan die geen impact hebben op functionaliteit of zichtbare inhoud.
- Voor elke wijziging vragen of deze door mag gaan.

## Opgelost

### ETag 304 markers verdwijnen (30-05-2026)
- **Oorzaak**: `laadVisstekken()` resette `alleVisstekkenFeaturesKvvi` en `alleVisstekkenFeaturesAbc` naar `null` voordat async API calls terugkwamen. Bij 304 waren de caches leeg → geen markers toegevoegd aan nieuwe `markerGroup`.
- **Fix**: per-API caches niet resetten in `laadVisstekken()`, alleen in initialisatie. Ze blijven behouden tussen 30s refreshes.
- **Structuur**: `processGeoJSON(data, isAbc)` — aparte functie voor marker-creatie, gebruikt door zowel 200- als 304-pad.

### Admin login (29-05-2026)
- **Cross-site POST 403**: `security.checkOrigin: false` in `astro.config.mjs` — Astro v6 blokkeert standaard POST forms achter Fly proxy
- **ADMIN_KEY leeg bij Docker build**: `.env` staat in `.dockerignore`, dus `import.meta.env.ADMIN_KEY` wordt leeg geïnlined tijdens build. Opgelost door `process.env.ADMIN_KEY` in `login.astro` en `middleware.ts`.
- **ADMIN_KEY runtime leeg (30-05-2026)**: `process.env.ADMIN_KEY` gaf `a=0` (leeg) op de server, ook al stond de secret als "Deployed". Opgelost door secret opnieuw in te stellen (`fly secrets set ADMIN_KEY=<waarde>`), wat een herstart van de machine forceert.

### iPad login (30-05-2026)
- **Oorzaak**: `ADMIN_KEY` environment variable was leeg op de server (`a=0`), niet gerelateerd aan iPad-specifiek gedrag. Oplossing: secret resetten + machine herstart.

### Hengelmap crash (29-05-2026)
- **Root cause**: `map.on('moveend', resizeCanvas)` en `map.on('zoomend', resizeCanvas)` stonden op **module-top-level** (buiten de `initMap()` functie). Omdat `map` pas binnen `initMap()` wordt aangemaakt, gaf dit `TypeError: Cannot read properties of undefined (reading 'on')` — de hele module crashte voor `initMap()` kon uitvoeren.
- **Fix**: die 3 regels verplaatst naar binnen `initMap()`, net na de map creatie.
- **import('leaflet')**: Lokaal dev-mode: `import('leaflet')` retourneert module namespace (`Module { default: Leaflet }`) i.p.v. de constructor direct. Opgelost met `mod.default || mod`.

### FAI panel altijd zichtbaar (29-05-2026)
- **Oorzaak**: `.fai-panel` had `display: block !important` en `visibility: visible !important`, waardoor `hidden` class (Tailwind's `display: none`) niet werkte.
- **Fix**: `!important` verwijderd van `display` en `visibility` in `FAIPanel.astro`.

## Huidige optimalisaties (niet ongedaan maken)
1. **Image optimization**: `bin/optimize-images.mjs` (draait voor elke build) — PNG→JPEG, max 1920px, kwaliteit 80%
2. **Compressie + caching**: `server.mjs` — gzip-compressie, Cache-Control (1 jaar) voor statische assets
3. **openai dependency verwijderd** (niet gebruikt)
4. **Google Fonts**: preconnect + preload in BaseLayout.astro
5. **Preconnect/dns-prefetch** voor hengelmap: api.open-meteo.com, tile.openstreetmap.org (enkel op /hengelmap)
6. **Standalone → middleware mode** in astro.config.mjs (voor compressie in server.mjs)
7. **Mobiele optimalisatie (27-05-2026)**: Touch interactie, hengelmap, homepage, fotos
   - **Touch & Interactie**: `-webkit-tap-highlight-color: transparent`, `overscroll-behavior: none`, safe area insets (`env(safe-area-inset-*)`), `:active` states op `.mobile-nav-link` en `.mobile-bar-btn`
   - **Hengelmap**: `min-height: 100dvh` i.p.v. 600px op mobiel, laad-indicator (`#visstekken-loading`), `verbergLaadIndicator()` na fetch
   - **Homepage**: compactere hero padding/buttons op mobiel, logo kleiner `w-48 h-48` op kleine schermen
   - **Fotos modal**: grotere touch targets (`w-16 h-16` op mobiel, `w-14 h-14` op desktop)
8. **Leaflet CSS lokaal (29-05-2026)**: `/public/lib/leaflet.css` ipv unpkg.com preload — sneller (geen externe DNS/SSL), immutable cache (1 jaar), gzip via server.mjs
9. **cron-job.org keep-alive (29-05-2026)**: elke minuut naar `https://kvvi-production.up.railway.app/` — voorkomt VM suspension na 30 min inactiviteit
10. **ETag caching visstekken (30-05-2026)**: `?t=Date.now()` verwijderd uit fetch URLs, vervangen door `If-None-Match` headers. Server antwoordt met `304` (0 KB) zolang data niet wijzigt — bespaart ~45-90 MB/u op mobiel.

## Structuur
- `src/layouts/BaseLayout.astro` — hoofdnavigatie (Uitslagen/Specials dropdown via click)
- `src/components/HengelKaart.astro` — kaart, wind, FAI, help, lokalisator
- `src/components/FAIPanel.astro` — FAI score panel (weerdata, wind animatie)
- `src/components/WeerOverlay.astro` — weerkaartjes op hengelmap
- `src/pages/hengelmap.astro` — root, importeert componenten
- `src/pages/admin/login.astro` — admin login (POST form, vergelijkt met `process.env.ADMIN_KEY`)
- `src/middleware.ts` — admin auth middleware (controleert cookie `admin_token` tegen `process.env.ADMIN_KEY`)
- `server.mjs` — productieserver (starten met `node server.mjs`)
- `public/lib/leaflet.css` — lokaal geserveerde Leaflet CSS
- `npm run dev` — development
- `npm run build` — build (optimizes images first)

## Admin
- Login via `/admin/login`
- ADMIN_KEY wordt ingesteld als Fly.io secret: `fly secrets set ADMIN_KEY=<waarde>`
- **WAARSCHUWING**: `.env` staat in `.dockerignore`, dus `import.meta.env` wordt leeg tijdens Docker build. Gebruik ALTIJD `process.env` voor runtime secrets.

## Fly.io
- Host: `kvvi-production.up.railway.app`
- Free tier: VM stopt na 30 min inactiviteit
- Keep-alive: cron-job.org pingt elke minuut
- Deploy: `fly deploy`
- Secrets: `fly secrets set KEY=VAL`
- Machine starten: `fly machine start 8dd629ced22228`
- Build arg voor env vars: `fly deploy --build-arg ADMIN_KEY=<waarde>` (indien nodig tijdens build)

## Visstekken-data locaties
- **`public/data/hengelmap.csv`** — KVVI eigen visstekken (Clubvijver, Kanaal Roeselare-Leie, Blankaart, Gaverbeek)
- **`public/data/abc-sportvissen.geojson`** — ABC Sportvissen vislocaties (~45+ locaties, 341 KB)
- **`public/data/claudedenys-Hengelen-West-Vlaanderen.geojson`** — West-Vlaamse visstekken (~40+ locaties, 403 KB)
- **`public/data/legende.json`** — Groeperingstypes voor visstekken (Polderrivier, Rivier, Kanaal, Commercial, etc.)

## Back-ups
- **`backup-visstekken-data/`** — back-up van alle 4 visstekken-data bestanden (aangemaakt 27-05-2026)
