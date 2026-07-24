'use client'

import { useState } from 'react'
import styles from '../workout.module.css'
import type { CustomExerciseDef, Weight } from '../lib/types'
import { parseWeightInput, formatWeight } from '../lib/utils'

interface Props {
  customExercises: CustomExerciseDef[]
  onAdd: (def: CustomExerciseDef) => void
  onCreate: (name: string, sets: number, reps: number, weight: Weight) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function ExercisePicker({ customExercises, onAdd, onCreate, onDelete, onClose }: Props) {
  const [filter, setFilter] = useState('')
  const [name, setName] = useState('')
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('10')
  const [weight, setWeight] = useState('20')

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [draftSets, setDraftSets] = useState('')
  const [draftReps, setDraftReps] = useState('')
  const [draftWeight, setDraftWeight] = useState('')

  function toggleExpand(def: CustomExerciseDef) {
    if (expandedId === def.id) { setExpandedId(null); return }
    setExpandedId(def.id)
    setDraftSets(String(def.sets))
    setDraftReps(String(def.reps))
    setDraftWeight(String(def.defaultWeight))
  }

  function handleAddExpanded(def: CustomExerciseDef) {
    onAdd({
      ...def,
      sets: Math.max(1, parseInt(draftSets) || def.sets),
      reps: Math.max(1, parseInt(draftReps) || def.reps),
      defaultWeight: parseWeightInput(draftWeight) ?? def.defaultWeight,
    })
    setExpandedId(null)
  }

  function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed, Math.max(1, parseInt(sets) || 3), Math.max(1, parseInt(reps) || 10), parseWeightInput(weight) ?? 20)
    setName('')
    setSets('3')
    setReps('10')
    setWeight('20')
  }

  function handleDelete(id: string) {
    const exName = customExercises.find(d => d.id === id)?.name ?? 'this exercise'
    if (!confirm(`Delete "${exName}" from saved exercises?`)) return
    onDelete(id)
  }

  const filtered = customExercises.filter(d => d.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className={styles.exercisePicker}>
      <div className={styles.pickerHeader}>
        <span className={styles.pickerTitle}>Add Exercise</span>
        <button className={styles.pickerClose} onClick={onClose}>✕</button>
      </div>
      {customExercises.length > 0 && (
        <div className={styles.pickerSaved}>
          <input
            className={styles.pickerFilterInput}
            type="text"
            placeholder="Filter saved exercises…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            autoFocus
          />
          {filtered.length === 0 && <div className={styles.pickerNoResults}>No matches</div>}
          {filtered.map(def => (
            <div key={def.id} className={styles.pickerSavedItem}>
              <div className={styles.pickerSavedRow}>
                <button className={styles.pickerSavedAdd} onClick={() => onAdd(def)}>
                  <span className={styles.pickerSavedName}>{def.name}</span>
                  <span className={styles.pickerSavedMeta}>{def.sets}×{def.reps} · {formatWeight(def.defaultWeight)}</span>
                </button>
                <button className={styles.pickerSavedEdit} onClick={() => toggleExpand(def)} aria-label={`Edit ${def.name} before adding`}>
                  {expandedId === def.id ? '︿' : '✎'}
                </button>
                <button className={styles.pickerSavedDelete} onClick={() => handleDelete(def.id)}>×</button>
              </div>
              {expandedId === def.id && (
                <div className={styles.pickerExpand}>
                  <div className={styles.pickerRow}>
                    <label className={styles.pickerLabel}>
                      Sets
                      <input className={styles.pickerNumInput} type="number" min="1" max="10" value={draftSets} onChange={e => setDraftSets(e.target.value)} />
                    </label>
                    <label className={styles.pickerLabel}>
                      Reps
                      <input className={styles.pickerNumInput} type="number" min="1" max="50" value={draftReps} onChange={e => setDraftReps(e.target.value)} />
                    </label>
                    <label className={styles.pickerLabel}>
                      Weight
                      <input className={styles.pickerNumInput} type="text" placeholder="kg or BW" value={draftWeight} onChange={e => setDraftWeight(e.target.value)} />
                    </label>
                  </div>
                  <button className={styles.pickerExpandAddBtn} onClick={() => handleAddExpanded(def)}>Add</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className={styles.pickerNew}>
        <input
          className={styles.pickerInput}
          type="text"
          placeholder="Exercise name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) handleCreate() }}
          autoFocus={customExercises.length === 0}
        />
        <div className={styles.pickerRow}>
          <label className={styles.pickerLabel}>
            Sets
            <input className={styles.pickerNumInput} type="number" min="1" max="10" value={sets} onChange={e => setSets(e.target.value)} />
          </label>
          <label className={styles.pickerLabel}>
            Reps
            <input className={styles.pickerNumInput} type="number" min="1" max="50" value={reps} onChange={e => setReps(e.target.value)} />
          </label>
          <label className={styles.pickerLabel}>
            Weight
            <input className={styles.pickerNumInput} type="text" placeholder="kg or BW" value={weight} onChange={e => setWeight(e.target.value)} />
          </label>
        </div>
        <button
          className={`${styles.pickerAddBtn} ${!name.trim() ? styles.btnDisabled : ''}`}
          disabled={!name.trim()}
          onClick={handleCreate}
        >
          Add &amp; Save
        </button>
      </div>
    </div>
  )
}
