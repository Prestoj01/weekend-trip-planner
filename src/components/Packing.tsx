import { useState } from 'react';
import { weatherSuggestions } from '../lib/packing';
import { newId } from '../lib/storage';
import { X } from 'lucide-react';
import type { DailyWeather, PackingItem } from '../types';
import { Confetti } from './Confetti';
import { ICON_STROKE } from './icons';

interface Props {
  items: PackingItem[];
  forecast: DailyWeather[];
  onChange?: (items: PackingItem[]) => void;
}

export function Packing({ items, forecast, onChange }: Props) {
  const [draft, setDraft] = useState('');
  const [celebrations, setCelebrations] = useState(0);
  const have = new Set(items.map((i) => i.label.toLowerCase()));
  const suggested = weatherSuggestions(forecast).filter((s) => !have.has(s.toLowerCase()));
  const packed = items.filter((i) => i.packed).length;

  const add = (label: string) => {
    const l = label.trim();
    if (!l || have.has(l.toLowerCase())) return;
    onChange?.([...items, { id: newId(), label: l, packed: false }]);
  };

  return (
    <section className="card packing">
      <header className="section-head">
        <h2>What to pack</h2>
        <span className="muted">
          {packed}/{items.length} packed
        </span>
      </header>
      <div className="progress" aria-hidden>
        <span style={{ width: `${items.length ? (packed / items.length) * 100 : 0}%` }} />
      </div>

      {onChange && suggested.length > 0 && (
        <div className="chips">
          <span className="muted">Based on the forecast:</span>
          {suggested.map((s) => (
            <button key={s} className="chip" onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}

      {celebrations > 0 && packed === items.length && (
        <p className="all-packed" key={celebrations}>
          <Confetti />
          All packed — have a great trip!
        </p>
      )}

      <ul className="checklist">
        {items.map((item) => (
          <li key={item.id} className={item.packed ? 'done' : undefined}>
            <label>
              <input
                type="checkbox"
                checked={item.packed}
                disabled={!onChange}
                onChange={() => {
                  const next = items.map((i) => (i.id === item.id ? { ...i, packed: !i.packed } : i));
                  if (!item.packed && next.every((i) => i.packed)) setCelebrations((n) => n + 1);
                  onChange?.(next);
                }}
              />
              {item.label}
            </label>
            {item.packed && (
              <span className="stamp" aria-hidden>
                Packed
              </span>
            )}
            {onChange && (
              <button
                className="icon-btn"
                aria-label={`Remove ${item.label}`}
                onClick={() => onChange(items.filter((i) => i.id !== item.id))}
              >
                <X size={15} strokeWidth={ICON_STROKE} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>

      {onChange && (
        <form
          className="row tight"
          onSubmit={(e) => {
            e.preventDefault();
            add(draft);
            setDraft('');
          }}
        >
          <input
            aria-label="New packing item"
            placeholder="Add an item…"
            value={draft}
            maxLength={60}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="btn ghost small" type="submit" disabled={!draft.trim()}>
            Add
          </button>
        </form>
      )}
    </section>
  );
}
