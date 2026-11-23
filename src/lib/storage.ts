import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { Activity, PackingItem, Trip } from '../types';

const TRIPS_KEY = 'wtp:trips:v1';

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

function isActivity(v: unknown): v is Activity {
  return isObj(v) && typeof v.id === 'string' && isDate(v.date) && typeof v.title === 'string';
}

function isPackingItem(v: unknown): v is PackingItem {
  return isObj(v) && typeof v.id === 'string' && typeof v.label === 'string';
}

/** Structural check for data coming from localStorage or a share link. */
export function isTrip(v: unknown): v is Trip {
  if (!isObj(v) || !isObj(v.destination)) return false;
  const d = v.destination;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof d.name === 'string' &&
    isNum(d.lat) &&
    isNum(d.lon) &&
    isDate(v.startDate) &&
    isDate(v.endDate) &&
    Array.isArray(v.activities) &&
    v.activities.every(isActivity) &&
    Array.isArray(v.packing) &&
    v.packing.every(isPackingItem)
  );
}

export function loadTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(TRIPS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isTrip) : [];
  } catch {
    return [];
  }
}

export function saveTrips(trips: Trip[]): void {
  try {
    localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
  } catch {
    // Storage full or disabled (e.g. private mode); the app still works in-memory.
  }
}

/** Compress a trip into a URL-safe string for share links. */
export function encodeTrip(trip: Trip): string {
  return compressToEncodedURIComponent(JSON.stringify(trip));
}

export function decodeTrip(data: string): Trip | null {
  try {
    if (data.startsWith('2.')) {
      const json = decompressFromEncodedURIComponent(data.slice(2));
      if (!json) return null;
      const trip = unpackTrip(JSON.parse(json) as Packed);
      return isTrip(trip) ? trip : null;
    }
    const json = decompressFromEncodedURIComponent(data);
    if (!json) return null;
    const parsed: unknown = JSON.parse(json);
    return isTrip(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const CATS = ['sight', 'outdoors', 'food', 'other'] as const;
const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

/**
 * Compact link format for space-limited places like QR codes: positional arrays instead of keyed
 * objects, coordinates rounded to ~10 m, no packing list or notes. Prefixed with "2." so
 * `decodeTrip` can tell it apart from the full format.
 */
export function encodeTripCompact(trip: Trip): string {
  const days = trip.startDate;
  const dayIndex = (d: string) => Math.round((Date.parse(d) - Date.parse(days)) / 86_400_000);
  const packed = [
    trip.name,
    [
      trip.destination.name,
      round4(trip.destination.lat),
      round4(trip.destination.lon),
      trip.destination.region ?? '',
      trip.destination.country ?? '',
    ],
    trip.startDate,
    trip.endDate,
    trip.travelers,
    trip.activities.map((a) => [
      dayIndex(a.date),
      a.time ?? '',
      a.title,
      CATS.indexOf(a.category),
      a.cost ?? 0,
      ...(a.location ? [round4(a.location.lat), round4(a.location.lon)] : []),
    ]),
  ];
  return `2.${compressToEncodedURIComponent(JSON.stringify(packed))}`;
}

type Packed = [string, [string, number, number, string, string], string, string, number, (string | number)[][]];

function unpackTrip(p: Packed): Trip {
  const [name, [dName, lat, lon, region, country], startDate, endDate, travelers, acts] = p;
  const dateAt = (i: number) => {
    const d = new Date(Date.parse(startDate) + i * 86_400_000);
    return d.toISOString().slice(0, 10);
  };
  return {
    id: newId(),
    name,
    destination: { name: dName, lat, lon, region: region || undefined, country: country || undefined },
    startDate,
    endDate,
    travelers,
    packing: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    activities: acts.map(([day, time, title, cat, cost, aLat, aLon]) => ({
      id: newId(),
      date: dateAt(Number(day)),
      time: (time as string) || undefined,
      title: String(title),
      category: CATS[Number(cat)] ?? 'other',
      cost: Number(cost) || undefined,
      location: aLat !== undefined ? { lat: Number(aLat), lon: Number(aLon) } : undefined,
    })),
  };
}
