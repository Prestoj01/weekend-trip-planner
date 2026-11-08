/** A geocoded location (city, town, etc). */
export interface Place {
  name: string;
  lat: number;
  lon: number;
  region?: string;
  country?: string;
}

export type ActivityCategory = 'sight' | 'outdoors' | 'food' | 'other';

export interface Activity {
  id: string;
  /** ISO date (YYYY-MM-DD) of the day this activity belongs to. */
  date: string;
  /** Local time, 24h "HH:MM". Untimed activities sort to the end of the day. */
  time?: string;
  title: string;
  notes?: string;
  /** Total cost for the group, in the user's currency. */
  cost?: number;
  category: ActivityCategory;
  location?: { lat: number; lon: number };
}

export interface PackingItem {
  id: string;
  label: string;
  packed: boolean;
}

export interface Trip {
  id: string;
  name: string;
  destination: Place;
  startDate: string;
  endDate: string;
  travelers: number;
  activities: Activity[];
  packing: PackingItem[];
  createdAt: number;
  updatedAt: number;
}

/** One day of forecast, always stored in metric units. */
export interface DailyWeather {
  date: string;
  code: number;
  maxC: number;
  minC: number;
  precipChance: number;
}

export interface Suggestion {
  id: string;
  name: string;
  kind: string;
  category: ActivityCategory;
  lat: number;
  lon: number;
  distanceKm: number;
  notable: boolean;
}

export type TempUnit = 'F' | 'C';
