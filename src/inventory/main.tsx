import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyBrand } from '../brand'
import InventoryApp from './App'
import '../theme.css'
import './inventory.css'

applyBrand()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InventoryApp />
  </StrictMode>,
)
