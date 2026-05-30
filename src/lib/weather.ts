/**
 * MODULE 2 — WEATHER DATA PER ZONE
 * 
 * Haalt weerdata op van Open-Meteo API en caches resultaten.
 */

import type { ZoneId } from './zones';

export interface WeatherData {
  /** Uurlijkse data */
  hourly: {
    time: string[];
    temperature_2m: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    precipitation: number[];
    pressure_msl: number[];
    surface_pressure: number[];
    cloud_cover: number[];
    shortwave_radiation: number[];
  };
}

export interface ZoneWeather {
  zoneId: ZoneId;
  data: WeatherData | null;
  fetchedAt: number;
  error?: string;
  isFallback?: boolean;
}

const ZONE_CENTERS: Record<ZoneId, { lat: number; lon: number; name: string }> = {
  A: { lat: 53.0, lon: 5.5, name: 'Noord-Nederland' },
  B: { lat: 52.2, lon: 5.2, name: 'Midden-Nederland' },
  C: { lat: 50.8, lon: 4.5, name: 'België' },
  D: { lat: 49.8, lon: 5.0, name: 'Zuid-België' },
  UK: { lat: 52.5, lon: -2.0, name: 'Verenigd Koninkrijk' }
};

const weatherCache = new Map<string, ZoneWeather>();
const CACHE_TTL = 30 * 60 * 1000;
const FETCH_TIMEOUT = 8000;
const MAX_RETRIES = 2;

