'use client'

import { useState } from 'react'
import styles from '../workout.module.css'
import type { BodyWeightEntry } from '../lib/types'

interface Props {
  todayBW: BodyWeightEntry | undefined
  onLog: (kg: number) => void
}

export function BodyWeightCard({ todayBW, onLog }: Props) {
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState(false)

  function handleLog() {
    const parsed = parseFloat(input)
    if (isNaN(parsed) || parsed <= 0) return
    onLog(parsed)
    setInput('')
    setEditing(false)
  }

  return (
    <div className={styles.bodyWeightCard}>
      <span className={styles.bodyWeightLabel}>Body Weight</span>
      {todayBW && !editing ? (
        <div className={styles.bodyWeightLogged}>
          <span className={styles.bodyWeightValue}>{todayBW.kg}</span>
          <span className={styles.bwUnit}>kg</span>
          <button
            className={styles.bodyWeightEdit}
            onClick={() => { setInput(String(todayBW.kg)); setEditing(true) }}
          >Edit</button>
        </div>
      ) : (
        <div className={styles.bodyWeightEntry}>
          <input
            className={styles.bwInput}
            type="number"
            step="0.1"
            min="0"
            placeholder="0.0"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleLog() }}
          />
          <span className={styles.bwUnit}>kg</span>
          <button className={styles.bodyWeightBtn} onClick={handleLog}>Log</button>
          {editing && (
            <button className={styles.bwCancel} onClick={() => { setEditing(false); setInput('') }}>✕</button>
          )}
        </div>
      )}
    </div>
  )
}
