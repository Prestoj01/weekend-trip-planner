import { describe, expect, it } from 'vitest';
import type { DailyWeather } from '../types';
import { sceneWeather, terrainFor } from './scene';

const d = (code: number): DailyWeather => ({ date: '2026-11-27', code, maxC: 10, minC: 2, precipChance: 0 });

describe('terrainFor', () => {
  it('maps elevation to a landscape', () => {
    expect(terrainFor(650)).toBe('mountains');
    expect(terrainFor(200)).toBe('hills');
    expect(terrainFor(5)).toBe('lowland');
  });
});

describe('sceneWeather', () => {
  it('shows the most dramatic day of the trip', () => {
    expect(sceneWeather([d(0), d(1)])).toBe('sunny');
    expect(sceneWeather([d(0), d(3)])).toBe('cloudy');
    expect(sceneWeather([d(0), d(63), d(45)])).toBe('wet');
    expect(sceneWeather([d(71), d(63)])).toBe('snow');
    expect(sceneWeather([d(95), d(71)])).toBe('storm');
    expect(sceneWeather([])).toBe('sunny');
  });
});
