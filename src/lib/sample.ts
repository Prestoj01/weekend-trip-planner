import type { Activity, Trip } from '../types';
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
