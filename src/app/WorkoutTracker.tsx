'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './workout.module.css'

type ExerciseName = 'squat' | 'benchPress' | 'barbellRow' | 'overheadPress' | 'deadlift'
type WorkoutLabel = 'A' | 'B'
type View = 'workout' | 'history' | 'calendar'

interface ExerciseDef {
  label: string
  sets: number
  increment: number
}

const EXERCISES: Record<ExerciseName, ExerciseDef> = {
  squat:         { label: 'Squat',          sets: 5, increment: 5   },
  benchPress:    { label: 'Bench Press',    sets: 5, increment: 2.5 },
  barbellRow:    { label: 'Barbell Row',    sets: 5, increment: 2.5 },
  overheadPress: { label: 'Overhead Press', sets: 5, increment: 2.5 },
  deadlift:      { label: 'Deadlift',       sets: 1, increment: 5   },
}

const WORKOUT_A: ExerciseName[] = ['squat', 'benchPress', 'barbellRow']
const WORKOUT_B: ExerciseName[] = ['squat', 'overheadPress', 'deadlift']

const DEFAULT_WEIGHTS: Record<ExerciseName, number> = {
  squat:         29.5,
  benchPress:    29.5,
  barbellRow:    29.5,
  overheadPress: 29.5,
  deadlift:      39.5,
}

interface Session {
  workout: WorkoutLabel
  startedAt: string
  sets: Record<ExerciseName, boolean[]>
}

interface HistoryEntry {
  date: string
  workout: WorkoutLabel
  exercises: { name: ExerciseName; weight: number; completed: number; total: number }[]
}

interface AppState {
  weights: Record<ExerciseName, number>
  nextWorkout: WorkoutLabel
  failStreak: Record<ExerciseName, number>
  session: Session | null
  history: HistoryEntry[]
}

const DEFAULT_STATE: AppState = {
  weights: { ...DEFAULT_WEIGHTS },
  nextWorkout: 'A',
  failStreak: { squat: 0, benchPress: 0, barbellRow: 0, overheadPress: 0, deadlift: 0 },
  session: null,
  history: [],
}

const STORAGE_KEY = 'stronglifts-5x5'

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    return { ...DEFAULT_STATE, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_STATE
  }
}

function save(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

function todayISO() {
  return new Date().toISOString()
}

function toDateKey(iso: string) {
  return iso.slice(0, 10)
}

function cellKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const REST_SECONDS = 90

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    ;[0, 0.14, 0.28].forEach(t => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0, ctx.currentTime + t)
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.2)
    })
  } catch { /* audio unavailable */ }
}

