import { StrictMode, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { applyBrand } from './brand'
import { prepareCloud } from './cloudSync'

export function bootApp(App: ComponentType): void {
  applyBrand()
  void prepareCloud().finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
}
