import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthGate } from '../auth/AuthGate'
import InventoryApp from './App'
import './inventory.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <InventoryApp />
    </AuthGate>
  </StrictMode>,
)
