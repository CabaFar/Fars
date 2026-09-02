import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CashApp from './App'
import '../theme.css'
import './cash.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CashApp />
  </StrictMode>,
)
