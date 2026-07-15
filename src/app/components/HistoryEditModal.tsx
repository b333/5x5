'use client'

import { useState } from 'react'
import styles from '../workout.module.css'
import type { HistoryEntry, CustomExerciseDef, Weight } from '../lib/types'
import { EXERCISES } from '../lib/constants'
import { formatDate, parseWeightInput } from '../lib/utils'
import { ExercisePicker } from './ExercisePicker'

interface Props {
  entry: HistoryEntry
  bodyWeightKg: number | null
  customExercises: CustomExerciseDef[]
  onSave: (exercises: HistoryEntry['exercises'], extras: HistoryEntry['extras'], newBWKg: number | null) => void
  onClose: () => void
  onCreateCustomExercise: (name: string, sets: number, reps: number, weight: Weight) => CustomExerciseDef
  onDeleteCustomExercise: (id: string) => void
}

export function HistoryEditModal({ entry, bodyWeightKg, customExercises, onSave, onClose, onCreateCustomExercise, onDeleteCustomExercise }: Props) {
  const [exercises, setExercises] = useState(() => entry.exercises.map(ex => ({ ...ex })))
  // weight is kept as a raw string draft (parsed only on save) so typing "bw" isn't rejected mid-keystroke.
  const [extras, setExtras] = useState(() => (entry.extras ?? []).map(ex => ({ ...ex, weight: String(ex.weight) })))
  const [bodyWeight, setBodyWeight] = useState(bodyWeightKg != null ? String(bodyWeightKg) : '')
  const [showPicker, setShowPicker] = useState(false)

  function handleSave() {
    const bwParsed = parseFloat(bodyWeight)
    const savedExtras = extras.map(ex => ({ ...ex, weight: parseWeightInput(ex.weight) ?? 0 }))
    onSave(exercises, savedExtras.length ? savedExtras : undefined, !isNaN(bwParsed) && bwParsed > 0 ? bwParsed : null)
  }

  function addExtraEntry(name: string, weight: Weight, sets: number, reps: number) {
    setExtras(prev => [...prev, { name, weight: String(weight), completed: sets, total: sets, reps }])
    setShowPicker(false)
  }

  function handleAddSaved(def: CustomExerciseDef) {
    addExtraEntry(def.name, def.defaultWeight, def.sets, def.reps)
  }

  function handleCreateExtra(name: string, sets: number, reps: number, weight: Weight) {
    onCreateCustomExercise(name, sets, reps, weight)
    addExtraEntry(name, weight, sets, reps)
  }

  function removeExtra(idx: number) {
    setExtras(prev => prev.filter((_, i) => i !== idx))
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
                      type="text"
                      inputMode="decimal"
                      value={ex.weight}
                      onChange={e => {
                        const newExtras = [...extras]
                        newExtras[exIdx] = { ...newExtras[exIdx], weight: e.target.value }
                        setExtras(newExtras)
                      }}
                      className={styles.historyEditWeightInput}
                    />
                    <span className={styles.historyEditWeightUnit}>{ex.weight.trim().toLowerCase() === 'bw' ? '' : 'kg'}</span>
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
                    <button
                      className={styles.extraRemoveBtn}
                      onClick={() => removeExtra(exIdx)}
                      aria-label={`Remove ${ex.name}`}
                    >×</button>
                  </div>
                ))}
              </>
            )}
          </div>

          {showPicker ? (
            <ExercisePicker
              customExercises={customExercises}
              onAdd={handleAddSaved}
              onCreate={handleCreateExtra}
              onDelete={onDeleteCustomExercise}
              onClose={() => setShowPicker(false)}
            />
          ) : (
            <button className={styles.addExerciseBtn} onClick={() => setShowPicker(true)}>
              + Add Exercise
            </button>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.ghostBtn} onClick={onClose}>Cancel</button>
          <button className={styles.primaryBtn} onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
