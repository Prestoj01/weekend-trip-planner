import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// Served from https://<user>.github.io/weekend-trip-planner/ on GitHub Pages.
export default defineConfig({
  base: '/weekend-trip-planner/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Friday Ticket — Weekend Trip Planner',
        short_name: 'Friday Ticket',
        description: 'Plan a weekend away: forecast, things to do, a day-by-day map, packing list and budget.',
        theme_color: '#e4572e',
        background_color: '#fbf3e4',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + fonts are precached so saved trips open with no connection.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Skip the social image and font subsets the UI never uses.
        globIgnores: ['og.png', '**/*cyrillic*', '**/*vietnamese*', '**/*greek*'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Last forecast/geocode per location, used when offline.
            urlPattern: /^https:\/\/(api|geocoding-api)\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-meteo',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 3 },
            },
          },
          {
            // Map tiles you've already viewed (bounded, per OSM tile usage policy).
            urlPattern: /^https:\/\/[abc]?\.?tile\.openstreetmap\.org\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
