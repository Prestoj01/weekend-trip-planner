import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/alfa-slab-one'
import '@fontsource-variable/oswald'
import '@fontsource-variable/work-sans'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
