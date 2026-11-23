import { test as base, type Page } from '@playwright/test';

/** ISO date `n` days from today (local). */
export function isoFromToday(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// A varied forecast so every weather effect shows up somewhere across 16 days.
const CODES = [0, 2, 63, 95, 3, 71, 45, 1, 0, 61, 2, 3, 0, 80, 73, 0];

export const forecastFixture = () => {
  const time = CODES.map((_, i) => isoFromToday(i));
  return {
    elevation: 650,
    daily: {
      time,
      weather_code: CODES,
      temperature_2m_max: CODES.map((c, i) => (c >= 71 && c <= 77 ? -1 : 14 + (i % 5) * 3)),
      temperature_2m_min: CODES.map((c, i) => (c >= 71 && c <= 77 ? -6 : 4 + (i % 4) * 2)),
      precipitation_probability_max: CODES.map((c) => (c >= 51 ? 80 : 10)),
      sunrise: time.map((t) => `${t}T07:02`),
      sunset: time.map((t) => `${t}T17:24`),
    },
  };
};

export const geocodeFixture = {
  results: [
    { name: 'Asheville', latitude: 35.60095, longitude: -82.55402, admin1: 'North Carolina', country: 'United States', elevation: 649 },
    { name: 'Ashville', latitude: 33.83, longitude: -86.25, admin1: 'Alabama', country: 'United States', elevation: 180 },
  ],
};

export const overpassFixture = {
  elements: [
    { type: 'way', id: 1, center: { lat: 35.5405, lon: -82.5526 }, tags: { name: 'Biltmore Estate', tourism: 'attraction', wikidata: 'Q1' } },
    { type: 'node', id: 2, lat: 35.5951, lon: -82.5515, tags: { name: 'Asheville Art Museum', tourism: 'museum', wikidata: 'Q2' } },
    { type: 'node', id: 3, lat: 35.5873, lon: -82.5672, tags: { name: 'River Arts District', tourism: 'attraction' } },
    { type: 'node', id: 4, lat: 35.5960, lon: -82.5560, tags: { name: 'Pack Square Park', leisure: 'park' } },
    { type: 'node', id: 5, lat: 35.5930, lon: -82.5500, tags: { name: 'Curate', amenity: 'restaurant', cuisine: 'spanish' } },
    { type: 'node', id: 6, lat: 35.5945, lon: -82.5530, tags: { name: 'Double D Coffee', amenity: 'cafe' } },
    { type: 'node', id: 7, lat: 35.6993, lon: -82.3807, tags: { name: 'Craggy Gardens', leisure: 'nature_reserve', wikidata: 'Q3' } },
  ],
};

// 1x1 transparent PNG for map tiles in tests (keeps runs offline and fast).
const BLANK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

export async function mockApis(page: Page, { realTiles = false } = {}) {
  await page.route('https://geocoding-api.open-meteo.com/**', (r) => r.fulfill({ json: geocodeFixture }));
  await page.route('https://api.open-meteo.com/**', (r) => r.fulfill({ json: forecastFixture() }));
  await page.route(/overpass/, (r) => r.fulfill({ json: overpassFixture }));
  if (!realTiles) {
    await page.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ body: BLANK_PNG, contentType: 'image/png' }));
  }
}

export const test = base.extend<{ mocked: void }>({
  mocked: [
    async ({ page }, use) => {
      await mockApis(page);
      await use();
    },
    { auto: true },
  ],
});
export { expect } from '@playwright/test';
