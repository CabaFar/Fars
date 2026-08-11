import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CashApp from './App'
import './cash.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CashApp />
  </StrictMode>,
)
