import { describe, expect, it } from 'vitest';
import type { DailyWeather, Trip } from '../types';
import { buildOverpassQuery, toSuggestions } from './api';
import { buildIcs } from './ics';
import { weatherSuggestions } from './packing';

const day = (p: Partial<DailyWeather>): DailyWeather => ({ date: '2026-11-13', code: 3, maxC: 18, minC: 12, precipChance: 0, ...p });

describe('weatherSuggestions', () => {
  it('suggests rain gear and warm layers for a cold, wet weekend', () => {
    const items = weatherSuggestions([day({ code: 63, minC: 4, maxC: 9 })]);
    expect(items).toEqual(expect.arrayContaining(['Umbrella', 'Rain jacket', 'Warm jacket']));
    expect(items).not.toContain('Sunscreen');
  });
  it('suggests sun protection for a hot, clear weekend', () => {
    const items = weatherSuggestions([day({ code: 0, minC: 20, maxC: 31 })]);
    expect(items).toEqual(expect.arrayContaining(['Sunscreen', 'Sunglasses', 'Shorts']));
    expect(items).not.toContain('Umbrella');
  });
  it('returns nothing without a forecast', () => {
    expect(weatherSuggestions([])).toEqual([]);
  });
});

describe('toSuggestions', () => {
  it('dedupes by name, drops unnamed elements and ranks notable places first', () => {
    const origin = { lat: 0, lon: 0 };
    const result = toSuggestions(
      [
        { type: 'node', id: 1, lat: 0.001, lon: 0, tags: { name: 'Close Park', leisure: 'park' } },
        { type: 'way', id: 2, center: { lat: 0.05, lon: 0 }, tags: { name: 'Famous Museum', tourism: 'museum', wikidata: 'Q1' } },
        { type: 'node', id: 3, lat: 0.002, lon: 0, tags: { name: 'close park', leisure: 'park' } },
        { type: 'node', id: 4, lat: 0.002, lon: 0, tags: { leisure: 'park' } },
      ],
      'sight',
      origin,
    );
    expect(result.map((s) => s.name)).toEqual(['Famous Museum', 'Close Park']);
    expect(result[0].distanceKm).toBeCloseTo(5.56, 1);
  });
  it('builds a bounded Overpass query', () => {
    const q = buildOverpassQuery('food', 35.6, -82.55);
    expect(q).toContain('around:3000,35.60000,-82.55000');
    expect(q).toContain('out center tags 150');
  });
});

describe('buildIcs', () => {
  const trip: Trip = {
    id: 'trip1',
    name: 'Fun, Weekend',
    destination: { name: 'Town', lat: 1, lon: 2 },
    startDate: '2026-11-13',
    endDate: '2026-11-15',
    travelers: 1,
    activities: [
      { id: 'a1', date: '2026-11-14', time: '23:30', title: 'Late show; bring ID', category: 'other' },
      { id: 'a2', date: '2026-11-15', title: 'Hike', category: 'outdoors', location: { lat: 1, lon: 2 } },
    ],
    packing: [],
    createdAt: 0,
    updatedAt: 0,
  };
  const ics = buildIcs(trip, new Date('2026-11-01T00:00:00Z'));

  it('produces a valid calendar with CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
  });
  it('uses an exclusive end date for the all-day trip event', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261113');
    expect(ics).toContain('DTEND;VALUE=DATE:20261116');
  });
  it('rolls timed events past midnight and escapes text', () => {
    expect(ics).toContain('DTSTART:20261114T233000');
    expect(ics).toContain('DTEND:20261115T003000');
    expect(ics).toContain('SUMMARY:Late show\\; bring ID');
    expect(ics).toContain('SUMMARY:Fun\\, Weekend — Town');
  });
});
