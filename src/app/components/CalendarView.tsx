'use client'

import { useState } from 'react'
import styles from '../workout.module.css'
import type { HistoryEntry, BodyWeightEntry, CardioEntry, CustomExerciseDef, Weight } from '../lib/types'
import { EXERCISES, MONTHS, DAY_HEADERS, STANDARD_REPS } from '../lib/constants'
import { formatDate, formatDuration, formatWeight, toDateKey, cellKey } from '../lib/utils'
import { HistoryEditModal } from './HistoryEditModal'

interface Props {
  history: HistoryEntry[]
  bodyWeights: BodyWeightEntry[]
  cardioSessions: CardioEntry[]
  customExercises: CustomExerciseDef[]
  onSaveHistory: (historyIdx: number, exercises: HistoryEntry['exercises'], extras: HistoryEntry['extras'], newBWKg: number | null) => void
  onSaveCardio: (date: string, duration: number, distanceKm: number | undefined) => void
  onCreateCustomExercise: (name: string, sets: number, reps: number, weight: Weight) => CustomExerciseDef
  onDeleteCustomExercise: (id: string) => void
}

export function CalendarView({ history, bodyWeights, cardioSessions, customExercises, onSaveHistory, onSaveCardio, onCreateCustomExercise, onDeleteCustomExercise }: Props) {
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingHistoryIdx, setEditingHistoryIdx] = useState<number | null>(null)
  const [editingCardio, setEditingCardio] = useState(false)
  const [cardioDurationInput, setCardioDurationInput] = useState('')
  const [cardioDistanceInput, setCardioDistanceInput] = useState('')

  const todayKey = cellKey(now.getFullYear(), now.getMonth(), now.getDate())

  const workoutMap: Record<string, HistoryEntry> = {}
  const workoutIndexMap: Record<string, number> = {}
  for (let idx = 0; idx < history.length; idx++) {
    const k = toDateKey(history[idx].date)
    workoutMap[k] = history[idx]
    workoutIndexMap[k] = idx
  }

  const cardioMap: Record<string, CardioEntry> = {}
  for (const entry of cardioSessions) cardioMap[entry.date] = entry

  function prevMonth() {
    setSelectedDate(null)
    setEditingCardio(false)
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }

  function nextMonth() {
    setSelectedDate(null)
    setEditingCardio(false)
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  function selectDate(key: string, isSelected: boolean) {
    setSelectedDate(isSelected ? null : key)
    setEditingCardio(false)
  }

  function saveEdit(exercises: HistoryEntry['exercises'], extras: HistoryEntry['extras'], newBWKg: number | null) {
    if (editingHistoryIdx === null) return
    onSaveHistory(editingHistoryIdx, exercises, extras, newBWKg)
    setEditingHistoryIdx(null)
  }

  function startEditCardio(existing: CardioEntry | undefined) {
    setCardioDurationInput(existing ? String(existing.duration) : '')
    setCardioDistanceInput(existing?.distanceKm !== undefined ? String(existing.distanceKm) : '')
    setEditingCardio(true)
  }

  function saveCardioEdit() {
    if (!selectedDate) return
    const duration = parseInt(cardioDurationInput, 10)
    if (isNaN(duration) || duration <= 0) return
    const trimmed = cardioDistanceInput.trim()
    const distanceKm = trimmed ? parseFloat(trimmed) : undefined
    if (distanceKm !== undefined && (isNaN(distanceKm) || distanceKm < 0)) return
    onSaveCardio(selectedDate, duration, distanceKm)
    setEditingCardio(false)
  }

  const firstDow = new Date(calYear, calMonth, 1).getDay()
  const offset = (firstDow + 6) % 7
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const monthPrefix = cellKey(calYear, calMonth, 1).slice(0, 8)
  const monthCardioKm = cardioSessions
    .filter(e => e.date.startsWith(monthPrefix))
    .reduce((sum, e) => sum + (e.distanceKm ?? 0), 0)

  const selectedEntry = selectedDate ? workoutMap[selectedDate] : null
  const selectedCardio = selectedDate ? cardioMap[selectedDate] : null
  const selectedTotalLift = selectedEntry
    ? selectedEntry.exercises.reduce((sum, ex) => sum + ex.weight * STANDARD_REPS * ex.completed, 0)
      + (selectedEntry.extras ?? []).reduce((sum, ex) => sum + (ex.weight === 'bw' ? 0 : ex.weight * ex.reps * ex.completed), 0)
    : 0
  const selectedIdx = selectedDate !== null ? (workoutIndexMap[selectedDate] ?? -1) : -1
  const editingEntry = editingHistoryIdx !== null ? history[editingHistoryIdx] : null

  return (
    <main className={styles.main}>
      <div className={styles.calNav}>
        <button className={styles.calNavBtn} onClick={prevMonth}>‹</button>
        <span className={styles.calMonthLabel}>{MONTHS[calMonth]} {calYear}</span>
        <button className={styles.calNavBtn} onClick={nextMonth}>›</button>
      </div>

      <div className={styles.calGrid}>
        {DAY_HEADERS.map((d, i) => (
          <div key={i} className={styles.calDayHeader}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />
          const key = cellKey(calYear, calMonth, day)
          const entry = workoutMap[key]
          const cardio = cardioMap[key]
          const isToday = key === todayKey
          const isSelected = key === selectedDate
          return (
            <button
              key={key}
              className={[
                styles.calCell,
                isToday ? styles.calToday : '',
                (entry || cardio) ? styles.calHasWorkout : '',
                isSelected ? styles.calSelected : '',
              ].join(' ')}
              onClick={() => selectDate(key, isSelected)}
            >
              <span className={styles.calDayNum}>{day}</span>
              {(entry || cardio) && (
                <span className={styles.calDots}>
                  {entry && (
                    <span className={entry.workout === 'A' ? styles.calDotA : entry.workout === 'B' ? styles.calDotB : styles.calDotC}>
                      {entry.workout === 'C' ? 'F' : entry.workout}
                    </span>
                  )}
                  {cardio && <span className={styles.calDotCardio}>C</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className={styles.calMonthCardio}>
        <span className={styles.calDotCardio}>C</span>
        Cardio this month: <span>{Math.round(monthCardioKm * 10) / 10} km</span>
      </div>

      {selectedDate && (selectedEntry || selectedCardio) && (
        <div className={styles.calDetail}>
          <div className={styles.historyHeader}>
            <span className={styles.badge}>
              {selectedEntry
                ? (selectedEntry.workout === 'C' ? 'Free Session' : `Workout ${selectedEntry.workout}`)
                : 'Cardio'}
            </span>
            <span className={styles.dateLabel}>{formatDate(selectedEntry ? selectedEntry.date : selectedDate)}</span>
            <div className={styles.historyActions}>
              {selectedEntry?.duration != null && (
                <span className={styles.historyDuration}>{formatDuration(selectedEntry.duration)}</span>
              )}
              {bodyWeights.find(e => e.date === selectedDate) && (
                <span className={styles.historyBW}>
                  {bodyWeights.find(e => e.date === selectedDate)!.kg}kg
                </span>
              )}
              {selectedEntry && (
                <button className={styles.historyEditBtn} onClick={() => setEditingHistoryIdx(selectedIdx)}>Edit</button>
              )}
            </div>
          </div>

          {selectedEntry && (
            <div className={styles.historyExercises}>
              {selectedEntry.exercises.map(ex => {
                const success = ex.completed === ex.total
                return (
                  <div key={ex.name} className={styles.historyRow}>
                    <span className={styles.historyExName}>{EXERCISES[ex.name].label}</span>
                    <span className={styles.historyWeight}>{ex.weight}kg</span>
                    <span className={`${styles.historyResult} ${success ? styles.historySuccess : styles.historyFail}`}>
                      {ex.completed}/{ex.total}
                    </span>
                  </div>
                )
              })}
              {selectedEntry.extras && selectedEntry.extras.length > 0 && (
                <>
                  <div className={styles.extrasLabel}>Extras</div>
                  {selectedEntry.extras.map((ex, i) => (
                    <div key={i} className={styles.historyRow}>
                      <span className={styles.historyExName}>{ex.name}</span>
                      <span className={styles.historyWeight}>{formatWeight(ex.weight)}</span>
                      <span className={styles.historyMeta}>×{ex.reps}</span>
                      <span className={`${styles.historyResult} ${ex.completed === ex.total ? styles.historySuccess : styles.historyFail}`}>
                        {ex.completed}/{ex.total}
                      </span>
                    </div>
                  ))}
                </>
              )}
              {selectedTotalLift > 0 && (
                <div className={styles.historyTotalLift}>
                  Total lift: <span>{Math.round(selectedTotalLift).toLocaleString()}kg</span>
                </div>
              )}
            </div>
          )}

          {selectedEntry && <div className={styles.extrasLabel}>Cardio</div>}
          {editingCardio ? (
            <div className={styles.cardioEntry} style={{ marginTop: selectedEntry ? 10 : 0 }}>
              <input
                className={styles.cardioInput}
                type="number"
                min="1"
                placeholder="0"
                value={cardioDurationInput}
                onChange={e => setCardioDurationInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveCardioEdit() }}
                aria-label="Duration in minutes"
              />
              <span className={styles.bwUnit}>min</span>
              <input
                className={styles.cardioInput}
                type="number"
                step="0.1"
                min="0"
                placeholder="—"
                value={cardioDistanceInput}
                onChange={e => setCardioDistanceInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveCardioEdit() }}
                aria-label="Distance in km"
              />
              <span className={styles.bwUnit}>km</span>
              <button className={styles.bodyWeightBtn} onClick={saveCardioEdit}>Save</button>
              <button className={styles.bwCancel} onClick={() => setEditingCardio(false)}>✕</button>
            </div>
          ) : selectedCardio ? (
            <div className={styles.historyRow} style={{ marginTop: selectedEntry ? 10 : 0 }}>
              <span className={styles.historyExName}>{selectedCardio.duration} min{selectedCardio.distanceKm !== undefined ? ` · ${selectedCardio.distanceKm} km` : ''}</span>
              <button className={styles.historyEditBtn} onClick={() => startEditCardio(selectedCardio)}>Edit</button>
            </div>
          ) : (
            <button className={styles.historyEditBtn} style={{ marginTop: selectedEntry ? 10 : 0 }} onClick={() => startEditCardio(undefined)}>
              + Log Cardio
            </button>
          )}
        </div>
      )}

      {editingEntry && (
        <HistoryEditModal
          entry={editingEntry}
          bodyWeightKg={bodyWeights.find(e => e.date === toDateKey(editingEntry.date))?.kg ?? null}
          customExercises={customExercises}
          onSave={saveEdit}
          onClose={() => setEditingHistoryIdx(null)}
          onCreateCustomExercise={onCreateCustomExercise}
          onDeleteCustomExercise={onDeleteCustomExercise}
        />
      )}
    </main>
  )
}
