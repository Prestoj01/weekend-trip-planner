import { useEffect, useState } from 'react';
import { fetchSuggestions } from '../lib/api';
import { formatDay } from '../lib/dates';
import { formatDistance } from '../lib/geo';
import { Check, Plus, Star } from 'lucide-react';
import type { Place, Suggestion } from '../types';
import { CategoryIcon, ICON_STROKE } from './icons';

type Category = 'sight' | 'outdoors' | 'food';
const TABS: { id: Category; label: string }[] = [
  { id: 'sight', label: 'Sights' },
  { id: 'outdoors', label: 'Outdoors' },
  { id: 'food', label: 'Food & drink' },
];

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: Suggestion[] };

interface Props {
  destination: Place;
  days: string[];
  addedTitles: Set<string>;
  targetDay: string;
  onTargetDayChange: (d: string) => void;
  onAdd: (s: Suggestion) => void;
  onLoaded: (items: Suggestion[]) => void;
  onFocus: (s: Suggestion) => void;
}

/** "Things to do nearby", powered by OpenStreetMap data via the Overpass API. */
export function Suggestions({ destination, days, addedTitles, targetDay, onTargetDayChange, onAdd, onLoaded, onFocus }: Props) {
  const [tab, setTab] = useState<Category>('sight');
  const [cache, setCache] = useState<Partial<Record<Category, Load>>>({});
  const [attempt, setAttempt] = useState(0);
  const current = cache[tab];

  useEffect(() => {
    if (current?.status === 'ready' || current?.status === 'error') return;
    const ctrl = new AbortController();
    setCache((c) => ({ ...c, [tab]: { status: 'loading' } }));
    fetchSuggestions(tab, destination, ctrl.signal)
      .then((items) => setCache((c) => ({ ...c, [tab]: { status: 'ready', items } })))
      .catch(() => !ctrl.signal.aborted && setCache((c) => ({ ...c, [tab]: { status: 'error' } })));
    return () => ctrl.abort();
    // `current` intentionally excluded: we only (re)fetch on tab change or explicit retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, destination, attempt]);

  useEffect(() => {
    onLoaded(current?.status === 'ready' ? current.items : []);
  }, [current, onLoaded]);

  return (
    <section className="card suggestions">
      <header className="section-head">
        <h2>Things to do nearby</h2>
        <label className="inline-select">
          Add to
          <select value={targetDay} onChange={(e) => onTargetDayChange(e.target.value)}>
            {days.map((d) => (
              <option key={d} value={d}>
                {formatDay(d).weekday}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            <CategoryIcon category={t.id} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-live="polite" className="suggestion-panel">
        {(!current || current.status === 'loading') && (
          <ul className="suggestion-list">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="skeleton" />
            ))}
          </ul>
        )}
        {current?.status === 'error' && (
          <div className="empty">
            <p>OpenStreetMap is busy right now.</p>
            <button
              className="btn ghost small"
              onClick={() => {
                setCache((c) => ({ ...c, [tab]: undefined }));
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </button>
          </div>
        )}
        {current?.status === 'ready' && current.items.length === 0 && <p className="empty">Nothing found nearby.</p>}
        {current?.status === 'ready' && current.items.length > 0 && (
          <ul className="suggestion-list">
            {current.items.map((s) => {
              const added = addedTitles.has(s.name.toLowerCase());
              return (
                <li key={s.id}>
                  <button className="suggestion-name" onClick={() => onFocus(s)} title="Show on map">
                    <strong>
                      {s.name}
                      {s.notable && (
                        <Star size={13} strokeWidth={ICON_STROKE} className="star" aria-label="Notable place" />
                      )}
                    </strong>
                    <span className="muted">
                      {s.kind} · {formatDistance(s.distanceKm)}
                    </span>
                  </button>
                  <button
                    className="btn ghost small"
                    disabled={added}
                    onClick={() => onAdd(s)}
                    aria-label={added ? `${s.name} added` : `Add ${s.name}`}
                  >
                    {added ? <Check size={15} strokeWidth={ICON_STROKE} aria-hidden /> : <Plus size={15} strokeWidth={ICON_STROKE} aria-hidden />}
                    {added ? 'Added' : 'Add'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="credit">Places from © OpenStreetMap contributors</p>
    </section>
  );
}
