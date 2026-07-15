'use client'

import { useState } from 'react'
import styles from '../workout.module.css'
import type { HistoryEntry, BodyWeightEntry, CustomExerciseDef, Weight } from '../lib/types'
import { EXERCISES, MONTHS, DAY_HEADERS, STANDARD_REPS } from '../lib/constants'
import { formatDate, formatDuration, formatWeight, toDateKey, cellKey } from '../lib/utils'
import { HistoryEditModal } from './HistoryEditModal'

interface Props {
  history: HistoryEntry[]
  bodyWeights: BodyWeightEntry[]
  customExercises: CustomExerciseDef[]
  onSaveHistory: (historyIdx: number, exercises: HistoryEntry['exercises'], extras: HistoryEntry['extras'], newBWKg: number | null) => void
  onCreateCustomExercise: (name: string, sets: number, reps: number, weight: Weight) => CustomExerciseDef
  onDeleteCustomExercise: (id: string) => void
}

export function CalendarView({ history, bodyWeights, customExercises, onSaveHistory, onCreateCustomExercise, onDeleteCustomExercise }: Props) {
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingHistoryIdx, setEditingHistoryIdx] = useState<number | null>(null)

  const todayKey = cellKey(now.getFullYear(), now.getMonth(), now.getDate())

  const workoutMap: Record<string, HistoryEntry> = {}
  const workoutIndexMap: Record<string, number> = {}
  for (let idx = 0; idx < history.length; idx++) {
    const k = toDateKey(history[idx].date)
    workoutMap[k] = history[idx]
    workoutIndexMap[k] = idx
  }

  function prevMonth() {
    setSelectedDate(null)
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }

  function nextMonth() {
    setSelectedDate(null)
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  function saveEdit(exercises: HistoryEntry['exercises'], extras: HistoryEntry['extras'], newBWKg: number | null) {
    if (editingHistoryIdx === null) return
    onSaveHistory(editingHistoryIdx, exercises, extras, newBWKg)
    setEditingHistoryIdx(null)
  }

  const firstDow = new Date(calYear, calMonth, 1).getDay()
  const offset = (firstDow + 6) % 7
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const selectedEntry = selectedDate ? workoutMap[selectedDate] : null
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
          const isToday = key === todayKey
          const isSelected = key === selectedDate
          return (
            <button
              key={key}
              className={[
                styles.calCell,
                isToday ? styles.calToday : '',
                entry ? styles.calHasWorkout : '',
                isSelected ? styles.calSelected : '',
              ].join(' ')}
              onClick={() => setSelectedDate(isSelected ? null : key)}
            >
              <span className={styles.calDayNum}>{day}</span>
              {entry && (
                <span className={entry.workout === 'A' ? styles.calDotA : entry.workout === 'B' ? styles.calDotB : styles.calDotC}>
                  {entry.workout === 'C' ? 'F' : entry.workout}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selectedEntry && selectedDate && (
        <div className={styles.calDetail}>
          <div className={styles.historyHeader}>
            <span className={styles.badge}>
              {selectedEntry.workout === 'C' ? 'Free Session' : `Workout ${selectedEntry.workout}`}
            </span>
            <span className={styles.dateLabel}>{formatDate(selectedEntry.date)}</span>
            <div className={styles.historyActions}>
              {selectedEntry.duration != null && (
                <span className={styles.historyDuration}>{formatDuration(selectedEntry.duration)}</span>
              )}
              {bodyWeights.find(e => e.date === selectedDate) && (
                <span className={styles.historyBW}>
                  {bodyWeights.find(e => e.date === selectedDate)!.kg}kg
                </span>
              )}
              <button className={styles.historyEditBtn} onClick={() => setEditingHistoryIdx(selectedIdx)}>Edit</button>
            </div>
          </div>

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
