import { formatDay } from '../lib/dates';
import { computeBudget, DAY_COLORS, formatMoney } from '../lib/trip';
import type { Trip } from '../types';

export function Budget({ trip }: { trip: Trip }) {
  const { total, perPerson, byDay } = computeBudget(trip);
  const max = Math.max(1, ...byDay.map((d) => d.total));

  return (
    <section className="card budget">
      <header className="section-head">
        <h2>What it'll cost</h2>
      </header>
      <div className="budget-totals">
        <div>
          <span className="muted">Total</span>
          <strong>{formatMoney(total)}</strong>
        </div>
        <div>
          <span className="muted">Per person ({trip.travelers})</span>
          <strong>{formatMoney(perPerson)}</strong>
        </div>
      </div>
      <ul className="bars">
        {byDay.map((d, i) => (
          <li key={d.date}>
            <span className="bar-label">{formatDay(d.date).weekday.slice(0, 3)}</span>
            <span className="bar-track">
              <span
                className="bar-fill"
                style={{ width: `${(d.total / max) * 100}%`, background: DAY_COLORS[i % DAY_COLORS.length] }}
              />
            </span>
            <span className="bar-value">{formatMoney(d.total)}</span>
          </li>
        ))}
      </ul>
      {total === 0 && <p className="muted small">Add costs to activities to track spending.</p>}
    </section>
  );
}
