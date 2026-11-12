import { useState } from 'react';
import { formatDay } from '../lib/dates';
import { CATEGORY_LABELS } from '../lib/labels';
import type { Activity, ActivityCategory } from '../types';

interface Props {
  initial?: Activity;
  date: string;
  days: string[];
  onSave: (a: Omit<Activity, 'id'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function ActivityForm({ initial, date, days, onSave, onCancel, onDelete }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [time, setTime] = useState(initial?.time ?? '');
  const [day, setDay] = useState(initial?.date ?? date);
  const [cost, setCost] = useState(initial?.cost?.toString() ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [category, setCategory] = useState<ActivityCategory>(initial?.category ?? 'other');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const parsedCost = Number.parseFloat(cost);
    onSave({
      title: title.trim(),
      date: day,
      time: time || undefined,
      cost: Number.isFinite(parsedCost) && parsedCost > 0 ? Math.round(parsedCost * 100) / 100 : undefined,
      notes: notes.trim() || undefined,
      category,
      location: initial?.location,
    });
  };

  return (
    <form className="activity-form" onSubmit={submit} onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <input
        aria-label="Activity"
        placeholder="What are you doing?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
        autoFocus
        required
      />
      <div className="row tight">
        <input aria-label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <div className="money">
          <span aria-hidden>$</span>
          <input
            aria-label="Cost"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="Cost"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
        <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value as ActivityCategory)}>
          {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {initial && days.length > 1 && (
        <select aria-label="Day" value={day} onChange={(e) => setDay(e.target.value)}>
          {days.map((d) => {
            const f = formatDay(d);
            return (
              <option key={d} value={d}>
                {f.weekday}, {f.label}
              </option>
            );
          })}
        </select>
      )}
      <textarea
        aria-label="Notes"
        placeholder="Notes (optional)"
        rows={2}
        value={notes}
        maxLength={500}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="actions">
        <button type="submit" className="btn primary small">
          {initial ? 'Save' : 'Add'}
        </button>
        <button type="button" className="btn ghost small" onClick={onCancel}>
          Cancel
        </button>
        {onDelete && (
          <button type="button" className="btn danger small push-right" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
