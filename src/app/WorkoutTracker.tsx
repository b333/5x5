'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './workout.module.css'

type ExerciseName = 'squat' | 'benchPress' | 'barbellRow' | 'overheadPress' | 'deadlift'
type WorkoutLabel = 'A' | 'B' | 'C'
type View = 'workout' | 'calendar'

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

interface CustomExerciseDef {
  id: string
  name: string
  sets: number
  reps: number
  defaultWeight: number
}

interface ExtraExercise {
  defId: string
  name: string
  sets: boolean[]
  weight: number
  reps: number
}

interface Session {
  workout: WorkoutLabel
  startedAt: string
  sets: Record<ExerciseName, boolean[]>
  extras: ExtraExercise[]
}

interface HistoryEntry {
  date: string
  workout: WorkoutLabel
  exercises: { name: ExerciseName; weight: number; completed: number; total: number }[]
  extras?: { name: string; weight: number; completed: number; total: number; reps: number }[]
  duration?: number  // seconds
}

interface BodyWeightEntry {
  date: string  // YYYY-MM-DD
  kg: number
}

interface AppState {
  weights: Record<ExerciseName, number>
  nextWorkout: WorkoutLabel
  failStreak: Record<ExerciseName, number>
  session: Session | null
  history: HistoryEntry[]
  bodyWeights: BodyWeightEntry[]
  customExercises: CustomExerciseDef[]
  nextCustomId: number
}

