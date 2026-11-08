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
    const json = decompressFromEncodedURIComponent(data);
    if (!json) return null;
    const parsed: unknown = JSON.parse(json);
    return isTrip(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
