import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { formatTime } from '../lib/dates';
import { DAY_COLORS, sortActivities } from '../lib/trip';
import type { Activity, Place, Suggestion } from '../types';
import { CATEGORY_META } from '../lib/labels';

interface Props {
  destination: Place;
  days: string[];
  activities: Activity[];
  suggestions: Suggestion[];
  focus: { lat: number; lon: number; key: number } | null;
  onAddSuggestion?: (s: Suggestion) => void;
}

const pinIcon = (color: string, label: string) =>
  L.divIcon({
    className: '',
    html: `<span class="map-pin" style="--pin:${color}"><b>${label}</b></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });

const dotIcon = L.divIcon({ className: '', html: '<span class="map-dot"></span>', iconSize: [14, 14] });
const homeIcon = L.divIcon({
  className: '',
  html: '<span class="map-home">★</span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
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
        })),
      ),
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
        {pins.map(({ a, color, label }) => (
          <Marker key={a.id} position={[a.location!.lat, a.location!.lon]} icon={pinIcon(color, label)} title={a.title}>
            <Popup>
              <strong>
                {CATEGORY_META[a.category].icon} {a.title}
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
