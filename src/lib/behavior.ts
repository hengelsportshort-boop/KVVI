/**
 * MODULE 3 — VISGEDRAG REGELS ENGINE
 * MODULE 4 — FISHING ACTIVITY INDEX (FAI)
 * 
 * Converteert weerdata → visactiviteit gedrag (M3)
 * Berekent uurlijkse FAI scores 0-100 (M4)
 */

import type { ZoneId } from './zones';

// ============================================================
// MODULE 3: BEHAVIOR RULES ENGINE
// ============================================================

export interface BehaviorModifiers {
  /** Wind optimaliteitsscore (-20 tot +20) */
  windScore: number;
  /** Luchtdruk trendscore (-20 tot +20) */
  pressureScore: number;
  /** Neerslagscore (-15 tot +15) */
  rainScore: number;
  /** Zoninstralingsscore (-20 tot +10) */
  lightScore: number;
  /** Stabiele weerscore (0 tot +15) */
  stabilityBonus: number;
  /** Karper/F1 ondiep actief bonus (0 of +15) */
  carpShallowBonus: number;
}

/**
 * Bepaal visgedrag op basis van weerdata voor één uur.
 */
export function calculateBehaviorScore(
  windSpeed: number,
  pressure: number,
  pressureTrend: 'rising' | 'falling' | 'stable',
  precipitation: number,
  radiation: number,
  cloudCover: number,
  zoneId: ZoneId = 'B'
): BehaviorModifiers {
  // === WIND SCORE (-20 tot +20) ===
  let windScore = 0;
  if (windSpeed >= 5 && windSpeed <= 15) {
    windScore = 15; // Optimaal
  } else if (windSpeed > 15 && windSpeed <= 25) {
    windScore = 10; // Matig
  } else if (windSpeed > 25 && windSpeed <= 35) {
    windScore = 0;  // Weinig
  } else if (windSpeed > 35) {
    windScore = -10; // Slecht
  } else if (windSpeed > 0 && windSpeed < 5) {
    windScore = 5;  // Licht
  } else {
    windScore = -5;  // Windstil
  }

  // Zone modifier voor wind (Noord NL: +20% impact)
  if (zoneId === 'A') {
    windScore = Math.round(windScore * 1.2);
  } else if (zoneId === 'UK') {
    windScore = Math.round(windScore * 1.15);
  }

  // === LUCHTDRUK TREND SCORE (-20 tot +20) ===
  let pressureScore = 0;
  switch (pressureTrend) {
    case 'falling':
      pressureScore = 15; // Dalend = positief voor visactiviteit
      break;
    case 'rising':
      pressureScore = -10; // Stijgend = negatief
      break;
    case 'stable':
      pressureScore = 5; // Stabiel = licht positief
      break;
  }

  // Hoge luchtdruk (>1025) dempt activiteit
  if (pressure > 1025) {
    pressureScore -= 5;
  }
  // Lage luchtdruk (<1005) kan activiteit stimuleren mits dalend
  if (pressure < 1005 && pressureTrend === 'falling') {
    pressureScore += 5;
  }

  // === NEERSLAG SCORE (-15 tot +15) ===
  let rainScore = 0;
  if (precipitation > 0 && precipitation <= 2) {
    rainScore = 10;  // Lichte regen = goed
  } else if (precipitation > 2 && precipitation <= 5) {
    rainScore = 8;   // Matige regen
  } else if (precipitation > 5 && precipitation <= 10) {
    rainScore = 0;   // Zware regen
  } else if (precipitation > 10) {
    rainScore = -10; // Zeer zware regen = slecht
  } else {
    rainScore = 2;   // Droog = neutraal
  }

  // UK: neerslag + wind impact hoger
  if (zoneId === 'UK') {
    rainScore = Math.round(rainScore * 1.2);
  }

  // === ZONINSTRALING SCORE (-20 tot +10) ===
  let lightScore = 0;
  if (radiation > 600) {
    lightScore = -15; // Zeer hoge instraling = negatief
  } else if (radiation > 400) {
    lightScore = -10; // Hoge instraling
  } else if (radiation > 200) {
    lightScore = -5;  // Matige instraling
  } else if (radiation > 50) {
    lightScore = 5;   // Weinig instraling = positief
  } else {
    lightScore = 10;  // Nauwelijks instraling (bewolkt)
  }

  // Zone C + D: zon impact +30%
  if (zoneId === 'C' || zoneId === 'D') {
    lightScore = Math.round(lightScore * 1.3);
  }

  // === STABILITEIT BONUS (0 tot +15) ===
  // Constante weersomstandigheden geven bonus
  let stabilityBonus = 0;
  if (pressureTrend === 'stable' && precipitation === 0 && windSpeed >= 3 && windSpeed <= 20) {
    stabilityBonus = 10;
  } else if (pressureTrend !== 'rising') {
    stabilityBonus = 5;
  }

  // === KARPER/F1 ONDIEP ACTIEF BONUS (0 of +15) ===
  // Geen bewolking + hoge zoninstraling → karper/F1 ondiep
  let carpShallowBonus = 0;
  if (cloudCover < 30 && radiation > 300 && windSpeed < 20) {
    carpShallowBonus = 15;
    // Zone C en D: extra bonus
    if (zoneId === 'C' || zoneId === 'D') {
      carpShallowBonus += 5;
    }
  }

  return {
    windScore,
    pressureScore,
    rainScore,
    lightScore,
    stabilityBonus,
    carpShallowBonus
  };
}


