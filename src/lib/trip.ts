import type { Activity, Trip } from '../types';
import { addDays, eachDay, parseISODate } from './dates';

export const DAY_COLORS = ['#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#f08c00', '#0c8599', '#d6336c'];

/** Timed activities in chronological order, then untimed ones in the order they were added. */
export function sortActivities(activities: Activity[]): Activity[] {
  return activities
    .map((a, i) => ({ a, i }))
    .sort((x, y) => {
      if (x.a.time && y.a.time) return x.a.time.localeCompare(y.a.time) || x.i - y.i;
      if (x.a.time) return -1;
      if (y.a.time) return 1;
      return x.i - y.i;
    })
    .map(({ a }) => a);
}

/**
 * Change a trip's dates while keeping each activity on the same relative day
 * (day 1 stays day 1). Activities that no longer fit land on the new last day.
 */
export function rescheduleTrip(trip: Trip, start: string, end: string): Trip {
  const offsetDays = Math.round((parseISODate(start).getTime() - parseISODate(trip.startDate).getTime()) / 86_400_000);
  const activities = trip.activities.map((a) => {
    let date = addDays(a.date, offsetDays);
    if (date > end) date = end;
    if (date < start) date = start;
    return { ...a, date };
  });
  return { ...trip, startDate: start, endDate: end, activities };
}

export interface Budget {
  total: number;
  perPerson: number;
  byDay: { date: string; total: number }[];
}

export function computeBudget(trip: Trip): Budget {
  const byDay = eachDay(trip.startDate, trip.endDate).map((date) => ({
    date,
    total: trip.activities.filter((a) => a.date === date).reduce((sum, a) => sum + (a.cost ?? 0), 0),
  }));
  const total = byDay.reduce((sum, d) => sum + d.total, 0);
  return { total, perPerson: total / Math.max(1, trip.travelers), byDay };
}

export const formatMoney = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: n % 1 === 0 ? 0 : 2 });
