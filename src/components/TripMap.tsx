import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Fragment, useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { formatTime } from '../lib/dates';
import { DAY_COLORS, sortActivities } from '../lib/trip';
import type { Activity, Place, Suggestion } from '../types';
import { CategoryIcon } from './icons';

interface Props {
  destination: Place;
  days: string[];
  activities: Activity[];
  suggestions: Suggestion[];
  focus: { lat: number; lon: number; key: number } | null;
  onAddSuggestion?: (s: Suggestion) => void;
}

// Cache icons so re-renders reuse the same DOM (and the drop-in animation only plays once).
const pinIcons = new Map<string, L.DivIcon>();
const pinIcon = (color: string, label: string, delay: number) => {
  const key = `${color}|${label}|${delay}`;
  let icon = pinIcons.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: '',
      html: `<span class="map-pin" style="--pin:${color};animation-delay:${delay}ms"><b>${label}</b></span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -26],
    });
    pinIcons.set(key, icon);
  }
  return icon;
};

/** Let CSS animate the draw in 0→1 units regardless of the line's on-screen length. */
const normalizePathLength = (e: L.LeafletEvent) => (e.target as L.Path).getElement()?.setAttribute('pathLength', '1');

const travellerIcon = (color: string) =>
  L.divIcon({ className: '', html: `<span class="traveller" style="--pin:${color}"></span>`, iconSize: [16, 16] });

/** A marker that glides along a day's route, pausing at the end before looping. */
function Traveller({ points, color, delayMs }: { points: [number, number][]; color: string; delayMs: number }) {
  const ref = useRef<L.Marker>(null);
  const icon = useMemo(() => travellerIcon(color), [color]);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const segs = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
    const total = segs.reduce((a, b) => a + b, 0);
    if (total === 0) return;
    const travelMs = 2500 + points.length * 900;
    const cycleMs = travelMs + 1500;
    let frame = 0;
    const startAt = performance.now() + delayMs;

    const tick = (now: number) => {
      const t = Math.max(0, now - startAt) % cycleMs;
      // ease-in-out along the whole route
      const x = Math.min(1, t / travelMs);
      const eased = x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
      let dist = eased * total;
      let i = 0;
      while (i < segs.length - 1 && dist > segs[i]) dist -= segs[i++];
      const f = segs[i] === 0 ? 0 : Math.min(1, dist / segs[i]);
      const [a, b] = [points[i], points[i + 1]];
      ref.current?.setLatLng([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [points, delayMs]);

  return <Marker ref={ref} position={points[0]} icon={icon} interactive={false} keyboard={false} />;
}

const dotIcon = L.divIcon({ className: '', html: '<span class="map-dot"></span>', iconSize: [14, 14] });
const homeIcon = L.divIcon({
  className: '',
  html: '<span class="map-home"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = JSON.stringify(points);
  useEffect(() => {
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
    else if (points.length === 1) map.setView(points[0], 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

function FlyTo({ focus }: { focus: Props['focus'] }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lon], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [focus, map]);
  return null;
}

export function TripMap({ destination, days, activities, suggestions, focus, onAddSuggestion }: Props) {
  const pins = useMemo(
    () =>
      days.flatMap((date, i) =>
        sortActivities(activities.filter((a) => a.date === date && a.location)).map((a, n) => ({
          a,
          color: DAY_COLORS[i % DAY_COLORS.length],
          label: String(n + 1),
          delay: i * 450 + n * 120,
        })),
      ),
    [days, activities],
  );

  const routes = useMemo(
    () =>
      days
        .map((date, i) => ({
          date,
          index: i,
          color: DAY_COLORS[i % DAY_COLORS.length],
          points: sortActivities(activities.filter((a) => a.date === date && a.location)).map(
            (a) => [a.location!.lat, a.location!.lon] as [number, number],
          ),
        }))
        .filter((r) => r.points.length >= 2),
    [days, activities],
  );

  const points: [number, number][] = [
    [destination.lat, destination.lon],
    ...pins.map(({ a }) => [a.location!.lat, a.location!.lon] as [number, number]),
  ];

  return (
    <div className="map-wrap">
      <MapContainer center={[destination.lat, destination.lon]} zoom={12} scrollWheelZoom={false} className="map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        <FlyTo focus={focus} />
        <Marker position={[destination.lat, destination.lon]} icon={homeIcon} title={destination.name} />
        {suggestions.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lon]} icon={dotIcon} title={s.name}>
            <Popup>
              <strong>{s.name}</strong>
              <br />
              <span className="muted">{s.kind}</span>
              {onAddSuggestion && (
                <>
                  <br />
                  <button className="btn primary small popup-btn" onClick={() => onAddSuggestion(s)}>
                    + Add to itinerary
                  </button>
                </>
              )}
            </Popup>
          </Marker>
        ))}
        {routes.map((r) => (
          <Fragment key={`${r.date}:${JSON.stringify(r.points)}`}>
            <Polyline
              positions={r.points}
              pathOptions={{
                color: r.color,
                weight: 5,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
                className: `route-draw route-day-${r.index}`,
              }}
              eventHandlers={{ add: normalizePathLength }}
            />
            <Polyline
              positions={r.points}
              pathOptions={{
                color: '#fff9ef',
                weight: 2,
                dashArray: '1 9',
                lineCap: 'round',
                className: `route-ants route-day-${r.index}`,
              }}
            />
            <Traveller points={r.points} color={r.color} delayMs={r.index * 450 + 2200} />
          </Fragment>
        ))}
        {pins.map(({ a, color, label, delay }) => (
          <Marker
            key={a.id}
            position={[a.location!.lat, a.location!.lon]}
            icon={pinIcon(color, label, delay)}
            title={a.title}
          >
            <Popup>
              <strong className="popup-title">
                <CategoryIcon category={a.category} size={14} /> {a.title}
              </strong>
              {a.time && (
                <>
                  <br />
                  {formatTime(a.time)}
                </>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {days.length > 1 && (
        <ul className="map-legend">
          {days.map((d, i) => (
            <li key={d}>
              <span className="swatch" style={{ background: DAY_COLORS[i % DAY_COLORS.length] }} />
              Day {i + 1}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