export default function WorkoutTracker() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE)
  const [view, setView] = useState<View>('workout')
  const [hydrated, setHydrated] = useState(false)
  const [calYear, setCalYear] = useState(0)
  const [calMonth, setCalMonth] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const [timer, setTimer] = useState<{ remaining: number; total: number } | null>(null)
  const [editingWeight, setEditingWeight] = useState<ExerciseName | null>(null)
  const [editValue, setEditValue] = useState('')

  function startEditWeight(ex: ExerciseName) {
    setEditingWeight(ex)
    setEditValue(String(state.weights[ex]))
  }

  function saveEditWeight() {
    if (!editingWeight) return
    const parsed = parseFloat(editValue)
    if (!isNaN(parsed) && parsed > 0) {
      update({ ...state, weights: { ...state.weights, [editingWeight]: parsed } })
    }
    setEditingWeight(null)
  }

  function handleWeightKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') saveEditWeight()
    if (e.key === 'Escape') setEditingWeight(null)
  }

  const timerRunning = timer !== null && timer.remaining > 0

  useEffect(() => {
    if (!timerRunning) return
    const id = setInterval(() => {
      setTimer(prev => {
        if (!prev) return null
        const next = prev.remaining - 1
        if (next <= 0) {
          beep()
          try { navigator.vibrate([300, 100, 300]) } catch { /* not supported */ }
          return { ...prev, remaining: 0 }
        }
        return { ...prev, remaining: next }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [timerRunning])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(load())
    setHydrated(true)
    const now = new Date()
    setCalYear(now.getFullYear())
    setCalMonth(now.getMonth())
  }, [])

  function update(next: AppState) {
    setState(next)
    save(next)
  }

  function startWorkout() {
    const workout = state.nextWorkout
    const exercises = workout === 'A' ? WORKOUT_A : WORKOUT_B
    const sets: Partial<Record<ExerciseName, boolean[]>> = {}
    for (const ex of exercises) {
      sets[ex] = Array(EXERCISES[ex].sets).fill(false)
    }
    update({
      ...state,
      session: {
        workout,
        startedAt: todayISO(),
        sets: sets as Record<ExerciseName, boolean[]>,
      },
    })
  }

  function toggleSet(exercise: ExerciseName, setIndex: number) {
    if (!state.session) return
    const current = state.session.sets[exercise][setIndex]
    const newSets = { ...state.session.sets }
    newSets[exercise] = [...newSets[exercise]]
    newSets[exercise][setIndex] = !current
    update({
      ...state,
      session: { ...state.session, sets: newSets },
    })
    if (!current) {
      setTimer({ remaining: REST_SECONDS, total: REST_SECONDS })
    }
  }

  function completeWorkout() {
    if (!state.session) return
    const { session } = state
    const exercises = session.workout === 'A' ? WORKOUT_A : WORKOUT_B

    const newWeights = { ...state.weights }
    const newFailStreak = { ...state.failStreak }
    const historyExercises: HistoryEntry['exercises'] = []

    const isMonday = new Date(session.startedAt).getDay() === 1

    for (const ex of exercises) {
      const total = EXERCISES[ex].sets
      const completed = session.sets[ex]?.filter(Boolean).length ?? 0
      const success = completed === total
      historyExercises.push({ name: ex, weight: state.weights[ex], completed, total })
      if (success) {
        if (isMonday) newWeights[ex] = state.weights[ex] + EXERCISES[ex].increment
        newFailStreak[ex] = 0
      } else {
        newFailStreak[ex] = (state.failStreak[ex] ?? 0) + 1
      }
    }

    const entry: HistoryEntry = {
      date: session.startedAt,
      workout: session.workout,
      exercises: historyExercises,
    }

    update({
      ...state,
      weights: newWeights,
      failStreak: newFailStreak,
      nextWorkout: session.workout === 'A' ? 'B' : 'A',
      session: null,
      history: [entry, ...state.history],
    })
    setTimer(null)
  }

  function resetWeights() {
    if (!confirm('Reset all weights to defaults?')) return
    update({ ...DEFAULT_STATE, history: state.history })
  }

  function exportData() {
    const json = JSON.stringify(state, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stronglifts-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        if (!parsed.weights || !Array.isArray(parsed.history)) {
          alert('Invalid backup file.')
          return
        }
        const count = parsed.history.length
        if (!confirm(`Restore ${count} workout${count !== 1 ? 's' : ''}? This replaces all current data.`)) return
        update({ ...DEFAULT_STATE, ...parsed, session: null })
      } catch {
        alert('Could not read the backup file.')
      }
    }
    reader.readAsText(file)
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

  if (!hydrated) return null

  const { session } = state
  const activeExercises = session
    ? (session.workout === 'A' ? WORKOUT_A : WORKOUT_B)
    : (state.nextWorkout === 'A' ? WORKOUT_A : WORKOUT_B)

  const allDone = session
    ? activeExercises.every(ex => {
        const total = EXERCISES[ex].sets
        const done = session.sets[ex]?.filter(Boolean).length ?? 0
        return done === total
      })
    : false

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.logo}>StrongLifts 5×5</h1>
        <nav className={styles.tabs}>
          <button
            className={`${styles.tab} ${view === 'workout' ? styles.tabActive : ''}`}
            onClick={() => setView('workout')}
          >
            Workout
          </button>
          <button
            className={`${styles.tab} ${view === 'history' ? styles.tabActive : ''}`}
            onClick={() => setView('history')}
          >
            History
          </button>
          <button
            className={`${styles.tab} ${view === 'calendar' ? styles.tabActive : ''}`}
            onClick={() => setView('calendar')}
          >
            Calendar
          </button>
        </nav>
      </header>

      {view === 'workout' && (
        <main className={styles.main}>
          <div className={styles.workoutHeader}>
            <span className={styles.badge}>
              Workout {session ? session.workout : state.nextWorkout}
            </span>
            {session && (
              <span className={styles.dateLabel}>
                {formatDate(session.startedAt)}
              </span>
            )}
          </div>

          <div className={styles.exerciseList}>
            {activeExercises.map(ex => {
              const def = EXERCISES[ex]
              const weight = state.weights[ex]
              const setsState = session?.sets[ex] ?? Array(def.sets).fill(false)
              const doneCount = setsState.filter(Boolean).length
              const isComplete = doneCount === def.sets
              const streak = state.failStreak[ex]

              return (
                <div
                  key={ex}
                  className={`${styles.exerciseCard} ${isComplete ? styles.exerciseDone : ''}`}
                >
                  <div className={styles.exerciseTop}>
                    <div>
                      <div className={styles.exerciseName}>{def.label}</div>
                      {streak >= 3 && (
                        <div className={styles.deloadWarning}>
                          {streak} fails — consider deload (−10%)
                        </div>
                      )}
                    </div>
                    {editingWeight === ex ? (
                      <input
                        className={styles.weightInput}
                        type="number"
                        step="0.5"
                        min="0"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={saveEditWeight}
                        onKeyDown={handleWeightKeyDown}
                        autoFocus
                      />
                    ) : (
                      <button className={styles.exerciseWeight} onClick={() => startEditWeight(ex)}>
                        {weight}<span className={styles.weightUnit}>kg</span>
                      </button>
                    )}
                  </div>

                  {session ? (
                    <div className={styles.setRow}>
                      {setsState.map((done, i) => (
                        <button
                          key={i}
                          className={`${styles.setBtn} ${done ? styles.setDone : ''}`}
                          onClick={() => toggleSet(ex, i)}
                          aria-label={`Set ${i + 1} ${done ? 'completed' : 'incomplete'}`}
                        >
                          {done ? '✓' : i + 1}
                        </button>
                      ))}
                      <span className={styles.setCount}>
                        {doneCount}/{def.sets}
                      </span>
                    </div>
                  ) : (
                    <div className={styles.setPreview}>
                      {def.sets}×5 reps
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {!session ? (
            <button className={styles.primaryBtn} onClick={startWorkout}>
              Start Workout {state.nextWorkout}
            </button>
          ) : (
            <div className={styles.actionRow}>
              <button
                className={`${styles.primaryBtn} ${!allDone ? styles.btnDisabled : ''}`}
                onClick={completeWorkout}
                disabled={!allDone}
              >
                Complete Workout
              </button>
              <button className={styles.ghostBtn} onClick={completeWorkout}>
                Finish Early
              </button>
            </div>
          )}

          <div className={styles.dataRow}>
            <button className={styles.dataBtn} onClick={exportData}>Export</button>
            <button className={styles.dataBtn} onClick={() => importRef.current?.click()}>Import</button>
            <button className={`${styles.dataBtn} ${styles.dataBtnDanger}`} onClick={resetWeights}>Reset</button>
            <input ref={importRef} type="file" accept=".json" className={styles.fileInput} onChange={importData} />
          </div>
        </main>
      )}

      {view === 'calendar' && (() => {
        const now = new Date()
        const todayKey = cellKey(now.getFullYear(), now.getMonth(), now.getDate())
        const workoutMap: Record<string, HistoryEntry> = {}
        for (const entry of state.history) {
          workoutMap[toDateKey(entry.date)] = entry
        }
        const firstDow = new Date(calYear, calMonth, 1).getDay()
        const offset = (firstDow + 6) % 7
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
        const cells: (number | null)[] = [
          ...Array(offset).fill(null),
          ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
        ]
        const selectedEntry = selectedDate ? workoutMap[selectedDate] : null

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
                      <span className={entry.workout === 'A' ? styles.calDotA : styles.calDotB}>
                        {entry.workout}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {selectedEntry && selectedDate && (
              <div className={styles.calDetail}>
                <div className={styles.historyHeader}>
                  <span className={styles.badge}>Workout {selectedEntry.workout}</span>
                  <span className={styles.dateLabel}>{formatDate(selectedEntry.date)}</span>
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
                </div>
              </div>
            )}
          </main>
        )
      })()}

      {view === 'history' && (
        <main className={styles.main}>
          {state.history.length === 0 ? (
            <div className={styles.empty}>
              <p>No workouts logged yet.</p>
              <p>Complete your first workout to see history here.</p>
            </div>
          ) : (
            <div className={styles.historyList}>
              {state.history.map((entry, i) => (
                <div key={i} className={styles.historyCard}>
                  <div className={styles.historyHeader}>
                    <span className={styles.badge}>Workout {entry.workout}</span>
                    <span className={styles.dateLabel}>{formatDate(entry.date)}</span>
                  </div>
                  <div className={styles.historyExercises}>
                    {entry.exercises.map(ex => {
                      const success = ex.completed === ex.total
                      return (
                        <div key={ex.name} className={styles.historyRow}>
                          <span className={styles.historyExName}>
                            {EXERCISES[ex.name].label}
                          </span>
                          <span className={styles.historyWeight}>{ex.weight}kg</span>
                          <span className={`${styles.historyResult} ${success ? styles.historySuccess : styles.historyFail}`}>
                            {ex.completed}/{ex.total}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}
      {timer !== null && (
        <div className={`${styles.timerWidget} ${timer.remaining === 0 ? styles.timerDone : ''}`}>
          <div className={styles.timerContent}>
            {timer.remaining === 0 ? (
              <span className={styles.timerReadyLabel}>Ready</span>
            ) : (
              <>
                <button
                  className={styles.timerAdjBtn}
                  onClick={() => setTimer(t => t && { ...t, remaining: Math.max(0, t.remaining - 30), total: t.total })}
                >−30</button>
                <span className={styles.timerTime}>{formatTime(timer.remaining)}</span>
                <button
                  className={styles.timerAdjBtn}
                  onClick={() => setTimer(t => t && { ...t, remaining: t.remaining + 30 })}
                >+30</button>
              </>
            )}
            <button className={styles.timerDismiss} onClick={() => setTimer(null)}>✕</button>
          </div>
          <div className={styles.timerBar}>
            <div
              className={styles.timerFill}
              style={{ width: `${((timer.total - timer.remaining) / timer.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
