import { describe, expect, it } from 'vitest';
import { sampleTrip } from './sample';
import { decodeTrip, encodeTrip, isTrip } from './storage';

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
