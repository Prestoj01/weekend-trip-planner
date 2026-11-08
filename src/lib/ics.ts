import type { Trip } from '../types';
import { addDays } from './dates';

const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const dateOnly = (iso: string) => iso.replace(/-/g, '');

function addMinutes(date: string, time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const day = addDays(date, Math.floor(total / 1440));
  const mins = total % 1440;
  return `${dateOnly(day)}T${String(Math.floor(mins / 60)).padStart(2, '0')}${String(mins % 60).padStart(2, '0')}00`;
}

/** Build an iCalendar file. Timed activities use floating local time and default to one hour. */
export function buildIcs(trip: Trip, now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Weekend Trip Planner//EN', 'CALSCALE:GREGORIAN'];

  const event = (uid: string, fields: string[]) =>
    lines.push('BEGIN:VEVENT', `UID:${uid}@weekend-trip-planner`, `DTSTAMP:${stamp}`, ...fields, 'END:VEVENT');

  event(trip.id, [
    `DTSTART;VALUE=DATE:${dateOnly(trip.startDate)}`,
    `DTEND;VALUE=DATE:${dateOnly(addDays(trip.endDate, 1))}`,
    `SUMMARY:${escape(`${trip.name} — ${trip.destination.name}`)}`,
  ]);

  for (const a of trip.activities) {
    const when = a.time
      ? [`DTSTART:${addMinutes(a.date, a.time, 0)}`, `DTEND:${addMinutes(a.date, a.time, 60)}`]
      : [`DTSTART;VALUE=DATE:${dateOnly(a.date)}`, `DTEND;VALUE=DATE:${dateOnly(addDays(a.date, 1))}`];
    const fields = [...when, `SUMMARY:${escape(a.title)}`];
    if (a.notes) fields.push(`DESCRIPTION:${escape(a.notes)}`);
    if (a.location) fields.push(`GEO:${a.location.lat.toFixed(6)};${a.location.lon.toFixed(6)}`);
    event(a.id, fields);
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

export function downloadFile(filename: string, contents: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
