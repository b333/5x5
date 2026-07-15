import type { Weight } from './types'

// Accepts "bw"/"BW" (bodyweight) or a positive number; returns null for anything else.
export function parseWeightInput(raw: string): Weight | null {
  const trimmed = raw.trim()
  if (trimmed.toLowerCase() === 'bw') return 'bw'
  const parsed = parseFloat(trimmed)
  return !isNaN(parsed) && parsed > 0 ? parsed : null
}

export function formatWeight(w: Weight) {
  return w === 'bw' ? 'BW' : `${w}kg`
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function todayISO() {
  return new Date().toISOString()
}

export function toDateKey(iso: string) {
  return iso.slice(0, 10)
}

export function cellKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function formatElapsed(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function formatDuration(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

export function beep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    ;[0, 0.14, 0.28].forEach(t => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0, ctx.currentTime + t)
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.2)
    })
  } catch { /* audio unavailable */ }
}
