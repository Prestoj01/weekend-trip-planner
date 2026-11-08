import type { ActivityCategory, Place } from '../types';

export const placeLabel = (p: Place) => [p.name, p.region, p.country].filter(Boolean).join(', ');

export const CATEGORY_META: Record<ActivityCategory, { icon: string; label: string }> = {
  sight: { icon: '🏛️', label: 'Sightseeing' },
  outdoors: { icon: '🌲', label: 'Outdoors' },
  food: { icon: '🍽️', label: 'Food & drink' },
  other: { icon: '📌', label: 'Other' },
};
