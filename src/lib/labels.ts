import type { ActivityCategory, Place } from '../types';

export const placeLabel = (p: Place) => [p.name, p.region, p.country].filter(Boolean).join(', ');

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  sight: 'Sightseeing',
  outdoors: 'Outdoors',
  food: 'Food & drink',
  other: 'Other',
};