const DEFAULT_STATE: AppState = {
  weights: { ...DEFAULT_WEIGHTS },
  nextWorkout: 'A',
  failStreak: { squat: 0, benchPress: 0, barbellRow: 0, overheadPress: 0, deadlift: 0 },
  session: null,
  history: [],
  bodyWeights: [],
  customExercises: [],
  nextCustomId: 1,
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

function formatElapsed(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
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
  const [bodyWeightInput, setBodyWeightInput] = useState('')
  const [editingBW, setEditingBW] = useState(false)
  const [workoutElapsed, setWorkoutElapsed] = useState(0)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [pickerFilter, setPickerFilter] = useState('')
  const [newExName, setNewExName] = useState('')
  const [newExSets, setNewExSets] = useState('3')
  const [newExReps, setNewExReps] = useState('10')
  const [newExWeight, setNewExWeight] = useState('20')
  const [editingExtraIdx, setEditingExtraIdx] = useState<number | null>(null)
  const [editExtraWeightValue, setEditExtraWeightValue] = useState('')
  const [editingHistoryIdx, setEditingHistoryIdx] = useState<number | null>(null)
  const [historyDraft, setHistoryDraft] = useState<{
    exercises: { name: ExerciseName; weight: number; completed: number; total: number }[]
    bodyWeight: string
  } | null>(null)

  function closePicker() {
    setShowExercisePicker(false)
    setPickerFilter('')
  }

  function addCustomExercise(def: CustomExerciseDef) {
    if (!state.session) return
    const extra: ExtraExercise = {
      defId: def.id,
      name: def.name,
      sets: Array(def.sets).fill(false),
      weight: def.defaultWeight,
      reps: def.reps,
    }
    update({ ...state, session: { ...state.session, extras: [...(state.session.extras ?? []), extra] } })
    closePicker()
  }

  function deleteCustomExercise(id: string) {
    const name = (state.customExercises ?? []).find(d => d.id === id)?.name ?? 'this exercise'
    if (!confirm(`Delete "${name}" from saved exercises?`)) return
    update({ ...state, customExercises: (state.customExercises ?? []).filter(d => d.id !== id) })
  }

  function createAndAddExercise() {
    const name = newExName.trim()
    if (!name) return
    const sets = Math.max(1, parseInt(newExSets) || 3)
    const reps = Math.max(1, parseInt(newExReps) || 10)
    const weight = parseFloat(newExWeight) || 20
    const id = `custom-${state.nextCustomId ?? 1}`
    const def: CustomExerciseDef = { id, name, sets, reps, defaultWeight: weight }
    const extra: ExtraExercise = { defId: id, name, sets: Array(sets).fill(false), weight, reps }
    update({
      ...state,
      nextCustomId: (state.nextCustomId ?? 1) + 1,
      customExercises: [...(state.customExercises ?? []), def],
      session: state.session
        ? { ...state.session, extras: [...(state.session.extras ?? []), extra] }
        : state.session,
    })
    setNewExName('')
    setNewExSets('3')
    setNewExReps('10')
    setNewExWeight('20')
    closePicker()
  }

  function removeExtra(extraIdx: number) {
    if (!state.session) return
    const extras = (state.session.extras ?? []).filter((_, i) => i !== extraIdx)
    update({ ...state, session: { ...state.session, extras } })
  }

  function toggleExtraSet(extraIdx: number, setIdx: number) {
    if (!state.session) return
    const wasUnchecked = !state.session.extras[extraIdx].sets[setIdx]
    const extras = (state.session.extras ?? []).map((ex, i) => {
      if (i !== extraIdx) return ex
      const newSets = [...ex.sets]
      newSets[setIdx] = !newSets[setIdx]
      return { ...ex, sets: newSets }
    })
    update({ ...state, session: { ...state.session, extras } })
    if (wasUnchecked) setTimer({ remaining: REST_SECONDS, total: REST_SECONDS })
  }

  function startEditExtraWeight(idx: number) {
    if (!state.session) return
    setEditingExtraIdx(idx)
    setEditExtraWeightValue(String(state.session.extras[idx].weight))
  }

  function saveEditExtraWeight() {
    if (editingExtraIdx === null || !state.session) return
    const parsed = parseFloat(editExtraWeightValue)
    if (!isNaN(parsed) && parsed > 0) {
      const defId = state.session.extras[editingExtraIdx].defId
      const extras = (state.session.extras ?? []).map((ex, i) =>
        i === editingExtraIdx ? { ...ex, weight: parsed } : ex
      )
      const customExercises = (state.customExercises ?? []).map(def =>
        def.id === defId ? { ...def, defaultWeight: parsed } : def
      )
      update({ ...state, session: { ...state.session, extras }, customExercises })
    }
    setEditingExtraIdx(null)
  }

  function startEditHistory(idx: number) {
    const entry = state.history[idx]
    const dateKey = toDateKey(entry.date)
    const bwEntry = (state.bodyWeights ?? []).find(e => e.date === dateKey)
    setEditingHistoryIdx(idx)
    setHistoryDraft({
      exercises: entry.exercises.map(ex => ({ ...ex })),
      bodyWeight: bwEntry ? String(bwEntry.kg) : '',
    })
  }

  function saveEditHistory() {
    if (editingHistoryIdx === null || !historyDraft) return
    const entry = state.history[editingHistoryIdx]
    const dateKey = toDateKey(entry.date)
    const newHistory = state.history.map((e, i) =>
      i === editingHistoryIdx ? { ...e, exercises: historyDraft.exercises } : e
    )
    let newBodyWeights = (state.bodyWeights ?? []).filter(e => e.date !== dateKey)
    const bwParsed = parseFloat(historyDraft.bodyWeight)
    if (!isNaN(bwParsed) && bwParsed > 0) {
      newBodyWeights = [...newBodyWeights, { date: dateKey, kg: bwParsed }]
    }
    update({ ...state, history: newHistory, bodyWeights: newBodyWeights })
    setEditingHistoryIdx(null)
    setHistoryDraft(null)
  }

  function cancelEditHistory() {
    setEditingHistoryIdx(null)
    setHistoryDraft(null)
  }

  function logBodyWeight() {
    const parsed = parseFloat(bodyWeightInput)
    if (isNaN(parsed) || parsed <= 0) return
    const dateKey = new Date().toISOString().slice(0, 10)
    const existing = (state.bodyWeights ?? []).filter(e => e.date !== dateKey)
    update({ ...state, bodyWeights: [...existing, { date: dateKey, kg: parsed }] })
    setBodyWeightInput('')
    setEditingBW(false)
  }

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
    const startedAt = state.session?.startedAt
    if (!startedAt) return
    const tick = () => setWorkoutElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [state.session?.startedAt])

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
        extras: [],
      },
    })
  }

  function startFreeSession() {
    update({
      ...state,
      session: {
        workout: 'C',
        startedAt: todayISO(),
        sets: {} as Record<ExerciseName, boolean[]>,
        extras: [],
      },
    })
    setShowExercisePicker(true)
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
    const exercises = session.workout === 'A' ? WORKOUT_A : session.workout === 'B' ? WORKOUT_B : []

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

    const extras = (session.extras ?? []).map(ex => ({
      name: ex.name,
      weight: ex.weight,
      completed: ex.sets.filter(Boolean).length,
      total: ex.sets.length,
      reps: ex.reps,
    }))

    const entry: HistoryEntry = {
      date: session.startedAt,
      workout: session.workout,
      exercises: historyExercises,
      extras: extras.length ? extras : undefined,
      duration: workoutElapsed,
    }

    update({
      ...state,
      weights: newWeights,
      failStreak: newFailStreak,
      nextWorkout: session.workout === 'A' ? 'B' : session.workout === 'B' ? 'A' : state.nextWorkout,
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
    ? (session.workout === 'A' ? WORKOUT_A : session.workout === 'B' ? WORKOUT_B : [])
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
              {session?.workout === 'C' ? 'Free Session' : `Workout ${session ? session.workout : state.nextWorkout}`}
            </span>
            {session && (
              <span className={styles.dateLabel}>
                {formatDate(session.startedAt)}
              </span>
            )}
            {session && (
              <span className={styles.workoutTimer}>{formatElapsed(workoutElapsed)}</span>
            )}
          </div>

          {(() => {
            const todayKey = new Date().toISOString().slice(0, 10)
            const todayIsMonday = new Date().getDay() === 1
            if (!todayIsMonday) return null
            const todayBW = (state.bodyWeights ?? []).find(e => e.date === todayKey)
            return (
              <div className={styles.bodyWeightCard}>
                <span className={styles.bodyWeightLabel}>Body Weight</span>
                {todayBW && !editingBW ? (
                  <div className={styles.bodyWeightLogged}>
                    <span className={styles.bodyWeightValue}>{todayBW.kg}</span>
                    <span className={styles.bwUnit}>kg</span>
                    <button
                      className={styles.bodyWeightEdit}
                      onClick={() => { setBodyWeightInput(String(todayBW.kg)); setEditingBW(true) }}
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
                      value={bodyWeightInput}
                      onChange={e => setBodyWeightInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') logBodyWeight() }}
                    />
                    <span className={styles.bwUnit}>kg</span>
                    <button className={styles.bodyWeightBtn} onClick={logBodyWeight}>Log</button>
                    {editingBW && (
                      <button className={styles.bwCancel} onClick={() => { setEditingBW(false); setBodyWeightInput('') }}>✕</button>
                    )}
                  </div>
                )}
              </div>
            )
          })()}

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

          {session && (session.extras ?? []).map((extra, extraIdx) => {
            const doneCount = extra.sets.filter(Boolean).length
            const isComplete = doneCount === extra.sets.length
            return (
              <div key={extraIdx} className={`${styles.exerciseCard} ${isComplete ? styles.exerciseDone : ''} ${styles.extraCard}`}>
                <div className={styles.exerciseTop}>
                  <div className={styles.exerciseName}>{extra.name}</div>
                  <div className={styles.extraRight}>
                    {editingExtraIdx === extraIdx ? (
                      <input
                        className={styles.weightInput}
                        type="number"
                        step="0.5"
                        min="0"
                        value={editExtraWeightValue}
                        onChange={e => setEditExtraWeightValue(e.target.value)}
                        onBlur={saveEditExtraWeight}
                        onKeyDown={e => { if (e.key === 'Enter') saveEditExtraWeight(); if (e.key === 'Escape') setEditingExtraIdx(null) }}
                        autoFocus
                      />
                    ) : (
                      <button className={styles.exerciseWeight} onClick={() => startEditExtraWeight(extraIdx)}>
                        {extra.weight}<span className={styles.weightUnit}>kg</span>
                      </button>
                    )}
                    <button className={styles.extraRemoveBtn} onClick={() => removeExtra(extraIdx)}>×</button>
                  </div>
                </div>
                <div className={styles.setRow}>
                  {extra.sets.map((done, i) => (
                    <button
                      key={i}
                      className={`${styles.setBtn} ${done ? styles.setDone : ''}`}
                      onClick={() => toggleExtraSet(extraIdx, i)}
                      aria-label={`Set ${i + 1} ${done ? 'completed' : 'incomplete'}`}
                    >
                      {done ? '✓' : i + 1}
                    </button>
                  ))}
                  <span className={styles.setCount}>{doneCount}/{extra.sets.length} × {extra.reps}</span>
                </div>
              </div>
            )
          })}

          {session && (
            showExercisePicker ? (
              <div className={styles.exercisePicker}>
                <div className={styles.pickerHeader}>
                  <span className={styles.pickerTitle}>Add Exercise</span>
                  <button className={styles.pickerClose} onClick={closePicker}>✕</button>
                </div>
                {(state.customExercises ?? []).length > 0 && (() => {
                  const filtered = (state.customExercises ?? []).filter(d =>
                    d.name.toLowerCase().includes(pickerFilter.toLowerCase())
                  )
                  return (
                    <div className={styles.pickerSaved}>
                      <input
                        className={styles.pickerFilterInput}
                        type="text"
                        placeholder="Filter saved exercises…"
                        value={pickerFilter}
                        onChange={e => setPickerFilter(e.target.value)}
                      />
                      {filtered.length === 0 && (
                        <div className={styles.pickerNoResults}>No matches</div>
                      )}
                      {filtered.map(def => (
                        <div key={def.id} className={styles.pickerSavedRow}>
                          <button className={styles.pickerSavedAdd} onClick={() => addCustomExercise(def)}>
                            <span className={styles.pickerSavedName}>{def.name}</span>
                            <span className={styles.pickerSavedMeta}>{def.sets}×{def.reps} · {def.defaultWeight}kg</span>
                          </button>
                          <button className={styles.pickerSavedDelete} onClick={() => deleteCustomExercise(def.id)}>×</button>
                        </div>
                      ))}
                    </div>
                  )
                })()}
                <div className={styles.pickerNew}>
                  <input
                    className={styles.pickerInput}
                    type="text"
                    placeholder="Exercise name"
                    value={newExName}
                    onChange={e => setNewExName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newExName.trim()) createAndAddExercise() }}
                    autoFocus
                  />
                  <div className={styles.pickerRow}>
                    <label className={styles.pickerLabel}>
                      Sets
                      <input className={styles.pickerNumInput} type="number" min="1" max="10" value={newExSets} onChange={e => setNewExSets(e.target.value)} />
                    </label>
                    <label className={styles.pickerLabel}>
                      Reps
                      <input className={styles.pickerNumInput} type="number" min="1" max="50" value={newExReps} onChange={e => setNewExReps(e.target.value)} />
                    </label>
                    <label className={styles.pickerLabel}>
                      Weight
                      <input className={styles.pickerNumInput} type="number" min="0" step="0.5" value={newExWeight} onChange={e => setNewExWeight(e.target.value)} />
                    </label>
                  </div>
                  <button
                    className={`${styles.pickerAddBtn} ${!newExName.trim() ? styles.btnDisabled : ''}`}
                    disabled={!newExName.trim()}
                    onClick={createAndAddExercise}
                  >
                    Add &amp; Save
                  </button>
                </div>
              </div>
            ) : (
              <button className={styles.addExerciseBtn} onClick={() => setShowExercisePicker(true)}>
                + Add Exercise
              </button>
            )
          )}

          {!session ? (() => {
            const dow = new Date().getDay()
            if (dow === 0 || dow === 6) {
              return <div className={styles.restDay}>Rest day — recover and come back strong.</div>
            }
            if (dow === 2 || dow === 4) {
              return (
                <button className={styles.primaryBtn} onClick={startFreeSession}>
                  Start Free Session
                </button>
              )
            }
            return (
              <button className={styles.primaryBtn} onClick={startWorkout}>
                Start Workout {state.nextWorkout}
              </button>
            )
          })() : (
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
        const workoutIndexMap: Record<string, number> = {}
        for (let idx = 0; idx < state.history.length; idx++) {
          const k = toDateKey(state.history[idx].date)
          workoutMap[k] = state.history[idx]
          workoutIndexMap[k] = idx
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
                  <span className={styles.badge}>{selectedEntry.workout === 'C' ? 'Free Session' : `Workout ${selectedEntry.workout}`}</span>
                  <span className={styles.dateLabel}>{formatDate(selectedEntry.date)}</span>
                  <div className={styles.historyActions}>
                    {selectedEntry.duration != null && !isEditing && (
                      <span className={styles.historyDuration}>{formatDuration(selectedEntry.duration)}</span>
                    )}
                    {(state.bodyWeights ?? []).find(e => e.date === selectedDate) && !isEditing && (
                      <span className={styles.historyBW}>
                        {(state.bodyWeights ?? []).find(e => e.date === selectedDate)!.kg}kg
                      </span>
                    )}
                    {isEditing ? (
                      <>
                        <button className={styles.historySaveBtn} onClick={saveEditHistory}>Save</button>
                        <button className={styles.historyCancelBtn} onClick={cancelEditHistory}>✕</button>
                      </>
                    ) : (
                      <button className={styles.historyEditBtn} onClick={() => startEditHistory(selectedIdx)}>Edit</button>
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
      })()}

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
