import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthGate } from '../auth/AuthGate'
import App from './App'
import './hr.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </StrictMode>,
)
