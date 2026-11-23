import { describe, expect, it } from 'vitest';
import { estimateLeg, formatDuration } from './travel';

describe('estimateLeg', () => {
  it('walks short hops', () => {
    const leg = estimateLeg({ lat: 35.5951, lon: -82.5515 }, { lat: 35.5935, lon: -82.5508 });
    expect(leg.mode).toBe('walk');
    expect(leg.minutes).toBeGreaterThanOrEqual(1);
    expect(leg.minutes).toBeLessThan(10);
  });
  it('drives longer legs, adding parking time', () => {
    // Downtown Asheville -> Craggy Gardens, ~20 km crow-flies
    const leg = estimateLeg({ lat: 35.5951, lon: -82.5515 }, { lat: 35.6993, lon: -82.3807 });
    expect(leg.mode).toBe('drive');
    expect(leg.km).toBeGreaterThan(20);
    expect(leg.minutes).toBeGreaterThan(25);
    expect(leg.minutes).toBeLessThan(50);
  });
  it('is zero-safe for identical points', () => {
    expect(estimateLeg({ lat: 1, lon: 1 }, { lat: 1, lon: 1 })).toMatchObject({ mode: 'walk', minutes: 1 });
  });
});

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(12)).toBe('12 min');
    expect(formatDuration(60)).toBe('1 hr');
    expect(formatDuration(95)).toBe('1 hr 35 min');
  });
});
