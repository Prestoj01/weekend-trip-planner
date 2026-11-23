import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForecast, useTempUnit } from '../hooks';
import { useOffscreenPause } from '../hooks/useOffscreenPause';
import { addDays, daysUntil, eachDay, formatRange, formatTime, MAX_TRIP_DAYS } from '../lib/dates';
import { newId } from '../lib/storage';
import { rescheduleTrip } from '../lib/trip';
import { placeLabel } from '../lib/labels';
import { describeWeather, formatTemp } from '../lib/weather';
import { CalendarDays, Compass, Droplets, MapPin, Sunrise, Sunset, Users } from 'lucide-react';
import { loadSuggestions } from '../lib/api';
import { planWeekend, type PlacePool } from '../lib/planner';
import { sampleSuggestions } from '../lib/sample';
import { useToast } from './Toast';
import type { Activity, Suggestion, Trip } from '../types';
import { Budget } from './Budget';
import { Itinerary } from './Itinerary';
import { Packing } from './Packing';
import { Suggestions } from './Suggestions';
import { ICON_STROKE, WeatherIcon } from './icons';

// Leaflet is the heaviest dependency; load it only when a trip page is shown.
const TripMap = lazy(() => import('./TripMap').then((m) => ({ default: m.TripMap })));

interface Props {
  trip: Trip;
  /** Omit for a read-only view (e.g. a shared link). */
  onChange?: (trip: Trip) => void;
  actions?: React.ReactNode;
}

