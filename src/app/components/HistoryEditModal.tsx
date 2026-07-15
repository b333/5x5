'use client'

import { useState } from 'react'
import styles from '../workout.module.css'
import type { HistoryEntry } from '../lib/types'
import { EXERCISES } from '../lib/constants'
import { formatDate } from '../lib/utils'

interface Props {
  entry: HistoryEntry
  bodyWeightKg: number | null
  onSave: (exercises: HistoryEntry['exercises'], extras: HistoryEntry['extras'], newBWKg: number | null) => void
  onClose: () => void
}

export function HistoryEditModal({ entry, bodyWeightKg, onSave, onClose }: Props) {
  const [exercises, setExercises] = useState(() => entry.exercises.map(ex => ({ ...ex })))
  const [extras, setExtras] = useState(() => (entry.extras ?? []).map(ex => ({ ...ex })))
  const [bodyWeight, setBodyWeight] = useState(bodyWeightKg != null ? String(bodyWeightKg) : '')

  function handleSave() {
    const bwParsed = parseFloat(bodyWeight)
    onSave(exercises, extras.length ? extras : undefined, !isNaN(bwParsed) && bwParsed > 0 ? bwParsed : null)
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalPanel} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.badge}>
              {entry.workout === 'C' ? 'Free Session' : `Workout ${entry.workout}`}
            </span>
            <span className={styles.dateLabel}>{formatDate(entry.date)}</span>
          </div>
          <button className={styles.historyCancelBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.historyEditBWRow}>
            <span>Body weight</span>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="—"
              value={bodyWeight}
              onChange={e => setBodyWeight(e.target.value)}
              className={styles.historyEditBWInput}
            />
            <span className={styles.bwUnit}>kg</span>
          </div>

          <div className={styles.historyExercises}>
            {exercises.map((ex, exIdx) => (
              <div key={ex.name} className={styles.historyRow}>
                <span className={styles.historyExName}>{EXERCISES[ex.name].label}</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={ex.weight}
                  onChange={e => {
                    const newEx = [...exercises]
                    newEx[exIdx] = { ...newEx[exIdx], weight: parseFloat(e.target.value) || 0 }
                    setExercises(newEx)
                  }}
                  className={styles.historyEditWeightInput}
                />
                <span className={styles.historyEditWeightUnit}>kg</span>
                <input
                  type="number"
                  min="0"
                  max={ex.total}
                  value={ex.completed}
                  onChange={e => {
                    const val = Math.min(ex.total, Math.max(0, parseInt(e.target.value) || 0))
                    const newEx = [...exercises]
                    newEx[exIdx] = { ...newEx[exIdx], completed: val }
                    setExercises(newEx)
                  }}
                  className={styles.historyEditSetsInput}
                />
                <span className={styles.historyEditTotal}>/</span>
                <input
                  type="number"
                  min="1"
                  value={ex.total}
                  onChange={e => {
                    const newTotal = Math.max(1, parseInt(e.target.value) || 1)
                    const newEx = [...exercises]
                    newEx[exIdx] = { ...newEx[exIdx], total: newTotal, completed: Math.min(newEx[exIdx].completed, newTotal) }
                    setExercises(newEx)
                  }}
                  className={styles.historyEditTotalInput}
                />
              </div>
            ))}

            {extras.length > 0 && (
              <>
                <div className={styles.extrasLabel}>Extras</div>
                {extras.map((ex, exIdx) => (
                  <div key={exIdx} className={styles.historyRow}>
                    <span className={styles.historyExName}>{ex.name}</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={ex.weight}
                      onChange={e => {
                        const newExtras = [...extras]
                        newExtras[exIdx] = { ...newExtras[exIdx], weight: parseFloat(e.target.value) || 0 }
                        setExtras(newExtras)
                      }}
                      className={styles.historyEditWeightInput}
                    />
                    <span className={styles.historyEditWeightUnit}>kg</span>
                    <input
                      type="number"
                      min="0"
                      max={ex.total}
                      value={ex.completed}
                      onChange={e => {
                        const val = Math.min(ex.total, Math.max(0, parseInt(e.target.value) || 0))
                        const newExtras = [...extras]
                        newExtras[exIdx] = { ...newExtras[exIdx], completed: val }
                        setExtras(newExtras)
                      }}
                      className={styles.historyEditSetsInput}
                    />
                    <span className={styles.historyEditTotal}>/</span>
                    <input
                      type="number"
                      min="1"
                      value={ex.total}
                      onChange={e => {
                        const newTotal = Math.max(1, parseInt(e.target.value) || 1)
                        const newExtras = [...extras]
                        newExtras[exIdx] = { ...newExtras[exIdx], total: newTotal, completed: Math.min(newExtras[exIdx].completed, newTotal) }
                        setExtras(newExtras)
                      }}
                      className={styles.historyEditTotalInput}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.ghostBtn} onClick={onClose}>Cancel</button>
          <button className={styles.primaryBtn} onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
