import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import InventoryApp from './App'
import './inventory.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InventoryApp />
  </StrictMode>,
)