export function TripView({ trip, onChange, actions }: Props) {
  const days = useMemo(() => eachDay(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);
  const forecastState = useForecast(trip.destination.lat, trip.destination.lon);
  const forecast = forecastState.status === 'ready' ? forecastState.days.filter((d) => days.includes(d.date)) : [];
  const [unit, setUnit] = useTempUnit();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [focus, setFocus] = useState<{ lat: number; lon: number; key: number } | null>(null);
  const [targetDay, setTargetDay] = useState(days[0]);
  const [editingDates, setEditingDates] = useState(false);
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const [planning, setPlanning] = useState(false);
  const toast = useToast();
  const { ref: weatherRef } = useOffscreenPause<HTMLElement>();

  // Delayed callbacks (e.g. Undo in a toast) must apply to the latest trip, not the one they closed over.
  const latest = useRef(trip);
  useEffect(() => {
    latest.current = trip;
  });
  const update = (patch: Partial<Trip> | ((t: Trip) => Partial<Trip>)) =>
    onChange?.({ ...latest.current, ...(typeof patch === 'function' ? patch(latest.current) : patch) });
  const focusOn = useCallback((lat: number, lon: number) => {
    setFocus({ lat, lon, key: Date.now() });
    document.querySelector('.map-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const addSuggestion = (s: Suggestion) => {
    const day = days.includes(targetDay) ? targetDay : days[0];
    const activity: Activity = {
      id: newId(),
      date: day,
      title: s.name,
      category: s.category,
      location: { lat: s.lat, lon: s.lon },
    };
    update({ activities: [...trip.activities, activity] });
    setHighlightIds([activity.id]);
  };

  const planMyWeekend = async () => {
    setPlanning(true);
    try {
      const cats = ['sight', 'outdoors', 'food'] as const;
      const results = await Promise.allSettled(
        cats.map((c) => loadSuggestions(c, trip.destination, { fallback: sampleSuggestions(c, trip.destination) })),
      );
      const pool = Object.fromEntries(
        cats.map((c, i) => [c, results[i].status === 'fulfilled' ? results[i].value : []]),
      ) as PlacePool;
      if (cats.every((c) => pool[c].length === 0)) {
        toast("Couldn't reach OpenStreetMap — try again in a minute");
        return;
      }
      const plan = planWeekend({ days, forecast, pool, existing: latest.current.activities });
      if (plan.length === 0) {
        toast('Your weekend is already full');
        return;
      }
      const ids = plan.map((a) => a.id);
      update((t) => ({ activities: [...t.activities, ...plan] }));
      setHighlightIds(ids);
      toast(`Added ${plan.length} stops`, {
        action: {
          label: 'Undo',
          run: () => update((t) => ({ activities: t.activities.filter((a) => !ids.includes(a.id)) })),
        },
      });
    } finally {
      setPlanning(false);
    }
  };

  // Planner meals are titled "Lunch at X" / "Dinner at X"; count X as added too.
  const addedTitles = useMemo(
    () => new Set(trip.activities.map((a) => a.title.toLowerCase().replace(/^(lunch|dinner) at /, ''))),
    [trip.activities],
  );
  const until = daysUntil(trip.startDate);

  return (
    <main className="trip">
      <header className="trip-head">
        <div className="trip-title">
          {onChange ? (
            <input
              className="title-input"
              aria-label="Trip name"
              value={trip.name}
              maxLength={60}
              onChange={(e) => update({ name: e.target.value })}
              onBlur={(e) => !e.target.value.trim() && update({ name: `Weekend in ${trip.destination.name}` })}
            />
          ) : (
            <h1>{trip.name}</h1>
          )}
          <p className="trip-meta">
            <span className="with-icon">
              <MapPin size={16} strokeWidth={ICON_STROKE} aria-hidden />
              {placeLabel(trip.destination)}
            </span>
            {editingDates && onChange ? (
              <DateEditor trip={trip} onDone={() => setEditingDates(false)} onChange={onChange} />
            ) : (
              <span className="with-icon">
                <CalendarDays size={16} strokeWidth={ICON_STROKE} aria-hidden />
                {formatRange(trip.startDate, trip.endDate)}
                {onChange && (
                  <button className="link-btn" onClick={() => setEditingDates(true)}>
                    change
                  </button>
                )}
              </span>
            )}
            <span className="with-icon">
              <Users size={16} strokeWidth={ICON_STROKE} aria-hidden />
              {onChange ? (
                <input
                  className="inline-number"
                  type="number"
                  aria-label="Travelers"
                  min={1}
                  max={20}
                  value={trip.travelers}
                  onChange={(e) => update({ travelers: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                />
              ) : (
                trip.travelers
              )}{' '}
              {trip.travelers === 1 ? 'traveler' : 'travelers'}
            </span>
          </p>
        </div>
        {actions && <div className="trip-actions">{actions}</div>}
      </header>

      <section className="card weather" aria-live="polite" ref={weatherRef}>
        <header className="section-head">
          <h2>Weather in {trip.destination.name}</h2>
          <div className="unit-toggle" role="group" aria-label="Temperature unit">
            {(['F', 'C'] as const).map((u) => (
              <button
                key={u}
                aria-pressed={unit === u}
                className={unit === u ? 'active' : ''}
                onClick={() => setUnit(u)}
              >
                °{u}
              </button>
            ))}
          </div>
        </header>
        {forecastState.status === 'loading' && (
          <ul className="forecast" aria-label="Loading forecast">
            {days.map((d) => (
              <li key={d} className="skeleton forecast-skeleton" />
            ))}
          </ul>
        )}
        {forecastState.status === 'error' && <p className="muted">Forecast unavailable right now.</p>}
        {forecastState.status === 'ready' && forecast.length === 0 && (
          <p className="muted">
            {until > 15
              ? `Forecasts are available up to 16 days out — check back in ${until - 15} days.`
              : 'No forecast available for these dates.'}
          </p>
        )}
        {forecast.length > 0 && (
          <ul className="forecast">
            {forecast.map((d) => {
              const { kind, label } = describeWeather(d.code);
              return (
                <li key={d.date} className={`wx wx-${kind}`}>
                  <span className="wx-fx" aria-hidden />
                  <span className="muted">
                    {new Date(d.date + 'T12:00').toLocaleDateString(undefined, { weekday: 'short' })}
                  </span>
                  <WeatherIcon kind={kind} size={32} className="wx-icon" />
                  <span className="wx-label">{label}</span>
                  <span>
                    <strong>{formatTemp(d.maxC, unit)}</strong>{' '}
                    <span className="muted">{formatTemp(d.minC, unit)}</span>
                  </span>
                  <span className="muted small with-icon">
                    <Droplets size={13} strokeWidth={ICON_STROKE} aria-label="Chance of rain" />
                    {d.precipChance}%
                  </span>
                  {d.sunrise && d.sunset && (
                    <span className="sun-times small">
                      <span className="with-icon" title="Sunrise">
                        <Sunrise size={13} strokeWidth={ICON_STROKE} aria-label="Sunrise" />
                        {formatTime(d.sunrise)}
                      </span>
                      <span className="with-icon" title="Sunset">
                        <Sunset size={13} strokeWidth={ICON_STROKE} aria-label="Sunset" />
                        {formatTime(d.sunset)}
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="trip-grid-layout">
        <div className="col-main">
          {onChange && (
            <div className="plan-bar">
              <button
                className={`btn primary plan-btn${planning ? ' is-planning' : ''}`}
                onClick={planMyWeekend}
                disabled={planning}
              >
                <Compass size={18} strokeWidth={2} aria-hidden className="plan-icon" />
                {planning ? 'Planning…' : 'Plan my weekend'}
              </button>
              <p className="muted small">Fills open time slots with nearby places — indoor picks on rainy days.</p>
            </div>
          )}
          <Itinerary
            highlightIds={highlightIds}
            days={days}
            activities={trip.activities}
            forecast={forecast}
            unit={unit}
            onChange={onChange && ((activities) => update({ activities }))}
            onRestore={(a) => update((t) => ({ activities: [...t.activities, a] }))}
            onFocus={(a) => a.location && focusOn(a.location.lat, a.location.lon)}
          />
        </div>
        <aside className="col-side">
          <Suspense fallback={<div className="map-wrap map-loading skeleton" aria-label="Loading map" />}>
            <TripMap
              destination={trip.destination}
              days={days}
              activities={trip.activities}
              suggestions={onChange ? suggestions : []}
              focus={focus}
              onAddSuggestion={onChange && addSuggestion}
            />
          </Suspense>
          {onChange && (
            <Suggestions
              destination={trip.destination}
              days={days}
              addedTitles={addedTitles}
              targetDay={days.includes(targetDay) ? targetDay : days[0]}
              onTargetDayChange={setTargetDay}
              onAdd={addSuggestion}
              onLoaded={setSuggestions}
              onFocus={(s) => focusOn(s.lat, s.lon)}
            />
          )}
        </aside>
      </div>

      <div className="two-up">
        <Packing
          items={trip.packing}
          forecast={forecast}
          onChange={onChange && ((packing) => update({ packing }))}
          onRestore={(item, index) =>
            update((t) => ({ packing: [...t.packing.slice(0, index), item, ...t.packing.slice(index)] }))
          }
        />
        <Budget trip={trip} />
      </div>
    </main>
  );
}

function DateEditor({ trip, onChange, onDone }: { trip: Trip; onChange: (t: Trip) => void; onDone: () => void }) {
  const [start, setStart] = useState(trip.startDate);
  const [end, setEnd] = useState(trip.endDate);
  const length = eachDay(start, end).length;
  const valid = start && end && end >= start && length <= MAX_TRIP_DAYS;

  return (
    <form
      className="date-editor"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onChange(rescheduleTrip(trip, start, end));
        onDone();
      }}
    >
      <input
        type="date"
        aria-label="Start date"
        value={start}
        onChange={(e) => {
          const v = e.target.value;
          setStart(v);
          // Keep the same trip length when moving the start date.
          if (v) setEnd(addDays(v, eachDay(trip.startDate, trip.endDate).length - 1));
        }}
      />
      <span>→</span>
      <input type="date" aria-label="End date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} />
      <button className="btn primary small" disabled={!valid}>
        Save
      </button>
      <button type="button" className="btn ghost small" onClick={onDone}>
        Cancel
      </button>
      {!valid && <span className="field-error">Up to {MAX_TRIP_DAYS} days</span>}
    </form>
  );
}
