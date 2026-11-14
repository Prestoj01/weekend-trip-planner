# Friday Ticket — Weekend Trip Planner

Plan a weekend getaway in one place: live forecast, things to do nearby, a day-by-day itinerary on a map, a weather-aware packing list, and a budget. Free, no sign-up, no API keys.

**Live demo:** https://prestoj01.github.io/weekend-trip-planner/

## Features

- **Destination search.** City autocomplete with keyboard navigation, built on the ARIA combobox pattern.
- **Forecast.** A 16-day daily forecast in the destination's timezone, with a °F/°C toggle.
- **Things to do nearby.** Sights, outdoors, and food & drink pulled from OpenStreetMap, with notable (Wikipedia-linked) places ranked first. Add one to any day in a single click.
- **Itinerary and map.** Day-by-day plans with times, costs, and notes. Located activities appear as numbered, colour-coded pins on an interactive map.
- **Packing list.** A checklist that suggests items from the forecast (rain → umbrella, cold → jacket, …).
- **Budget.** Totals per day and per person.
- **Share links.** The whole trip is compressed into the URL, so anyone can view it and save their own copy. No backend needed.
- **Export.** An `.ics` calendar file (Google, Apple, Outlook) and a print-friendly layout.
- **Privacy.** Trips live in `localStorage`, with no accounts or tracking. Supports dark mode and reduced motion, and the layout is responsive.

## Tech

| Concern  | Choice                                                                                        |
| -------- | --------------------------------------------------------------------------------------------- |
| UI       | React 19 + TypeScript, Vite                                                                   |
| Maps     | Leaflet / react-leaflet with OpenStreetMap tiles                                              |
| Data     | [Open-Meteo](https://open-meteo.com) (geocoding, forecast), [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) (places) |
| Sharing  | `lz-string` URL compression                                                                   |
| Quality  | Vitest unit tests, oxlint, strict TypeScript                                                  |
| Hosting  | GitHub Pages via GitHub Actions (lint → test → build → deploy)                                 |

Every service is free and keyless, so the site costs nothing to run and has no secrets to leak.

## Project structure

```
src/
  components/   UI: Home, TripView, Itinerary, TripMap, Suggestions, Packing, Budget…
  hooks/        useTrips (persistence), useForecast, useHashRoute, useTempUnit
  lib/          Pure logic, unit-tested: dates, api, ics, packing, storage/share, trip
```

## Development

```bash
npm install
npm run dev      # http://localhost:5173/weekend-trip-planner/
npm test
npm run lint
npm run build
```

## Deployment

Each push to `main` is deployed by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Attribution

Weather data by Open-Meteo (CC BY 4.0). Map data © OpenStreetMap contributors (ODbL).
