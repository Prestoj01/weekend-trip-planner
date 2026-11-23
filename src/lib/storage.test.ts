import { describe, expect, it } from 'vitest';
import { sampleTrip } from './sample';
import { decodeTrip, encodeTrip, encodeTripCompact, isTrip } from './storage';

describe('share links', () => {
  it('round-trips a trip through a URL-safe string', () => {
    const trip = sampleTrip();
    const encoded = encodeTrip(trip);
    expect(encoded).toMatch(/^[A-Za-z0-9+\-$]+$/);
    expect(decodeTrip(encoded)).toEqual(trip);
  });
  it('rejects garbage and structurally invalid payloads', () => {
    expect(decodeTrip('not-a-real-link')).toBeNull();
    expect(decodeTrip(encodeTrip({ id: 'x' } as never))).toBeNull();
  });
  it('validates nested activities', () => {
    const trip = sampleTrip();
    expect(isTrip(trip)).toBe(true);
    expect(isTrip({ ...trip, activities: [{ id: 1 }] })).toBe(false);
  });
});

describe('compact share format', () => {
  it('is much shorter and round-trips the itinerary', () => {
    const trip = sampleTrip();
    const compact = encodeTripCompact(trip);
    expect(compact.startsWith('2.')).toBe(true);
    expect(compact.length).toBeLessThan(encodeTrip(trip).length * 0.5);
    const decoded = decodeTrip(compact)!;
    expect(decoded).not.toBeNull();
    expect(decoded.name).toBe(trip.name);
    expect(decoded.startDate).toBe(trip.startDate);
    expect(decoded.activities.map((a) => [a.date, a.time, a.title, a.category, a.cost])).toEqual(
      trip.activities.map((a) => [a.date, a.time, a.title, a.category, a.cost]),
    );
    expect(decoded.activities[1].location?.lat).toBeCloseTo(trip.activities[1].location!.lat, 3);
  });
  it('rejects a corrupt compact link', () => {
    expect(decodeTrip('2.garbage')).toBeNull();
  });
});
