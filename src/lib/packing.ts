import type { DailyWeather, PackingItem } from '../types';
import { newId } from './storage';
import { isRainy, isSnowy } from './weather';

export function defaultPacking(days: number): PackingItem[] {
  const labels = [
    'ID / wallet',
    'Phone + charger',
    'Toiletries',
    'Medications',
    `Outfits ×${days}`,
    'Sleepwear',
    'Comfortable walking shoes',
  ];
  return labels.map((label) => ({ id: newId(), label, packed: false }));
}

/** Weather-aware items worth packing, for the days of the trip that have a forecast. */
export function weatherSuggestions(forecast: DailyWeather[]): string[] {
  if (forecast.length === 0) return [];
  const low = Math.min(...forecast.map((d) => d.minC));
  const high = Math.max(...forecast.map((d) => d.maxC));
  const wet = forecast.some((d) => isRainy(d.code) || d.precipChance >= 40);
  const snow = forecast.some((d) => isSnowy(d.code));
  const sunny = forecast.some((d) => d.code <= 1);

  const items: string[] = [];
  if (wet) items.push('Umbrella', 'Rain jacket');
  if (snow) items.push('Snow boots', 'Gloves');
  if (low <= 0) items.push('Winter coat', 'Warm hat');
  else if (low <= 10) items.push('Warm jacket');
  else if (low <= 16) items.push('Light layer');
  if (high >= 27) items.push('Sunscreen', 'Reusable water bottle');
  if (high >= 24) items.push('Shorts');
  if (sunny) items.push('Sunglasses');
  return [...new Set(items)];
}
