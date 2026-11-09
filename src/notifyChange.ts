import { getBrandId } from './brand'

export const LOCAL_CHANGE_EVENT = 'shawarma-local-change'
export const CLOUD_DIRTY_KEY = 'shawarma-cloud-dirty'

export function notifyLocalChange(): void {
  if (getBrandId() !== 'fars') return
  try {
    localStorage.setItem(CLOUD_DIRTY_KEY, '1')
  } catch {
    /* ignore quota */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT))
  }
}
