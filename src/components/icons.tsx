import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Landmark,
  MapPin,
  Sun,
  Thermometer,
  Trees,
  UtensilsCrossed,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';
import type { WeatherKind } from '../lib/weather';
import type { ActivityCategory } from '../types';

/** One stroked icon family (Lucide) at a shared stroke width keeps every glyph visually consistent. */
export const ICON_STROKE = 1.75;

const CATEGORY_ICONS: Record<ActivityCategory, LucideIcon> = {
  sight: Landmark,
  outdoors: Trees,
  food: UtensilsCrossed,
  other: MapPin,
};

const WEATHER_ICONS: Record<WeatherKind, LucideIcon> = {
  clear: Sun,
  'mostly-clear': CloudSun,
  'partly-cloudy': CloudSun,
  overcast: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
  unknown: Thermometer,
};

export function CategoryIcon({ category, ...props }: { category: ActivityCategory } & LucideProps) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon size={16} strokeWidth={ICON_STROKE} aria-hidden {...props} />;
}

/** Weather glyph with a small idle animation matching the conditions (spin, bob, sway…). */
export function WeatherIcon({ kind, className, ...props }: { kind: WeatherKind } & LucideProps) {
  const Icon = WEATHER_ICONS[kind];
  return (
    <Icon
      size={20}
      strokeWidth={ICON_STROKE}
      aria-hidden
      className={`wx-anim wx-anim-${kind}${className ? ` ${className}` : ''}`}
      {...props}
    />
  );
}
