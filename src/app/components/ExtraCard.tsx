'use client'

import { useState } from 'react'
import styles from '../workout.module.css'
import type { ExtraExercise } from '../lib/types'

interface Props {
  extra: ExtraExercise
  onToggleSet: (setIdx: number) => void
  onWeightSave: (newWeight: number) => void
  onRemove: () => void
}

export function ExtraCard({ extra, onToggleSet, onWeightSave, onRemove }: Props) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const doneCount = extra.sets.filter(Boolean).length
  const isComplete = doneCount === extra.sets.length

  function startEdit() {
    setEditValue(String(extra.weight))
    setEditing(true)
  }

  function saveEdit() {
    const parsed = parseFloat(editValue)
    if (!isNaN(parsed) && parsed > 0) onWeightSave(parsed)
    setEditing(false)
  }

  return (
    <div className={`${styles.exerciseCard} ${isComplete ? styles.exerciseDone : ''} ${styles.extraCard}`}>
      <div className={styles.exerciseTop}>
        <div className={styles.exerciseName}>{extra.name}</div>
        <div className={styles.extraRight}>
          {editing ? (
            <input
              className={styles.weightInput}
              type="number"
              step="0.5"
              min="0"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') saveEdit()
                if (e.key === 'Escape') setEditing(false)
              }}
              autoFocus
            />
          ) : (
            <button className={styles.exerciseWeight} onClick={startEdit}>
              {extra.weight}<span className={styles.weightUnit}>kg</span>
            </button>
          )}
          <button className={styles.extraRemoveBtn} onClick={onRemove}>×</button>
        </div>
      </div>
      <div className={styles.setRow}>
        {extra.sets.map((done, i) => (
          <button
            key={i}
            className={`${styles.setBtn} ${done ? styles.setDone : ''}`}
            onClick={() => onToggleSet(i)}
            aria-label={`Set ${i + 1} ${done ? 'completed' : 'incomplete'}`}
          >
            {done ? '✓' : i + 1}
          </button>
        ))}
        <span className={styles.setCount}>{doneCount}/{extra.sets.length} × {extra.reps}</span>
      </div>
    </div>
  )
}
