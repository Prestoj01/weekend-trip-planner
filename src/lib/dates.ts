/** Date helpers that work on local-calendar ISO strings (YYYY-MM-DD) to avoid timezone drift. */

export const MAX_TRIP_DAYS = 7;

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/**
 * The upcoming Friday–Sunday. On a Friday this returns the current weekend;
 * on Saturday or Sunday it returns the following one.
 */
export function nextWeekend(today: Date = new Date()): { start: string; end: string } {
  const daysUntilFriday = (5 - today.getDay() + 7) % 7;
  const friday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilFriday);
  const start = toISODate(friday);
  return { start, end: addDays(start, 2) };
}

/** Every date from start to end inclusive. Returns [] for an inverted range. */
export function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  for (let cur = start; cur <= end && days.length <= 366; cur = addDays(cur, 1)) {
    days.push(cur);
  }
  return days;
}

export function formatDay(iso: string): { weekday: string; label: string } {
  const d = parseISODate(iso);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: 'long' }),
    label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  };
}

export function formatRange(start: string, end: string): string {
  const s = parseISODate(start);
  const e = parseISODate(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  const startStr = s.toLocaleDateString(undefined, sameYear ? opts : { ...opts, year: 'numeric' });
  const endStr = e.toLocaleDateString(undefined, { ...opts, year: 'numeric' });
  return start === end ? endStr : `${startStr} – ${endStr}`;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function daysUntil(iso: string, today: Date = new Date()): number {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((parseISODate(iso).getTime() - t.getTime()) / 86_400_000);
}
