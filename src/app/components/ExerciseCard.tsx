'use client'

import { useState } from 'react'
import styles from '../workout.module.css'
import type { ExerciseName } from '../lib/types'
import { EXERCISES } from '../lib/constants'

interface Props {
  name: ExerciseName
  weight: number
  failStreak: number
  setsState: boolean[]
  isActive: boolean
  onToggleSet: (setIdx: number) => void
  onWeightSave: (newWeight: number) => void
}

export function ExerciseCard({ name, weight, failStreak, setsState, isActive, onToggleSet, onWeightSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const def = EXERCISES[name]
  const doneCount = setsState.filter(Boolean).length
  const isComplete = doneCount === def.sets

  function startEdit() {
    setEditValue(String(weight))
    setEditing(true)
  }

  function saveEdit() {
    const parsed = parseFloat(editValue)
    if (!isNaN(parsed) && parsed > 0) onWeightSave(parsed)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div className={`${styles.exerciseCard} ${isComplete ? styles.exerciseDone : ''}`}>
      <div className={styles.exerciseTop}>
        <div>
          <div className={styles.exerciseName}>{def.label}</div>
          {failStreak >= 3 && (
            <div className={styles.deloadWarning}>{failStreak} fails — consider deload (−10%)</div>
          )}
        </div>
        {editing ? (
          <input
            className={styles.weightInput}
            type="number"
            step="0.5"
            min="0"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <button className={styles.exerciseWeight} onClick={startEdit}>
            {weight}<span className={styles.weightUnit}>kg</span>
          </button>
        )}
      </div>

      {isActive ? (
        <div className={styles.setRow}>
          {setsState.map((done, i) => (
            <button
              key={i}
              className={`${styles.setBtn} ${done ? styles.setDone : ''}`}
              onClick={() => onToggleSet(i)}
              aria-label={`Set ${i + 1} ${done ? 'completed' : 'incomplete'}`}
            >
              {done ? '✓' : i + 1}
            </button>
          ))}
          <span className={styles.setCount}>{doneCount}/{def.sets}</span>
        </div>
      ) : (
        <div className={styles.setPreview}>{def.sets}×5 reps</div>
      )}
    </div>
  )
}
