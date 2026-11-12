import type { TempUnit } from '../types';

export type WeatherKind =
  | 'clear'
  | 'mostly-clear'
  | 'partly-cloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm'
  | 'unknown';

/** WMO weather interpretation codes, as returned by Open-Meteo. */
const CODES: Record<number, [kind: WeatherKind, label: string]> = {
  0: ['clear', 'Clear'],
  1: ['mostly-clear', 'Mostly clear'],
  2: ['partly-cloudy', 'Partly cloudy'],
  3: ['overcast', 'Overcast'],
  45: ['fog', 'Fog'],
  48: ['fog', 'Freezing fog'],
  51: ['drizzle', 'Light drizzle'],
  53: ['drizzle', 'Drizzle'],
  55: ['rain', 'Heavy drizzle'],
  56: ['rain', 'Freezing drizzle'],
  57: ['rain', 'Freezing drizzle'],
  61: ['drizzle', 'Light rain'],
  63: ['rain', 'Rain'],
  65: ['rain', 'Heavy rain'],
  66: ['rain', 'Freezing rain'],
  67: ['rain', 'Freezing rain'],
  71: ['snow', 'Light snow'],
  73: ['snow', 'Snow'],
  75: ['snow', 'Heavy snow'],
  77: ['snow', 'Snow grains'],
  80: ['drizzle', 'Showers'],
  81: ['rain', 'Showers'],
  82: ['storm', 'Violent showers'],
  85: ['snow', 'Snow showers'],
  86: ['snow', 'Snow showers'],
  95: ['storm', 'Thunderstorm'],
  96: ['storm', 'Thunderstorm, hail'],
  99: ['storm', 'Thunderstorm, hail'],
};

export function describeWeather(code: number): { kind: WeatherKind; label: string } {
  const [kind, label] = CODES[code] ?? ['unknown', 'Unknown'];
  return { kind, label };
}

export const isRainy = (code: number) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
export const isSnowy = (code: number) => (code >= 71 && code <= 77) || code === 85 || code === 86;

export function formatTemp(celsius: number, unit: TempUnit): string {
  const v = unit === 'F' ? celsius * 1.8 + 32 : celsius;
  return `${Math.round(v)}°`;
}
