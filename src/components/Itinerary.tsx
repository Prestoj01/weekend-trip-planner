import { useState } from 'react';
import { formatDay, formatTime } from '../lib/dates';
import { newId } from '../lib/storage';
import { DAY_COLORS, formatMoney, sortActivities } from '../lib/trip';
import { describeWeather, formatTemp } from '../lib/weather';
import type { Activity, DailyWeather, TempUnit } from '../types';
import { Pencil } from 'lucide-react';
import { CATEGORY_LABELS } from '../lib/labels';
import { ActivityForm } from './ActivityForm';
import { CategoryIcon, ICON_STROKE, WeatherIcon } from './icons';

interface Props {
  days: string[];
  activities: Activity[];
  forecast: DailyWeather[];
  unit: TempUnit;
  onChange?: (activities: Activity[]) => void;
  /** Omit to render map pins as static labels (e.g. in a preview). */
  onFocus?: (a: Activity) => void;
}

type Editing = { mode: 'new'; date: string } | { mode: 'edit'; id: string } | null;

export function Itinerary({ days, activities, forecast, unit, onChange, onFocus }: Props) {
  const [editing, setEditing] = useState<Editing>(null);

  const add = (a: Omit<Activity, 'id'>) => {
    onChange?.([...activities, { ...a, id: newId() }]);
    setEditing(null);
  };
  const save = (id: string, a: Omit<Activity, 'id'>) => {
    onChange?.(activities.map((x) => (x.id === id ? { ...a, id } : x)));
    setEditing(null);
  };
  const remove = (id: string) => {
    onChange?.(activities.filter((x) => x.id !== id));
    setEditing(null);
  };

  return (
    <div className="itinerary">
      {days.map((date, dayIndex) => {
        const { weekday, label } = formatDay(date);
        const items = sortActivities(activities.filter((a) => a.date === date));
        const wx = forecast.find((f) => f.date === date);
        const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
        let pin = 0;

        return (
          <section key={date} className="card day" style={{ '--day-color': color } as React.CSSProperties}>
            <header className="day-head">
              <div>
                <h3>{weekday}</h3>
                <span className="muted">{label}</span>
              </div>
              {wx && (
                <div className="day-wx" title={describeWeather(wx.code).label}>
                  <WeatherIcon kind={describeWeather(wx.code).kind} size={18} />
                  <span>
                    {formatTemp(wx.maxC, unit)} / <span className="muted">{formatTemp(wx.minC, unit)}</span>
                  </span>
                </div>
              )}
            </header>

            {items.length === 0 && editing?.mode !== 'new' && <p className="empty">Nothing planned yet.</p>}

            <ol className="activities">
              {items.map((a) => {
                if (a.location) pin += 1;
                if (editing?.mode === 'edit' && editing.id === a.id) {
                  return (
                    <li key={a.id}>
                      <ActivityForm
                        initial={a}
                        date={date}
                        days={days}
                        onSave={(v) => save(a.id, v)}
                        onCancel={() => setEditing(null)}
                        onDelete={() => remove(a.id)}
                      />
                    </li>
                  );
                }
                return (
                  <li key={a.id} className="activity">
                    <span className="activity-time">{a.time && formatTime(a.time)}</span>
                    <div className="activity-body">
                      <div className="activity-title">
                        <CategoryIcon category={a.category} className="cat-icon" aria-label={CATEGORY_LABELS[a.category]} />
                        <strong>{a.title}</strong>
                        {a.location && !onFocus && <span className="pin">{pin}</span>}
                        {a.location && onFocus && (
                          <button
                            className="pin"
                            onClick={() => onFocus(a)}
                            title="Show on map"
                            aria-label={`Show ${a.title} on map`}
                          >
                            {pin}
                          </button>
                        )}
                      </div>
                      {a.notes && <p className="activity-notes">{a.notes}</p>}
                    </div>
                    {a.cost !== undefined && <span className="activity-cost">{formatMoney(a.cost)}</span>}
                    {onChange && (
                      <button
                        className="icon-btn"
                        onClick={() => setEditing({ mode: 'edit', id: a.id })}
                        aria-label={`Edit ${a.title}`}
                        title="Edit"
                      >
                        <Pencil size={15} strokeWidth={ICON_STROKE} aria-hidden />
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>

            {onChange &&
              (editing?.mode === 'new' && editing.date === date ? (
                <ActivityForm date={date} days={days} onSave={add} onCancel={() => setEditing(null)} />
              ) : (
                <button className="btn ghost small add-btn" onClick={() => setEditing({ mode: 'new', date })}>
                  + Add activity
                </button>
              ))}
          </section>
        );
      })}
    </div>
  );
}
