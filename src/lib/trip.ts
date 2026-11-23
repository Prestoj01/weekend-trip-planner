import type { Activity, Trip } from '../types';
import { addDays, eachDay, parseISODate } from './dates';

/** Sunset-palette day colours, shared by itinerary stubs, map pins and route lines. */
export const DAY_COLORS = ['#e4572e', '#355c7d', '#c06c84', '#e9a23b', '#6c5b7b', '#2f7f79', '#a14f67'];

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

export type DropTarget = { kind: 'activity'; id: string } | { kind: 'day'; date: string };

/**
 * Drag-and-drop semantics for the itinerary.
 * - Onto another day (or another day's activity): the activity moves there and keeps its time.
 * - Onto an activity in the same day: it's re-ordered, and time slots stay in place —
 *   the activity that lands in the 2:30 PM position takes the 2:30 PM time.
 */
export function moveActivity(list: Activity[], activeId: string, target: DropTarget): Activity[] {
  const active = list.find((a) => a.id === activeId);
  if (!active) return list;

  const targetDate = target.kind === 'day' ? target.date : list.find((a) => a.id === target.id)?.date;
  if (!targetDate) return list;

  if (targetDate !== active.date) {
    const moved = { ...active, date: targetDate };
    const rest = list.filter((a) => a.id !== activeId);
    const at = target.kind === 'activity' ? rest.findIndex((a) => a.id === target.id) : -1;
    return at === -1 ? [...rest, moved] : [...rest.slice(0, at), moved, ...rest.slice(at)];
  }

  if (target.kind === 'day' || target.id === activeId) return list;

  const day = sortActivities(list.filter((a) => a.date === targetDate));
  const from = day.findIndex((a) => a.id === activeId);
  const to = day.findIndex((a) => a.id === target.id);
  const reordered = [...day];
  reordered.splice(to, 0, ...reordered.splice(from, 1));
  const slotTimes = day.map((a) => a.time);
  const retimed = reordered.map((a, i) => ({ ...a, time: slotTimes[i] }));

  // Keep other days where they were; rewrite this day's entries in the new order.
  let k = 0;
  return list.map((a) => (a.date === targetDate ? retimed[k++] : a));
}
