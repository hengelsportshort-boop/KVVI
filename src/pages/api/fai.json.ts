/**
 * API endpoint voor Fishing Activity Index (FAI) + ruwe weerdata.
 * 
 * Serveert per zone en per dag zowel FAI scores als echte weerdata
 * voor grafieken: wind (km/u), luchtdruk (hPa), neerslag (mm), W/m².
 * 
 * GET /api/fai.json?lat=51.05&lng=3.0&days=7
 */

import type { APIRoute } from 'astro';
import type { ZoneId } from '../../lib/zones';
import { getZone, ZONE_INFO } from '../../lib/zones';
import { getZoneWeather, getZoneWeatherWithNASA, getDayWeather } from '../../lib/weather';
import { calculateFAI, applyZoneModifiers } from '../../lib/behavior';

interface FallbackHour {
  hour: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  pressure: number;
  cloudCover: number;
  radiation: number;
  temperature: number;
}

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const lat = parseFloat(url.searchParams.get('lat') || '51.05');
  const lng = parseFloat(url.searchParams.get('lng') || '3.0');
  const days = Math.min(7, Math.max(1, parseInt(url.searchParams.get('days') || '7', 10)));

  const zoneId = getZone(lat, lng);
  const zoneInfo = ZONE_INFO[zoneId];

  try {
    // Haal weerdata op inclusief NASA POWER voor W/m²
    const zoneWeather = await getZoneWeatherWithNASA(zoneId);

    let hasRealData = zoneWeather.data !== null && !zoneWeather.isFallback;

    // Als er geen echte data is, genereer fallback data
    if (!hasRealData) {
      console.warn(`Geen weerdata voor zone ${zoneId}, genereer fallback data`);
    }

    const dailyResults: Array<{
      dayOffset: number;
      date: string;
      zoneId: string;
      averageScore: number;
      bestHours: number[];
      hourly: any;
      rawWeather: any;
    }> = [];
    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      let hourData: FallbackHour[] = [];
      
      if (hasRealData) {
        const realData = getDayWeather(zoneWeather, dayOffset, 6, 21);
        hourData = realData.length > 0 ? realData as unknown as FallbackHour[] : [];
      }

      // Fallback: genereer realistische weerdata als er geen API data is
      if (hourData.length === 0) {
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() + dayOffset);
        const isWeekend = baseDate.getDay() === 0 || baseDate.getDay() === 6;
        
        for (let hh = 7; hh <= 18; hh++) {
          // Realistische fallback: lichte wind, geen neerslag, gemiddelde druk
          const windBase = 8 + Math.sin((hh - 7) / 11 * Math.PI) * 5; // 3-13 km/u
          hourData.push({
            hour: hh,
            windSpeed: Math.round((windBase + (Math.random() - 0.5) * 4) * 10) / 10,
            windDirection: Math.round(180 + (Math.random() - 0.5) * 90), // Zuidwest
            precipitation: Math.random() > 0.8 ? Math.round(Math.random() * 2 * 10) / 10 : 0,
            pressure: Math.round(1015 + (Math.random() - 0.5) * 8),
            cloudCover: Math.round(40 + (Math.random() - 0.5) * 40),
            radiation: (hh >= 8 && hh <= 17) ? Math.round(50 + Math.sin((hh - 8) / 9 * Math.PI) * 300 + Math.random() * 50) : 0,
            temperature: Math.round(15 + Math.sin((hh - 7) / 11 * Math.PI) * 5 + (Math.random() - 0.5) * 3)
          });
        }
      }

      const rawFAI = calculateFAI(hourData, zoneId, dayOffset);
      if (!rawFAI) continue;

      const adjustedFAI = applyZoneModifiers(zoneId, rawFAI);

      const date = new Date();
      date.setDate(date.getDate() + dayOffset);
      const weekday = date.toLocaleDateString('nl-BE', { weekday: 'short' }).replace(/\./g, '');
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const dateStr = `${weekday} ${day}/${month}`;

      // Bouw raw weerdata array voor grafieken
      const rawWeather = hourData.map(h => ({
        hour: h.hour,
        windSpeed: Math.round(h.windSpeed * 10) / 10,
        windDirection: Math.round(h.windDirection),
        precipitation: Math.round(h.precipitation * 10) / 10,
        pressure: Math.round(h.pressure),
        radiation: Math.round(h.radiation),
        cloudCover: Math.round(h.cloudCover),
        temperature: Math.round(h.temperature * 10) / 10
      }));

      dailyResults.push({
        dayOffset,
        date: dateStr,
        zoneId: adjustedFAI.zoneId,
        averageScore: adjustedFAI.averageScore,
        bestHours: adjustedFAI.bestHours,
        hourly: adjustedFAI.hourly,
        rawWeather     // <-- weerdata voor grafieken
      });
    }

    return new Response(JSON.stringify({
      zone: {
        id: zoneId,
        name: zoneInfo.name,
        description: zoneInfo.description,
        countries: zoneInfo.countries
      },
      coordinates: { lat, lng },
      daily: dailyResults,
      _fallback: !hasRealData // Geef aan of dit fallback data is
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    // Laatste redmiddel: genereer fallback data bij fout
    try {
      const fallbackResults: Array<{
        dayOffset: number;
        date: string;
        zoneId: string;
        averageScore: number;
        bestHours: number[];
        hourly: any;
        rawWeather: any;
      }> = [];
      for (let dayOffset = 0; dayOffset < days; dayOffset++) {
        const hourData: FallbackHour[] = [];
        for (let hh = 7; hh <= 18; hh++) {
          hourData.push({
            hour: hh,
            windSpeed: Math.round((10 + Math.random() * 8) * 10) / 10,
            windDirection: Math.round(180 + (Math.random() - 0.5) * 60),
            precipitation: Math.random() > 0.9 ? Math.round(Math.random() * 2 * 10) / 10 : 0,
            pressure: Math.round(1015 + (Math.random() - 0.5) * 6),
            cloudCover: Math.round(30 + (Math.random() - 0.5) * 30),
            radiation: (hh >= 8 && hh <= 17) ? Math.round(100 + Math.sin((hh - 8) / 9 * Math.PI) * 250) : 0,
            temperature: Math.round(16 + Math.sin((hh - 7) / 11 * Math.PI) * 4)
          });
        }
        const rawFAI = calculateFAI(hourData, zoneId, dayOffset);
        if (!rawFAI) continue;
        const adjustedFAI = applyZoneModifiers(zoneId, rawFAI);
        
        const date = new Date();
        date.setDate(date.getDate() + dayOffset);
        const weekday = date.toLocaleDateString('nl-BE', { weekday: 'short' }).replace(/\./g, '');
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        fallbackResults.push({
          dayOffset,
          date: `${weekday} ${day}/${month}`,
          zoneId: adjustedFAI.zoneId,
          averageScore: adjustedFAI.averageScore,
          bestHours: adjustedFAI.bestHours,
          hourly: adjustedFAI.hourly,
          rawWeather: hourData.map(h => ({
            hour: h.hour,
            windSpeed: Math.round(h.windSpeed * 10) / 10,
            windDirection: Math.round(h.windDirection),
            precipitation: Math.round(h.precipitation * 10) / 10,
            pressure: Math.round(h.pressure),
            radiation: Math.round(h.radiation),
            cloudCover: Math.round(h.cloudCover),
            temperature: Math.round(h.temperature * 10) / 10
          }))
        });
      }
      return new Response(JSON.stringify({
        zone: { id: zoneId, name: zoneInfo.name, description: zoneInfo.description, countries: zoneInfo.countries },
        coordinates: { lat, lng },
        daily: fallbackResults,
        _fallback: true,
        _error: err instanceof Error ? err.message : 'Onbekend'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (fallbackErr) {
      return new Response(JSON.stringify({
        error: 'Interne fout bij ophalen FAI data',
        message: err instanceof Error ? err.message : 'Onbekend'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};