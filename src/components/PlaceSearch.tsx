import { useEffect, useId, useRef, useState } from 'react';
import { searchPlaces } from '../lib/api';
import { placeLabel } from '../lib/labels';
import type { Place } from '../types';

interface Props {
  id?: string;
  value: Place | null;
  onChange: (place: Place | null) => void;
}

/** Debounced, keyboard-navigable city autocomplete (ARIA combobox pattern). */
export function PlaceSearch({ id, value, onChange }: Props) {
  const [query, setQuery] = useState(value ? placeLabel(value) : '');
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const listId = useId();
  const skipNext = useRef(false);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    if (query.trim().length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setStatus('loading');
      searchPlaces(query, ctrl.signal)
        .then((r) => {
          setResults(r);
          setActive(0);
          setOpen(true);
          setStatus('idle');
        })
        .catch(() => !ctrl.signal.aborted && setStatus('error'));
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const choose = (p: Place) => {
    skipNext.current = true;
    setQuery(placeLabel(p));
    setOpen(false);
    onChange(p);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="combo">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        placeholder="Search a city or town…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.trim().length < 2) {
            setResults([]);
            setOpen(false);
          }
          if (value) onChange(null);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        required
      />
      {status === 'loading' && <span className="combo-spinner" aria-hidden />}
      {open && (
        <ul className="combo-list" id={listId} role="listbox">
          {results.length === 0 ? (
            <li className="combo-empty">No places found</li>
          ) : (
            results.map((p, i) => (
              <li
                key={`${p.lat},${p.lon}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'active' : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
                onMouseEnter={() => setActive(i)}
              >
                <strong>{p.name}</strong>
                <span>{[p.region, p.country].filter(Boolean).join(', ')}</span>
              </li>
            ))
          )}
        </ul>
      )}
      {status === 'error' && <p className="field-error">Couldn't reach the place search. Try again.</p>}
    </div>
  );
}
