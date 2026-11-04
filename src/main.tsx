import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyBrand } from './brand'
import App from './App'
import './theme.css'
import './index.css'

applyBrand()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