// ============================================================
// MODULE 4: FISHING ACTIVITY INDEX (FAI)
// ============================================================

export interface FAIHourlyScore {
  /** Uur (7-18) */
  hour: number;
  /** FAI score 0-100 */
  score: number;
  /** Kleurcode: 'red' | 'orange' | 'green' */
  color: 'red' | 'orange' | 'green';
  /** Is dit een top uur? */
  isBest: boolean;
  /** Detail scores */
  details: {
    wind: number;
    pressure: number;
    rain: number;
    light: number;
    stability: number;
    carpShallow: number;
    timeBonus: number;
    depthBonus: number;
  };
}

export interface FAIResult {
  /** Zone ID */
  zoneId: ZoneId;
  /** Dag offset (0=vandaag) */
  dayOffset: number;
  /** Uurlijkse scores */
  hourly: FAIHourlyScore[];
  /** Gemiddelde FAI score */
  averageScore: number;
  /** Beste uren */
  bestHours: number[];
}

/**
 * Bereken FAI score voor een enkel uur.
 * 
 * Formule: 0-100 score per uur
 * wind_score + pressure_score + rain_score + light_score
 * + stability_bonus + time_bonus + depth_bonus
 * 
 * Time bonus:
 *   07-09 → +15
 *   17-18 → +15
 */
function calculateHourlyFAI(
  hour: number,
  mods: BehaviorModifiers,
  baseScore: number
): {
  score: number;
  details: FAIHourlyScore['details'];
} {
  // Time bonus
  let timeBonus = 0;
  if (hour >= 7 && hour <= 9) {
    timeBonus = 15; // Ochtend piek
  } else if (hour >= 17 && hour <= 18) {
    timeBonus = 15; // Avond piek
  } else if (hour >= 10 && hour <= 12) {
    timeBonus = 5;  // Late ochtend
  } else {
    timeBonus = 0;  // Middag
  }

  // Diepte bonus: gebaseerd op carpShallowBonus
  let depthBonus = 0;
  if (mods.carpShallowBonus > 0) {
    depthBonus = 5; // Ondiep water extra kans
  }

  // Totale score (basis is 50, modifiers tellen op/af)
  let totalScore = 50
    + mods.windScore
    + mods.pressureScore
    + mods.rainScore
    + mods.lightScore
    + mods.stabilityBonus
    + mods.carpShallowBonus
    + timeBonus
    + depthBonus;

  // Begrens tussen 0-100
  totalScore = Math.max(0, Math.min(100, totalScore));

  return {
    score: Math.round(totalScore),
    details: {
      wind: mods.windScore,
      pressure: mods.pressureScore,
      rain: mods.rainScore,
      light: mods.lightScore,
      stability: mods.stabilityBonus,
      carpShallow: mods.carpShallowBonus,
      timeBonus,
      depthBonus
    }
  };
}

/**
 * Bereken kleurcode op basis van FAI score.
 */
function getColor(score: number): 'red' | 'orange' | 'green' {
  if (score >= 65) return 'green';
  if (score >= 40) return 'orange';
  return 'red';
}

/**
 * Bepaal de beste uren (top 3 of score >= 70).
 */
