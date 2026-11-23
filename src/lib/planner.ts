import type { Activity, ActivityCategory, DailyWeather, Suggestion } from '../types';
import { haversineKm } from './geo';
import { newId } from './storage';
import { isRainy, isSnowy } from './weather';

export type PlaceCategory = Exclude<ActivityCategory, 'other'>;
export type PlacePool = Record<PlaceCategory, Suggestion[]>;

type SlotKind = 'explore' | 'meal';
interface Slot {
  time: string;
  kind: SlotKind;
  label?: string;
}

/** Arrival day starts late, departure day ends after lunch, full days in between. */
export function slotsForDay(index: number, total: number): Slot[] {
  const full: Slot[] = [
    { time: '09:30', kind: 'explore' },
    { time: '12:30', kind: 'meal', label: 'Lunch' },
    { time: '14:30', kind: 'explore' },
    { time: '19:00', kind: 'meal', label: 'Dinner' },
  ];
  if (total === 1) return full;
  if (index === 0) return full.slice(2);
  if (index === total - 1) return full.slice(0, 2);
  return full;
}

const INDOOR_KINDS = /museum|gallery|aquarium|arcade|theatre|theater|cinema|library|basilica|church|memorial/i;

export const isWetDay = (d?: DailyWeather) => !!d && (isRainy(d.code) || isSnowy(d.code) || d.precipChance >= 60);

const minutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** Higher is better: notable places first, then closer to the previous stop (or the destination). */
function score(s: Suggestion, near: { lat: number; lon: number } | null, preferIndoor: boolean | null): number {
  let v = s.notable ? 30 : 0;
  const km = near ? haversineKm(near.lat, near.lon, s.lat, s.lon) : s.distanceKm;
  v -= km * 2;
  if (preferIndoor !== null) {
    const indoor = s.category === 'sight' && INDOOR_KINDS.test(s.kind);
    v += preferIndoor ? (indoor ? 25 : s.category === 'outdoors' ? -40 : 0) : s.category === 'outdoors' ? 15 : 0;
  }
  return v;
}

/**
 * Fill empty time slots across the trip from nearby places.
 * - Wet days favour indoor sights and avoid outdoor spots; dry days favour the outdoors.
 * - Consecutive stops are chosen near each other to keep travel short.
 * - Never repeats a place, and never double-books a slot that already has something within 90 minutes.
 */
export function planWeekend({
  days,
  forecast,
  pool,
  existing,
}: {
  days: string[];
  forecast: DailyWeather[];
  pool: PlacePool;
  existing: Activity[];
}): Activity[] {
  const used = new Set(existing.map((a) => a.title.toLowerCase().replace(/^(lunch|dinner) at /, '')));
  const planned: Activity[] = [];

  days.forEach((date, i) => {
    const wet = isWetDay(forecast.find((f) => f.date === date));
    const dayActs = existing.filter((a) => a.date === date);
    let near: { lat: number; lon: number } | null = [...dayActs].reverse().find((a) => a.location)?.location ?? null;

    for (const slot of slotsForDay(i, days.length)) {
      // Only timed activities can clash; untimed ones don't block the day.
      const clash = dayActs.some((a) => a.time && Math.abs(minutes(a.time) - minutes(slot.time)) < 90);
      if (clash) continue;

      const candidates = slot.kind === 'meal' ? pool.food : [...pool.sight, ...pool.outdoors];
      const pick = candidates
        .filter((s) => !used.has(s.name.toLowerCase()))
        .map((s) => ({ s, v: score(s, near, slot.kind === 'explore' ? wet : null) }))
        .sort((a, b) => b.v - a.v)[0]?.s;
      if (!pick) continue;

      used.add(pick.name.toLowerCase());
      near = { lat: pick.lat, lon: pick.lon };
      planned.push({
        id: newId(),
        date,
        time: slot.time,
        title: slot.label ? `${slot.label} at ${pick.name}` : pick.name,
        category: pick.category,
        location: { lat: pick.lat, lon: pick.lon },
        notes: wet && slot.kind === 'explore' ? 'Indoor pick for a wet day' : undefined,
      });
    }
  });

  return planned;
}
