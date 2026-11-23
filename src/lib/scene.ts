import type { DailyWeather } from '../types';
import { describeWeather } from './weather';

export type Terrain = 'mountains' | 'hills' | 'lowland';
export type SceneWeather = 'sunny' | 'cloudy' | 'fog' | 'wet' | 'storm' | 'snow';

/** Pick a landscape for the destination's poster from its elevation (metres). */
export function terrainFor(elevation: number): Terrain {
  if (elevation >= 450) return 'mountains';
  if (elevation >= 120) return 'hills';
  return 'lowland';
}

const SEVERITY: SceneWeather[] = ['sunny', 'cloudy', 'fog', 'wet', 'snow', 'storm'];

/** The poster shows the trip's most dramatic day, so a stormy Saturday isn't hidden by a sunny Friday. */
export function sceneWeather(days: DailyWeather[]): SceneWeather {
  let worst: SceneWeather = 'sunny';
  for (const d of days) {
    const kind = describeWeather(d.code).kind;
    const mood: SceneWeather =
      kind === 'storm'
        ? 'storm'
        : kind === 'snow'
          ? 'snow'
          : kind === 'rain' || kind === 'drizzle'
            ? 'wet'
            : kind === 'fog'
              ? 'fog'
              : kind === 'overcast'
                ? 'cloudy'
                : 'sunny';
    if (SEVERITY.indexOf(mood) > SEVERITY.indexOf(worst)) worst = mood;
  }
  return worst;
}
