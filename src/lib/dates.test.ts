import { describe, expect, it } from 'vitest';
import { addDays, daysUntil, eachDay, nextWeekend } from './dates';

describe('nextWeekend', () => {
  it('returns the coming Friday–Sunday from midweek', () => {
    expect(nextWeekend(new Date(2026, 10, 4))).toEqual({ start: '2026-11-06', end: '2026-11-08' }); // Wed
  });
  it('returns this weekend on a Friday', () => {
    expect(nextWeekend(new Date(2026, 10, 6))).toEqual({ start: '2026-11-06', end: '2026-11-08' });
  });
  it('skips to the following weekend on Saturday and Sunday', () => {
    expect(nextWeekend(new Date(2026, 10, 7)).start).toBe('2026-11-13');
    expect(nextWeekend(new Date(2026, 10, 8)).start).toBe('2026-11-13');
  });
  it('handles month and year boundaries', () => {
    expect(nextWeekend(new Date(2026, 11, 30))).toEqual({ start: '2027-01-01', end: '2027-01-03' });
  });
});

describe('eachDay / addDays', () => {
  it('lists dates inclusively', () => {
    expect(eachDay('2026-02-27', '2026-03-01')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01']);
  });
  it('returns [] for inverted ranges', () => {
    expect(eachDay('2026-03-02', '2026-03-01')).toEqual([]);
  });
  it('is not affected by DST transitions', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
  });
  it('counts days until a date', () => {
    expect(daysUntil('2026-11-13', new Date(2026, 10, 8, 23, 59))).toBe(5);
  });
});
