import type { Activity, Suggestion, Trip } from '../types';
import { haversineKm } from './geo';
import { addDays, nextWeekend } from './dates';
import { defaultPacking } from './packing';
import { newId } from './storage';

/** A fully-populated demo trip so first-time visitors can see every feature immediately. */
export function sampleTrip(): Trip {
  const { start, end } = nextWeekend();
  const [fri, sat, sun] = [start, addDays(start, 1), addDays(start, 2)];
  const act = (a: Omit<Activity, 'id'>): Activity => ({ id: newId(), ...a });

  return {
    id: newId(),
    name: 'Blue Ridge Getaway',
    destination: { name: 'Asheville', region: 'North Carolina', country: 'United States', lat: 35.6009, lon: -82.554 },
    startDate: start,
    endDate: end,
    travelers: 2,
    activities: [
      act({ date: fri, time: '17:30', title: 'Check in downtown', category: 'other', cost: 320, notes: '2 nights' }),
      act({
        date: fri,
        time: '19:30',
        title: 'Dinner on Biltmore Ave',
        category: 'food',
        cost: 90,
        location: { lat: 35.5935, lon: -82.5508 },
      }),
      act({
        date: sat,
        time: '09:00',
        title: 'Biltmore Estate',
        category: 'sight',
        cost: 160,
        notes: 'Book timed house entry in advance',
        location: { lat: 35.5405, lon: -82.5526 },
      }),
      act({
        date: sat,
        time: '15:00',
        title: 'River Arts District',
        category: 'sight',
        location: { lat: 35.5873, lon: -82.5672 },
      }),
      act({ date: sat, time: '19:00', title: 'Brewery crawl', category: 'food', cost: 60 }),
      act({
        date: sun,
        time: '08:30',
        title: 'Hike Craggy Gardens',
        category: 'outdoors',
        notes: 'Blue Ridge Parkway, milepost 364',
        location: { lat: 35.6993, lon: -82.3807 },
      }),
      act({ date: sun, time: '12:30', title: 'Brunch & head home', category: 'food', cost: 55 }),
    ],
    packing: defaultPacking(3),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

const SAMPLE_CENTER = { lat: 35.6009, lon: -82.554 };

type Place = [name: string, kind: string, lat: number, lon: number, notable?: boolean];
const SAMPLE_PLACES: Record<'sight' | 'outdoors' | 'food', Place[]> = {
  sight: [
    ['Biltmore Estate', 'attraction', 35.5405, -82.5526, true],
    ['Asheville Art Museum', 'museum', 35.5946, -82.5513, true],
    ['Basilica of St. Lawrence', 'attraction', 35.5971, -82.5562, true],
    ['River Arts District', 'attraction', 35.5873, -82.5672],
    ['Thomas Wolfe Memorial', 'museum', 35.5976, -82.5507, true],
    ['Grove Arcade', 'attraction', 35.5966, -82.5546],
  ],
  outdoors: [
    ['Craggy Gardens', 'nature reserve', 35.6993, -82.3807, true],
    ['North Carolina Arboretum', 'garden', 35.4999, -82.6094, true],
    ['Pack Square Park', 'park', 35.5948, -82.5506],
    ['French Broad River Park', 'park', 35.5617, -82.5838],
    ['Mount Pisgah', 'peak', 35.4085, -82.7488, true],
  ],
  food: [
    ['Curate', 'spanish', 35.5937, -82.5509],
    ['Early Girl Eatery', 'regional', 35.5954, -82.5547],
    ['French Broad Chocolate Lounge', 'cafe', 35.5939, -82.5511],
    ['Wicked Weed Brewing', 'pub', 35.5918, -82.5517],
    ['Biscuit Head', 'breakfast', 35.5868, -82.5651],
  ],
};

/** Offline-safe suggestions so the sample trip always has things to add, even if OSM is down. */
export function sampleSuggestions(
  category: 'sight' | 'outdoors' | 'food',
  origin: { lat: number; lon: number },
): Suggestion[] | undefined {
  if (haversineKm(origin.lat, origin.lon, SAMPLE_CENTER.lat, SAMPLE_CENTER.lon) > 2) return undefined;
  return SAMPLE_PLACES[category].map(([name, kind, lat, lon, notable = false], i) => ({
    id: `sample/${category}/${i}`,
    name,
    kind,
    category,
    lat,
    lon,
    notable,
    distanceKm: haversineKm(origin.lat, origin.lon, lat, lon),
  }));
}
