import { describe, expect, it } from 'vitest';
import type { Activity, Trip } from '../types';
import { computeBudget, moveActivity, rescheduleTrip, sortActivities } from './trip';

const act = (id: string, date: string, time?: string, cost?: number): Activity => ({
  id,
  date,
  time,
  cost,
  title: id,
  category: 'other',
});

const trip = (activities: Activity[]): Trip => ({
  id: 't',
  name: 'Test',
  destination: { name: 'X', lat: 0, lon: 0 },
  startDate: '2026-11-13',
  endDate: '2026-11-15',
  travelers: 2,
  activities,
  packing: [],
  createdAt: 0,
  updatedAt: 0,
});

describe('sortActivities', () => {
  it('orders timed activities chronologically and puts untimed ones last, stably', () => {
    const sorted = sortActivities([act('a', 'd'), act('b', 'd', '14:00'), act('c', 'd', '09:30'), act('d', 'd')]);
    expect(sorted.map((a) => a.id)).toEqual(['c', 'b', 'a', 'd']);
  });
});

describe('rescheduleTrip', () => {
  it('keeps activities on the same relative day when moving the trip', () => {
    const moved = rescheduleTrip(trip([act('fri', '2026-11-13'), act('sun', '2026-11-15')]), '2026-11-20', '2026-11-22');
    expect(moved.activities.map((a) => a.date)).toEqual(['2026-11-20', '2026-11-22']);
  });
  it('clamps activities that fall off a shortened trip onto the last day', () => {
    const shorter = rescheduleTrip(trip([act('sun', '2026-11-15')]), '2026-11-13', '2026-11-14');
    expect(shorter.activities[0].date).toBe('2026-11-14');
  });
});

describe('computeBudget', () => {
  it('totals per day and per person', () => {
    const b = computeBudget(trip([act('a', '2026-11-13', undefined, 100), act('b', '2026-11-14', '10:00', 50.5)]));
    expect(b.total).toBe(150.5);
    expect(b.perPerson).toBe(75.25);
    expect(b.byDay.map((d) => d.total)).toEqual([100, 50.5, 0]);
  });
});

describe('moveActivity', () => {
  const list = [
    act('a', '2026-11-13', '09:00'),
    act('b', '2026-11-13', '12:00'),
    act('c', '2026-11-13', '15:00'),
    act('d', '2026-11-14', '10:00'),
  ];

  it('moves to another day keeping its time', () => {
    const out = moveActivity(list, 'a', { kind: 'day', date: '2026-11-14' });
    expect(out.find((x) => x.id === 'a')).toMatchObject({ date: '2026-11-14', time: '09:00' });
    expect(out).toHaveLength(4);
  });

  it("dropping on another day's activity moves it to that day", () => {
    const out = moveActivity(list, 'c', { kind: 'activity', id: 'd' });
    expect(out.find((x) => x.id === 'c')?.date).toBe('2026-11-14');
  });

  it('re-orders within a day while time slots stay put', () => {
    const out = moveActivity(list, 'c', { kind: 'activity', id: 'a' });
    const day = sortActivities(out.filter((x) => x.date === '2026-11-13'));
    expect(day.map((x) => `${x.id}@${x.time}`)).toEqual(['c@09:00', 'a@12:00', 'b@15:00']);
    expect(out.find((x) => x.id === 'd')?.time).toBe('10:00');
  });

  it('is a no-op for drops onto itself or its own day', () => {
    expect(moveActivity(list, 'a', { kind: 'activity', id: 'a' })).toBe(list);
    expect(moveActivity(list, 'a', { kind: 'day', date: '2026-11-13' })).toBe(list);
    expect(moveActivity(list, 'zzz', { kind: 'day', date: '2026-11-13' })).toBe(list);
  });
});
