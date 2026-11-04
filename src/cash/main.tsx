import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyBrand } from '../brand'
import CashApp from './App'
import '../theme.css'
import './cash.css'

applyBrand()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CashApp />
  </StrictMode>,
)
