/**
 * Clients for free, keyless public APIs:
 *  - Open-Meteo geocoding + forecast  (https://open-meteo.com)
 *  - OpenStreetMap Overpass           (https://wiki.openstreetmap.org/wiki/Overpass_API)
 */
import type { ActivityCategory, DailyWeather, Place, Suggestion } from '../types';
import { haversineKm } from './geo';

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({ name: q, count: '6', language: 'en', format: 'json' }).toString();
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const data = (await res.json()) as {
    results?: { name: string; latitude: number; longitude: number; admin1?: string; country?: string }[];
  };
  return (data.results ?? []).map((r) => ({
    name: r.name,
    lat: r.latitude,
    lon: r.longitude,
    region: r.admin1,
    country: r.country,
  }));
}

/** Up to 16 days of daily forecast in the destination's local timezone. */
export async function fetchForecast(lat: number, lon: number, signal?: AbortSignal): Promise<DailyWeather[]> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '16',
  }).toString();
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Forecast failed (${res.status})`);
  const { daily } = (await res.json()) as {
    daily: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: (number | null)[];
    };
  };
  return daily.time.map((date, i) => ({
    date,
    code: daily.weather_code[i],
    maxC: daily.temperature_2m_max[i],
    minC: daily.temperature_2m_min[i],
    precipChance: daily.precipitation_probability_max[i] ?? 0,
  }));
}

const OVERPASS_ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

const CATEGORY_QUERIES: Record<Exclude<ActivityCategory, 'other'>, { radiusM: number; filters: string[] }> = {
  sight: {
    radiusM: 12_000,
    filters: [
      '["tourism"~"^(attraction|museum|gallery|viewpoint|zoo|aquarium|theme_park)$"]',
      '["historic"~"^(monument|castle|memorial|ruins|fort)$"]',
    ],
  },
  outdoors: {
    radiusM: 20_000,
    filters: ['["leisure"~"^(park|nature_reserve|garden)$"]', '["natural"~"^(beach|peak|waterfall)$"]'],
  },
  food: {
    radiusM: 3_000,
    filters: ['["amenity"~"^(restaurant|cafe|bar|pub|ice_cream)$"]'],
  },
};

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export function buildOverpassQuery(category: keyof typeof CATEGORY_QUERIES, lat: number, lon: number): string {
  const { radiusM, filters } = CATEGORY_QUERIES[category];
  const around = `(around:${radiusM},${lat.toFixed(5)},${lon.toFixed(5)})`;
  const parts = filters.map((f) => `nwr${f}["name"]${around};`).join('');
  return `[out:json][timeout:25];(${parts});out center tags 150;`;
}

/** Normalize raw Overpass elements: dedupe by name, rank notable places first, then by distance. */
export function toSuggestions(
  elements: OverpassElement[],
  category: ActivityCategory,
  origin: { lat: number; lon: number },
  limit = 30,
): Suggestion[] {
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const el of elements) {
    const name = el.tags?.name?.trim();
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!name || lat === undefined || lon === undefined) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const tags = el.tags ?? {};
    const kind = tags.tourism ?? tags.historic ?? tags.leisure ?? tags.natural ?? tags.cuisine ?? tags.amenity ?? '';
    out.push({
      id: `${el.type}/${el.id}`,
      name,
      kind: kind.replace(/_/g, ' ').split(';')[0],
      category,
      lat,
      lon,
      distanceKm: haversineKm(origin.lat, origin.lon, lat, lon),
      notable: Boolean(tags.wikidata || tags.wikipedia),
    });
  }
  out.sort((a, b) => Number(b.notable) - Number(a.notable) || a.distanceKm - b.distanceKm);
  return out.slice(0, limit);
}

export async function fetchSuggestions(
  category: keyof typeof CATEGORY_QUERIES,
  origin: { lat: number; lon: number },
  signal?: AbortSignal,
): Promise<Suggestion[]> {
  const body = new URLSearchParams({ data: buildOverpassQuery(category, origin.lat, origin.lon) });
  let lastError: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, { method: 'POST', body, signal });
      if (!res.ok) throw new Error(`Overpass responded ${res.status}`);
      const data = (await res.json()) as { elements: OverpassElement[] };
      return toSuggestions(data.elements, category, origin);
    } catch (err) {
      if (signal?.aborted) throw err;
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not load suggestions');
}
