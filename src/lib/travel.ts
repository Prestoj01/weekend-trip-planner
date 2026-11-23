import { haversineKm } from './geo';

export type TravelMode = 'walk' | 'drive';

export interface Leg {
  mode: TravelMode;
  minutes: number;
  /** Estimated road distance in km. */
  km: number;
}

/** Roads are rarely straight; this scales crow-flies distance to a typical route length. */
const DETOUR = 1.3;
const WALK_KMH = 4.8;
/** Longest leg we'd suggest walking. */
const MAX_WALK_KM = 1.6;

/**
 * Rough door-to-door estimate between two points, no routing service required.
 * Short hops are walked; longer ones driven at town or highway speeds plus parking time.
 */
export function estimateLeg(a: { lat: number; lon: number }, b: { lat: number; lon: number }): Leg {
  const km = haversineKm(a.lat, a.lon, b.lat, b.lon) * DETOUR;
  if (km <= MAX_WALK_KM) return { mode: 'walk', km, minutes: Math.max(1, Math.round((km / WALK_KMH) * 60)) };
  const kmh = km < 15 ? 32 : 56;
  return { mode: 'drive', km, minutes: Math.round((km / kmh) * 60) + 5 };
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
