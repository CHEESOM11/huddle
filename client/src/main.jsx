import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { config } from '@fortawesome/fontawesome-svg-core'
import './index.css'
import '@fortawesome/fontawesome-svg-core/styles.css'
import App from './App.jsx'

config.autoAddCss = false

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)