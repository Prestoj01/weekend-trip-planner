import { useEffect, useState } from 'react';
import { Home } from './components/Home';
import { TripView } from './components/TripView';
import { navigate, useHashRoute, useTrips } from './hooks';
import { buildIcs, downloadFile } from './lib/ics';
import { decodeTrip, encodeTrip, newId } from './lib/storage';
import { Ticket } from 'lucide-react';
import type { Trip } from './types';

export default function App() {
  const route = useHashRoute();
  const { trips, upsert, remove } = useTrips();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const [page, param] = route;
  let content: React.ReactNode;

  if (page === 'trip') {
    const trip = trips.find((t) => t.id === param);
    content = trip ? (
      <TripView
        key={trip.id}
        trip={trip}
        onChange={upsert}
        actions={
          <TripActions
            trip={trip}
            onToast={setToast}
            onDelete={() => {
              remove(trip.id);
              navigate('/');
              setToast('Trip deleted');
            }}
          />
        }
      />
    ) : (
      <NotFound message="That trip isn't saved in this browser." />
    );
  } else if (page === 'share' && param) {
    const shared = decodeTrip(param);
    content = shared ? (
      <>
        <div className="banner">
          <span>Someone shared this trip with you.</span>
          <button
            className="btn primary small"
            onClick={() => {
              const copy: Trip = { ...shared, id: newId(), createdAt: Date.now() };
              upsert(copy);
              navigate(`/trip/${copy.id}`);
              setToast('Saved to your trips');
            }}
          >
            Save a copy to edit
          </button>
        </div>
        <TripView key={param} trip={shared} />
      </>
    ) : (
      <NotFound message="This share link looks broken or incomplete." />
    );
  } else {
    content = <Home trips={trips} onCreate={upsert} onDelete={remove} />;
  }

  return (
    <>
      <nav className="topbar">
        <a href="#/" className="brand">
          <span className="brand-mark" aria-hidden>
            <Ticket size={18} strokeWidth={2.25} />
          </span>
          Friday Ticket
        </a>
        {page && (
          <a href="#/" className="btn ghost small">
            My trips
          </a>
        )}
      </nav>
      <div className="page" key={route.join('/')}>
        {content}
      </div>
      <footer className="footer">
        Weather by <a href="https://open-meteo.com/">Open-Meteo</a> · Maps &amp; places by{' '}
        <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Your trips stay in your browser.
      </footer>
      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}

function TripActions({ trip, onToast, onDelete }: { trip: Trip; onToast: (m: string) => void; onDelete: () => void }) {
  const share = async () => {
    const url = `${location.origin}${location.pathname}#/share/${encodeTrip(trip)}`;
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: trip.name, url });
        return;
      } catch {
        // User cancelled the share sheet; fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      onToast('Share link copied to clipboard');
    } catch {
      window.prompt('Copy this link to share your trip:', url);
    }
  };

  const slug = trip.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'trip';

  return (
    <>
      <button className="btn primary small" onClick={share}>
        Share
      </button>
      <button
        className="btn ghost small"
        onClick={() => {
          downloadFile(`${slug}.ics`, buildIcs(trip), 'text/calendar');
          onToast('Calendar file downloaded');
        }}
        title="Download a calendar file for Google, Apple or Outlook Calendar"
      >
        Add to calendar
      </button>
      <button className="btn ghost small" onClick={() => window.print()}>
        Print
      </button>
      <button className="btn danger small" onClick={() => confirm(`Delete "${trip.name}"?`) && onDelete()}>
        Delete
      </button>
    </>
  );
}

function NotFound({ message }: { message: string }) {
  return (
    <main className="not-found card">
      <h1>Trip not found</h1>
      <p>{message}</p>
      <a href="#/" className="btn primary">
        Back to my trips
      </a>
    </main>
  );
}