async function fetchWithTimeout(url: string, timeoutMs: number = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export function generateFallbackDailyData(zoneId: ZoneId, days: number = 7): WeatherData {
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  const time: string[] = [];
  const temperature_2m: number[] = [];
  const wind_speed_10m: number[] = [];
  const wind_direction_10m: number[] = [];
  const precipitation: number[] = [];
  const pressure_msl: number[] = [];
  const surface_pressure: number[] = [];
  const cloud_cover: number[] = [];
  const shortwave_radiation: number[] = [];

  for (let d = 0; d < days; d++) {
    const dayTemp = 14 + Math.sin(d * 0.3) * 4 + Math.random() * 2;
    const dayWind = 10 + Math.sin(d * 0.7) * 5 + Math.random() * 3;
    const dayPressure = 1015 + Math.sin(d * 0.5) * 5;
    const isRainy = (d + 2) % 4 === 0;
    for (let h = 0; h < 24; h++) {
      const y = baseDate.getFullYear();
      const m = String(baseDate.getMonth() + 1).padStart(2, '0');
      const day = String(baseDate.getDate() + d).padStart(2, '0');
      const hh = String(h).padStart(2, '0');
      time.push(`${y}-${m}-${day}T${hh}:00`);

      const hourFactor = Math.sin((h - 6) / 12 * Math.PI);
      temperature_2m.push(Math.round((dayTemp + hourFactor * 5 + (Math.random() - 0.5) * 3) * 10) / 10);

      const windHourly = dayWind + Math.sin(h * 0.5) * 3 + (Math.random() - 0.5) * 4;
      wind_speed_10m.push(Math.round(Math.max(2, windHourly) * 10) / 10);

      wind_direction_10m.push(Math.round(180 + Math.sin(h * 0.3 + d) * 45 + (Math.random() - 0.5) * 20));

      const rain = isRainy && h >= 8 && h <= 18 ? Math.round(Math.random() * 3 * 10) / 10 : 0;
      precipitation.push(rain);

      const p = dayPressure + Math.sin(h * 0.25) * 2 + (Math.random() - 0.5);
      pressure_msl.push(Math.round(p * 10) / 10);
      surface_pressure.push(Math.round((p - (zoneId === 'D' ? 15 : zoneId === 'C' ? 8 : zoneId === 'A' ? 2 : 5)) * 10) / 10);

      cloud_cover.push(Math.round(Math.max(0, Math.min(100, 40 + Math.sin(h * 0.4 + d) * 30 + (Math.random() - 0.5) * 20))));

      const rad = h >= 5 && h <= 20 ? Math.max(0, Math.sin((h - 5) / 15 * Math.PI) * 500 + (Math.random() - 0.5) * 60) : 0;
      shortwave_radiation.push(Math.round(rad));
    }
  }

  return { hourly: { time, temperature_2m, wind_speed_10m, wind_direction_10m, precipitation, pressure_msl, surface_pressure, cloud_cover, shortwave_radiation } };
}

async function fetchOpenMeteo(center: { lat: number; lon: number }): Promise<WeatherData | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${center.lat}&longitude=${center.lon}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,precipitation,pressure_msl,surface_pressure,cloud_cover,shortwave_radiation&wind_speed_unit=kmh&timezone=Europe%2FBrussels&forecast_days=7`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn('Open-Meteo failed:', e);
    return null;
  }
}

async function fetchWithFallback(zoneId: ZoneId, center: { lat: number; lon: number }): Promise<WeatherData | null> {
  const data = await fetchOpenMeteo(center);
  if (data) return data;

  for (let i = 0; i < MAX_RETRIES; i++) {
    const retry = await fetchOpenMeteo(center);
    if (retry) return retry;
  }

  return null;
}

export async function getZoneWeather(zoneId: ZoneId): Promise<ZoneWeather> {
  const cacheKey = zoneId;
  const cached = weatherCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.fetchedAt) < CACHE_TTL && cached.data) {
    return cached;
  }

  const center = ZONE_CENTERS[zoneId];

  const data = await fetchWithFallback(zoneId, center);

  if (data) {
    const result: ZoneWeather = { zoneId, data, fetchedAt: Date.now() };
    weatherCache.set(cacheKey, result);
    return result;
  }

  if (cached) return cached;

  const fallbackData = generateFallbackDailyData(zoneId);
  const result: ZoneWeather = { zoneId, data: fallbackData, fetchedAt: now, isFallback: true, error: 'Used generated fallback data' };
  weatherCache.set(cacheKey, result);
  return result;
}

export async function getZoneWeatherWithNASA(zoneId: ZoneId): Promise<ZoneWeather> {
  return getZoneWeather(zoneId);
}

export async function getAllZoneWeather(): Promise<Record<ZoneId, ZoneWeather>> {
  const zones: ZoneId[] = ['A', 'B', 'C', 'D', 'UK'];
  const results = await Promise.allSettled(zones.map(getZoneWeather));
  const record: Record<ZoneId, ZoneWeather> = {} as Record<ZoneId, ZoneWeather>;
  zones.forEach((zoneId, i) => {
    const result = results[i];
    if (result.status === 'fulfilled') {
      record[zoneId] = result.value;
    } else {
      record[zoneId] = {
        zoneId,
        data: null,
        fetchedAt: Date.now(),
        error: result.reason?.message || 'Failed to fetch'
      };
    }
  });
  return record;
}

export function getDayWeather(
  zoneWeather: ZoneWeather,
  dayOffset: number,
  startHour = 6,
  endHour = 21
): Array<{
  hour: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  pressure: number;
  cloudCover: number;
  radiation: number;
  temperature: number;
}> {
  if (!zoneWeather.data?.hourly) return [];

  const hourly = zoneWeather.data.hourly;
  const results: Array<{
    hour: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    pressure: number;
    cloudCover: number;
    radiation: number;
    temperature: number;
  }> = [];

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + dayOffset);
  const targetDateStr = targetDate.toISOString().split('T')[0];

  for (let i = 0; i < hourly.time.length; i++) {
    const timeStr = hourly.time[i];
    if (!timeStr.startsWith(targetDateStr)) continue;

    const hour = parseInt(timeStr.slice(11, 13), 10);
    if (hour < startHour || hour > endHour) continue;

    results.push({
      hour,
      windSpeed: hourly.wind_speed_10m[i] ?? 0,
      windDirection: hourly.wind_direction_10m[i] ?? 0,
      precipitation: hourly.precipitation[i] ?? 0,
      pressure: hourly.pressure_msl?.[i] ?? hourly.surface_pressure?.[i] ?? 1013,
      cloudCover: hourly.cloud_cover[i] ?? 0,
      radiation: hourly.shortwave_radiation[i] ?? 0,
      temperature: hourly.temperature_2m[i] ?? 15
    });
  }

  return results;
}

export function getDayAverageWeather(
  zoneWeather: ZoneWeather,
  dayOffset: number
): {
  avgWindSpeed: number;
  avgWindDirection: number;
  totalPrecipitation: number;
  avgPressure: number;
  pressureTrend: 'rising' | 'falling' | 'stable';
  avgCloudCover: number;
  maxRadiation: number;
  avgTemperature: number;
} | null {
  const hours = getDayWeather(zoneWeather, dayOffset, 0, 23);
  if (hours.length === 0) return null;

  const avgWindSpeed = hours.reduce((s, h) => s + h.windSpeed, 0) / hours.length;
  const avgPressure = hours.reduce((s, h) => s + h.pressure, 0) / hours.length;
  const avgCloudCover = hours.reduce((s, h) => s + h.cloudCover, 0) / hours.length;
  const maxRadiation = Math.max(...hours.map(h => h.radiation));
  const avgTemperature = hours.reduce((s, h) => s + h.temperature, 0) / hours.length;
  const totalPrecipitation = hours.reduce((s, h) => s + h.precipitation, 0);

  let sumSin = 0, sumCos = 0;
  for (const h of hours) {
    const rad = h.windDirection * Math.PI / 180;
    sumSin += Math.sin(rad) * h.windSpeed;
    sumCos += Math.cos(rad) * h.windSpeed;
  }
  const avgWindDirection = (Math.atan2(sumSin, sumCos) * 180 / Math.PI + 360) % 360;

  const first6 = hours.slice(0, 6);
  const last6 = hours.slice(-6);
  const avgFirst6 = first6.length > 0 ? first6.reduce((s, h) => s + h.pressure, 0) / first6.length : avgPressure;
  const avgLast6 = last6.length > 0 ? last6.reduce((s, h) => s + h.pressure, 0) / last6.length : avgPressure;
  const diff = avgLast6 - avgFirst6;
  const pressureTrend: 'rising' | 'falling' | 'stable' =
    diff > 2 ? 'rising' : diff < -2 ? 'falling' : 'stable';

  return {
    avgWindSpeed: Math.round(avgWindSpeed * 10) / 10,
    avgWindDirection: Math.round(avgWindDirection),
    totalPrecipitation: Math.round(totalPrecipitation * 10) / 10,
    avgPressure: Math.round(avgPressure),
    pressureTrend,
    avgCloudCover: Math.round(avgCloudCover),
    maxRadiation: Math.round(maxRadiation),
    avgTemperature: Math.round(avgTemperature * 10) / 10
  };
}
