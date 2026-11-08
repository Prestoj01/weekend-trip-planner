import { useCallback, useEffect, useState } from 'react';
import { fetchForecast } from '../lib/api';
import { loadTrips, saveTrips } from '../lib/storage';
import type { DailyWeather, TempUnit, Trip } from '../types';

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>(loadTrips);

  useEffect(() => saveTrips(trips), [trips]);

  // Keep multiple open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith('wtp:trips')) setTrips(loadTrips());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const upsert = useCallback((trip: Trip) => {
    const stamped = { ...trip, updatedAt: Date.now() };
    setTrips((prev) => {
      const i = prev.findIndex((t) => t.id === trip.id);
      if (i === -1) return [stamped, ...prev];
      const next = [...prev];
      next[i] = stamped;
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => setTrips((prev) => prev.filter((t) => t.id !== id)), []);

  return { trips, upsert, remove };
}

export function useHashRoute(): string[] {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const navigate = (path: string) => {
  window.location.hash = path;
};

type ForecastState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; days: DailyWeather[] };

export function useForecast(lat: number, lon: number): ForecastState {
  const key = `${lat},${lon}`;
  // Results are tagged with the location they belong to, so a stale result reads as "loading".
  const [result, setResult] = useState<{ key: string; state: ForecastState } | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    fetchForecast(lat, lon, ctrl.signal)
      .then((days) => setResult({ key, state: { status: 'ready', days } }))
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setResult({ key, state: { status: 'error', message: err instanceof Error ? err.message : 'Failed' } });
      });
    return () => ctrl.abort();
  }, [key, lat, lon]);
  return result?.key === key ? result.state : { status: 'loading' };
}

export function useTempUnit(): [TempUnit, (u: TempUnit) => void] {
  const [unit, setUnit] = useState<TempUnit>(() => {
    const stored = localStorage.getItem('wtp:unit');
    if (stored === 'F' || stored === 'C') return stored;
    return ['US', 'LR', 'MM'].some((c) => navigator.language.endsWith(c)) ? 'F' : 'C';
  });
  const update = useCallback((u: TempUnit) => {
    localStorage.setItem('wtp:unit', u);
    setUnit(u);
  }, []);
  return [unit, update];
}
