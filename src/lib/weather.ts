import type { TempUnit } from '../types';

/** WMO weather interpretation codes, as returned by Open-Meteo. */
const CODES: Record<number, [icon: string, label: string]> = {
  0: ['☀️', 'Clear'],
  1: ['🌤️', 'Mostly clear'],
  2: ['⛅', 'Partly cloudy'],
  3: ['☁️', 'Overcast'],
  45: ['🌫️', 'Fog'],
  48: ['🌫️', 'Freezing fog'],
  51: ['🌦️', 'Light drizzle'],
  53: ['🌦️', 'Drizzle'],
  55: ['🌧️', 'Heavy drizzle'],
  56: ['🌧️', 'Freezing drizzle'],
  57: ['🌧️', 'Freezing drizzle'],
  61: ['🌦️', 'Light rain'],
  63: ['🌧️', 'Rain'],
  65: ['🌧️', 'Heavy rain'],
  66: ['🌧️', 'Freezing rain'],
  67: ['🌧️', 'Freezing rain'],
  71: ['🌨️', 'Light snow'],
  73: ['🌨️', 'Snow'],
  75: ['❄️', 'Heavy snow'],
  77: ['🌨️', 'Snow grains'],
  80: ['🌦️', 'Showers'],
  81: ['🌧️', 'Showers'],
  82: ['⛈️', 'Violent showers'],
  85: ['🌨️', 'Snow showers'],
  86: ['❄️', 'Snow showers'],
  95: ['⛈️', 'Thunderstorm'],
  96: ['⛈️', 'Thunderstorm, hail'],
  99: ['⛈️', 'Thunderstorm, hail'],
};

export function describeWeather(code: number): { icon: string; label: string } {
  const [icon, label] = CODES[code] ?? ['🌡️', 'Unknown'];
  return { icon, label };
}

export const isRainy = (code: number) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
export const isSnowy = (code: number) => (code >= 71 && code <= 77) || code === 85 || code === 86;

export function formatTemp(celsius: number, unit: TempUnit): string {
  const v = unit === 'F' ? celsius * 1.8 + 32 : celsius;
  return `${Math.round(v)}°`;
}
