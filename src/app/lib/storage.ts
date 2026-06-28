import type { AppState } from './types'
import { DEFAULT_STATE } from './constants'

const STORAGE_KEY = 'stronglifts-5x5'

export function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    return { ...DEFAULT_STATE, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_STATE
  }
}

export function save(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
