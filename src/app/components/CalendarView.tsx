'use client'

import { useState } from 'react'
import styles from '../workout.module.css'
import type { HistoryEntry, BodyWeightEntry } from '../lib/types'
import { EXERCISES, MONTHS, DAY_HEADERS } from '../lib/constants'
import { formatDate, formatDuration, toDateKey, cellKey } from '../lib/utils'

interface HistoryDraft {
  exercises: HistoryEntry['exercises']
  bodyWeight: string
}

interface Props {
  history: HistoryEntry[]
  bodyWeights: BodyWeightEntry[]
  onSaveHistory: (historyIdx: number, exercises: HistoryEntry['exercises'], newBWKg: number | null) => void
}

export function CalendarView({ history, bodyWeights, onSaveHistory }: Props) {
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingHistoryIdx, setEditingHistoryIdx] = useState<number | null>(null)
  const [historyDraft, setHistoryDraft] = useState<HistoryDraft | null>(null)

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

  function startEdit(idx: number) {
    const entry = history[idx]
    const dateKey = toDateKey(entry.date)
    const bwEntry = bodyWeights.find(e => e.date === dateKey)
    setEditingHistoryIdx(idx)
    setHistoryDraft({
      exercises: entry.exercises.map(ex => ({ ...ex })),
      bodyWeight: bwEntry ? String(bwEntry.kg) : '',
    })
  }

  function saveEdit() {
    if (editingHistoryIdx === null || !historyDraft) return
    const bwParsed = parseFloat(historyDraft.bodyWeight)
    onSaveHistory(
      editingHistoryIdx,
      historyDraft.exercises,
      !isNaN(bwParsed) && bwParsed > 0 ? bwParsed : null,
    )
    setEditingHistoryIdx(null)
    setHistoryDraft(null)
  }

  function cancelEdit() {
    setEditingHistoryIdx(null)
    setHistoryDraft(null)
  }

  const firstDow = new Date(calYear, calMonth, 1).getDay()
  const offset = (firstDow + 6) % 7
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const selectedEntry = selectedDate ? workoutMap[selectedDate] : null
  const selectedIdx = selectedDate !== null ? (workoutIndexMap[selectedDate] ?? -1) : -1
  const isEditing = selectedIdx >= 0 && editingHistoryIdx === selectedIdx
  const draft = isEditing ? historyDraft : null

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
              {selectedEntry.duration != null && !isEditing && (
                <span className={styles.historyDuration}>{formatDuration(selectedEntry.duration)}</span>
              )}
              {bodyWeights.find(e => e.date === selectedDate) && !isEditing && (
                <span className={styles.historyBW}>
                  {bodyWeights.find(e => e.date === selectedDate)!.kg}kg
                </span>
              )}
              {isEditing ? (
                <>
                  <button className={styles.historySaveBtn} onClick={saveEdit}>Save</button>
                  <button className={styles.historyCancelBtn} onClick={cancelEdit}>✕</button>
                </>
              ) : (
                <button className={styles.historyEditBtn} onClick={() => startEdit(selectedIdx)}>Edit</button>
              )}
            </div>
          </div>

          {isEditing && draft && (
            <div className={styles.historyEditBWRow}>
              <span>Body weight</span>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="—"
                value={draft.bodyWeight}
                onChange={e => setHistoryDraft({ ...draft, bodyWeight: e.target.value })}
                className={styles.historyEditBWInput}
              />
              <span className={styles.bwUnit}>kg</span>
            </div>
          )}

          <div className={styles.historyExercises}>
            {(draft ? draft.exercises : selectedEntry.exercises).map((ex, exIdx) => {
              const success = ex.completed === ex.total
              if (draft) {
                return (
                  <div key={ex.name} className={styles.historyRow}>
                    <span className={styles.historyExName}>{EXERCISES[ex.name].label}</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={ex.weight}
                      onChange={e => {
                        const newEx = [...draft.exercises]
                        newEx[exIdx] = { ...newEx[exIdx], weight: parseFloat(e.target.value) || 0 }
                        setHistoryDraft({ ...draft, exercises: newEx })
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
                        const newEx = [...draft.exercises]
                        newEx[exIdx] = { ...newEx[exIdx], completed: val }
                        setHistoryDraft({ ...draft, exercises: newEx })
                      }}
                      className={styles.historyEditSetsInput}
                    />
                    <span className={styles.historyEditTotal}>/{ex.total}</span>
                  </div>
                )
              }
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
            {!draft && selectedEntry.extras && selectedEntry.extras.length > 0 && (
              <>
                <div className={styles.extrasLabel}>Extras</div>
                {selectedEntry.extras.map((ex, i) => (
                  <div key={i} className={styles.historyRow}>
                    <span className={styles.historyExName}>{ex.name}</span>
                    <span className={styles.historyWeight}>{ex.weight}kg</span>
                    <span className={styles.historyMeta}>×{ex.reps}</span>
                    <span className={`${styles.historyResult} ${ex.completed === ex.total ? styles.historySuccess : styles.historyFail}`}>
                      {ex.completed}/{ex.total}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
