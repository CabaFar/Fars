import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthGate } from '../auth/AuthGate'
import CashApp from './App'
import './cash.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <CashApp />
    </AuthGate>
  </StrictMode>,
)
