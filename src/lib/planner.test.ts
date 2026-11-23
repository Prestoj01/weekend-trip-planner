import { describe, expect, it } from 'vitest';
import type { Activity, DailyWeather, Suggestion } from '../types';
import { planWeekend, slotsForDay, type PlacePool } from './planner';

const place = (
  name: string,
  category: Suggestion['category'],
  kind: string,
  lat: number,
  notable = false,
): Suggestion => ({
  id: name,
  name,
  kind,
  category,
  lat,
  lon: 0,
  distanceKm: Math.abs(lat) * 111,
  notable,
});

const pool: PlacePool = {
  sight: [place('Art Museum', 'sight', 'museum', 0.01, true), place('Old Fort', 'sight', 'fort', 0.02)],
  outdoors: [place('Big Park', 'outdoors', 'park', 0.015, true), place('Ridge Trail', 'outdoors', 'peak', 0.2, true)],
  food: [
    place('Cafe One', 'food', 'cafe', 0.011),
    place('Bistro', 'food', 'restaurant', 0.012),
    place('Diner', 'food', 'restaurant', 0.03),
  ],
};
const days = ['2026-11-27', '2026-11-28', '2026-11-29'];
const wx = (date: string, code: number): DailyWeather => ({
  date,
  code,
  maxC: 15,
  minC: 5,
  precipChance: code >= 51 ? 80 : 0,
});

describe('slotsForDay', () => {
  it('starts late on arrival and ends after lunch on departure', () => {
    expect(slotsForDay(0, 3).map((s) => s.time)).toEqual(['14:30', '19:00']);
    expect(slotsForDay(1, 3)).toHaveLength(4);
    expect(slotsForDay(2, 3).map((s) => s.time)).toEqual(['09:30', '12:30']);
  });
});

describe('planWeekend', () => {
  it('fills every slot without repeating a place', () => {
    const plan = planWeekend({ days, forecast: [], pool, existing: [] });
    expect(plan).toHaveLength(7); // 2 + 4 + 2 slots, limited by 7 unique places
    expect(new Set(plan.map((a) => a.title)).size).toBe(plan.length);
    expect(
      plan
        .filter((a) => a.title.startsWith('Dinner') || a.title.startsWith('Lunch'))
        .every((a) => a.category === 'food'),
    ).toBe(true);
  });

  it('prefers indoor sights on wet days and the outdoors on dry days', () => {
    const wet = planWeekend({ days: [days[1]], forecast: [wx(days[1], 63)], pool, existing: [] });
    expect(wet[0].title).toBe('Art Museum');
    expect(wet[0].notes).toMatch(/wet day/);
    expect(wet.some((a) => a.category === 'outdoors' && a.time === '09:30')).toBe(false);

    const dry = planWeekend({ days: [days[1]], forecast: [wx(days[1], 0)], pool, existing: [] });
    expect(dry[0].category).toBe('outdoors');
  });

  it('skips slots that clash with existing plans and places already in the itinerary', () => {
    const existing: Activity[] = [
      { id: 'x', date: days[1], time: '09:00', title: 'Art Museum', category: 'sight' },
      { id: 'y', date: days[1], title: 'Pick up tickets', category: 'other' },
    ];
    const plan = planWeekend({ days: [days[1]], forecast: [wx(days[1], 63)], pool, existing });
    expect(plan.find((a) => a.time === '09:30')).toBeUndefined();
    expect(plan.some((a) => a.title.includes('Art Museum'))).toBe(false);
    expect(plan.map((a) => a.time)).toEqual(['12:30', '14:30', '19:00']);
  });
});
