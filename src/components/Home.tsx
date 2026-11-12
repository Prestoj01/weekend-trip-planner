import { useState } from 'react';
import { navigate } from '../hooks';
import { addDays, daysUntil, eachDay, formatRange, MAX_TRIP_DAYS, nextWeekend } from '../lib/dates';
import { defaultPacking } from '../lib/packing';
import { sampleTrip } from '../lib/sample';
import { newId } from '../lib/storage';
import { MapPin, X } from 'lucide-react';
import type { Place, Trip } from '../types';
import { ICON_STROKE } from './icons';
import { Itinerary } from './Itinerary';
import { PlaceSearch } from './PlaceSearch';

interface Props {
  trips: Trip[];
  onCreate: (trip: Trip) => void;
  onDelete: (id: string) => void;
}

export function Home({ trips, onCreate, onDelete }: Props) {
  const weekend = nextWeekend();
  const [place, setPlace] = useState<Place | null>(null);
  const [name, setName] = useState('');
  const [start, setStart] = useState(weekend.start);
  const [end, setEnd] = useState(weekend.end);
  const [travelers, setTravelers] = useState(2);
  const [preview] = useState(sampleTrip);

  const tooLong = eachDay(start, end).length > MAX_TRIP_DAYS;
  const inverted = end < start;

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!place || tooLong || inverted) return;
    const trip: Trip = {
      id: newId(),
      name: name.trim() || `Weekend in ${place.name}`,
      destination: place,
      startDate: start,
      endDate: end,
      travelers,
      activities: [],
      packing: defaultPacking(eachDay(start, end).length),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onCreate(trip);
    navigate(`/trip/${trip.id}`);
  };

  const openSample = () => {
    const trip = sampleTrip();
    onCreate(trip);
    navigate(`/trip/${trip.id}`);
  };

  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <main className="home">
      <section className="hero">
        <h1>
          Your next weekend trip, <span className="accent">planned on one page</span>
        </h1>
        <p className="lede">
          The forecast, things to do nearby, and a day-by-day plan on a map — plus a packing list and budget. Share it
          with one link. Free, no sign-up.
        </p>
      </section>

      <div className="home-grid">
        <form className="card new-trip" onSubmit={create}>
          <h2 className="num">Plan a trip for {formatRange(start, end > start ? end : start)}</h2>
          <div className="field">
            <label htmlFor="destination">Where to?</label>
            <PlaceSearch id="destination" value={place} onChange={setPlace} />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="start">Leave</label>
              <input
                id="start"
                type="date"
                value={start}
                onChange={(e) => {
                  const v = e.target.value;
                  setStart(v);
                  if (v && (end < v || eachDay(v, end).length > MAX_TRIP_DAYS)) setEnd(addDays(v, 2));
                }}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="end">Return</label>
              <input id="end" type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
            <div className="field narrow">
              <label htmlFor="travelers">Travelers</label>
              <input
                id="travelers"
                type="number"
                min={1}
                max={20}
                value={travelers}
                onChange={(e) => setTravelers(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="trip-name">
              Trip name <span className="muted">(optional)</span>
            </label>
            <input
              id="trip-name"
              type="text"
              maxLength={60}
              placeholder={place ? `Weekend in ${place.name}` : 'e.g. Anniversary trip'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {tooLong && <p className="field-error">Weekend trips max out at {MAX_TRIP_DAYS} days.</p>}
          <div className="actions">
            <button type="submit" className="btn primary large" disabled={!place || tooLong || inverted}>
              Start planning
            </button>
            <button type="button" className="link-btn" onClick={openSample}>
              or explore a sample trip
            </button>
          </div>
        </form>

        <figure className="preview">
          <Itinerary days={[addDays(preview.startDate, 1)]} activities={preview.activities} forecast={[]} unit="F" />
          <figcaption className="muted small">
            A Saturday from the sample trip, rendered by the real planner.
          </figcaption>
        </figure>
      </div>

      {sorted.length > 0 && (
        <section className="saved">
          <h2>Your trips</h2>
          <ul className="trip-grid">
            {sorted.map((t) => {
              const past = daysUntil(t.endDate) < 0;
              return (
                <li key={t.id} className={`card trip-card${past ? ' past' : ''}`}>
                  <a href={`#/trip/${t.id}`} className="trip-card-link">
                    <h3>{t.name}</h3>
                    <p className="with-icon">
                      <MapPin size={15} strokeWidth={ICON_STROKE} aria-hidden /> {t.destination.name}
                    </p>
                    <p className="muted num">
                      {formatRange(t.startDate, t.endDate)} · {t.activities.length}{' '}
                      {t.activities.length === 1 ? 'plan' : 'plans'}
                    </p>
                  </a>
                  <button
                    className="icon-btn"
                    aria-label={`Delete ${t.name}`}
                    title="Delete trip"
                    onClick={() => confirm(`Delete "${t.name}"?`) && onDelete(t.id)}
                  >
                    <X size={16} strokeWidth={ICON_STROKE} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