function getBestHours(scores: FAIHourlyScore[]): number[] {
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const best: number[] = [];

  // Top 3 uren
  for (let i = 0; i < Math.min(3, sorted.length); i++) {
    if (sorted[i].score >= 55) {
      best.push(sorted[i].hour);
    }
  }

  // Extra als er meerdere goede uren zijn
  for (const s of scores) {
    if (s.score >= 70 && !best.includes(s.hour)) {
      best.push(s.hour);
    }
  }

  return best.sort((a, b) => a - b);
}

/**
 * Bereken FAI voor een volledige dag (07:00-18:00).
 * 
 * @param hourData - Uurlijkse weerdata voor de dag (van getDayWeather)
 * @param zoneId - Zone voor modifiers
 * @param dayOffset - Dag offset
 */
export function calculateFAI(
  hourData: Array<{
    hour: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    pressure: number;
    cloudCover: number;
    radiation: number;
    temperature: number;
  }>,
  zoneId: ZoneId = 'B',
  dayOffset: number = 0
): FAIResult | null {
  if (hourData.length === 0) return null;

  // Bepaal pressure trend over de dag
  const pressures = hourData.map(h => h.pressure);
  const firstPressures = pressures.slice(0, Math.min(3, pressures.length));
  const lastPressures = pressures.slice(-3);
  const avgFirst = firstPressures.reduce((s, v) => s + v, 0) / firstPressures.length;
  const avgLast = lastPressures.reduce((s, v) => s + v, 0) / lastPressures.length;
  const diff = avgLast - avgFirst;
  const pressureTrend: 'rising' | 'falling' | 'stable' =
    diff > 1.5 ? 'rising' : diff < -1.5 ? 'falling' : 'stable';

  // Bereken voor elk uur
  const hourlyScores: FAIHourlyScore[] = [];
  
  for (const h of hourData) {
    if (h.hour < 7 || h.hour > 18) continue; // Alleen actieve visuren

    const mods = calculateBehaviorScore(
      h.windSpeed,
      h.pressure,
      pressureTrend,
      h.precipitation,
      h.radiation,
      h.cloudCover,
      zoneId
    );

    const result = calculateHourlyFAI(h.hour, mods, 50);
    
    hourlyScores.push({
      hour: h.hour,
      score: result.score,
      color: getColor(result.score),
      isBest: false, // Wordt later bepaald
      details: result.details
    });
  }

  // Bepaal beste uren
  const bestHours = getBestHours(hourlyScores);
  for (const s of hourlyScores) {
    if (bestHours.includes(s.hour)) {
      s.isBest = true;
    }
  }

  // Gemiddelde score
  const averageScore = hourlyScores.length > 0
    ? Math.round(hourlyScores.reduce((s, h) => s + h.score, 0) / hourlyScores.length)
    : 0;

  return {
    zoneId,
    dayOffset,
    hourly: hourlyScores,
    averageScore,
    bestHours
  };
}

/**
 * Pas zone-specifieke modifiers toe op FAI scores (Module 6).
 */
export function applyZoneModifiers(zoneId: ZoneId, faiResult: FAIResult): FAIResult {
  const modifierMap: Record<ZoneId, number> = {
    A: 1.15,  // Noord NL: wind impact +20% (al in behavior) + extra 15%
    B: 1.0,   // Midden NL: baseline
    C: 1.1,   // BE + Zuid NL: zon impact + extra 10%
    D: 1.05,  // Zuid overgang: licht beter
    UK: 0.95  // UK: wisselvallig, iets lager gemiddeld
  };

  const modifier = modifierMap[zoneId] ?? 1.0;
  
  const adjusted: FAIHourlyScore[] = faiResult.hourly.map(h => {
    let newScore = Math.round(h.score * modifier);
    newScore = Math.max(0, Math.min(100, newScore));
    
    return {
      ...h,
      score: newScore,
      color: getColor(newScore)
    };
  });

  // Herbereken beste uren
  const bestHours = getBestHours(adjusted);
  for (const s of adjusted) {
    s.isBest = bestHours.includes(s.hour);
  }

  const avgScore = adjusted.length > 0
    ? Math.round(adjusted.reduce((s, h) => s + h.score, 0) / adjusted.length)
    : 0;

  return {
    ...faiResult,
    hourly: adjusted,
    averageScore: avgScore,
    bestHours
  };
}