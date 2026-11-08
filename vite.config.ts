import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Served from https://<user>.github.io/weekend-trip-planner/ on GitHub Pages.
export default defineConfig({
  base: '/weekend-trip-planner/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
