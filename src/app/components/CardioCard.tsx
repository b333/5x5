'use client'

import { useState } from 'react'
import styles from '../workout.module.css'
import type { CardioEntry } from '../lib/types'

interface Props {
  todayCardio: CardioEntry | undefined
  onLog: (duration: number, distanceKm: number | undefined) => void
}

export function CardioCard({ todayCardio, onLog }: Props) {
  const [durationInput, setDurationInput] = useState('')
  const [distanceInput, setDistanceInput] = useState('')
  const [editing, setEditing] = useState(false)

  function handleLog() {
    const duration = parseInt(durationInput, 10)
    if (isNaN(duration) || duration <= 0) return
    const trimmed = distanceInput.trim()
    const distanceKm = trimmed ? parseFloat(trimmed) : undefined
    if (distanceKm !== undefined && (isNaN(distanceKm) || distanceKm < 0)) return
    onLog(duration, distanceKm)
    setDurationInput('')
    setDistanceInput('')
    setEditing(false)
  }

  return (
    <div className={styles.cardioCard}>
      <span className={styles.bodyWeightLabel}>Cardio</span>
      {todayCardio && !editing ? (
        <div className={styles.cardioLogged}>
          <span className={styles.cardioValue}>{todayCardio.duration}</span>
          <span className={styles.bwUnit}>min</span>
          {todayCardio.distanceKm !== undefined && (
            <>
              <span className={styles.cardioValue}>{todayCardio.distanceKm}</span>
              <span className={styles.bwUnit}>km</span>
            </>
          )}
          <button
            className={styles.bodyWeightEdit}
            onClick={() => {
              setDurationInput(String(todayCardio.duration))
              setDistanceInput(todayCardio.distanceKm !== undefined ? String(todayCardio.distanceKm) : '')
              setEditing(true)
            }}
          >Edit</button>
        </div>
      ) : (
        <div className={styles.cardioEntry}>
          <input
            className={styles.cardioInput}
            type="number"
            min="1"
            placeholder="0"
            value={durationInput}
            onChange={e => setDurationInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleLog() }}
            aria-label="Duration in minutes"
          />
          <span className={styles.bwUnit}>min</span>
          <input
            className={styles.cardioInput}
            type="number"
            step="0.1"
            min="0"
            placeholder="—"
            value={distanceInput}
            onChange={e => setDistanceInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleLog() }}
            aria-label="Distance in km"
          />
          <span className={styles.bwUnit}>km</span>
          <button className={styles.bodyWeightBtn} onClick={handleLog}>Log</button>
          {editing && (
            <button className={styles.bwCancel} onClick={() => { setEditing(false); setDurationInput(''); setDistanceInput('') }}>✕</button>
          )}
        </div>
      )}
    </div>
  )
}
