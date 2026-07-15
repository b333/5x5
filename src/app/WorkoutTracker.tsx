'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './workout.module.css'
import type { AppState, ExerciseName, ExtraExercise, CustomExerciseDef, HistoryEntry } from './lib/types'
import { EXERCISES, WORKOUT_A, WORKOUT_B, DEFAULT_STATE, REST_SECONDS } from './lib/constants'
import { load, save } from './lib/storage'
import { todayISO, toDateKey, formatDate, formatElapsed, beep } from './lib/utils'
import { ExerciseCard } from './components/ExerciseCard'
import { ExtraCard } from './components/ExtraCard'
import { BodyWeightCard } from './components/BodyWeightCard'
import { ExercisePicker } from './components/ExercisePicker'
import { RestTimer } from './components/RestTimer'
import { CalendarView } from './components/CalendarView'
import { ProgressView } from './components/ProgressView'

type View = 'workout' | 'progress' | 'calendar'

export default function WorkoutTracker() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE)
  const [view, setView] = useState<View>('workout')
  const [hydrated, setHydrated] = useState(false)
  const [timer, setTimer] = useState<{ remaining: number; total: number } | null>(null)
  const [workoutElapsed, setWorkoutElapsed] = useState(0)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(load())
    setHydrated(true)
  }, [])

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

  function update(next: AppState) {
    setState(next)
    save(next)
  }

  function startWorkout() {
    const workout = state.nextWorkout
    const exercises = workout === 'A' ? WORKOUT_A : WORKOUT_B
    const sets: Partial<Record<ExerciseName, boolean[]>> = {}
    for (const ex of exercises) sets[ex] = Array(EXERCISES[ex].sets).fill(false)
    update({ ...state, session: { workout, startedAt: todayISO(), sets: sets as Record<ExerciseName, boolean[]>, extras: [] } })
  }

  function startFreeSession() {
    update({ ...state, session: { workout: 'C', startedAt: todayISO(), sets: {} as Record<ExerciseName, boolean[]>, extras: [] } })
    setShowExercisePicker(true)
  }

  function toggleSet(exercise: ExerciseName, setIndex: number) {
    if (!state.session) return
    const current = state.session.sets[exercise][setIndex]
    const newSets = { ...state.session.sets, [exercise]: [...state.session.sets[exercise]] }
    newSets[exercise][setIndex] = !current
    update({ ...state, session: { ...state.session, sets: newSets } })
    if (!current) setTimer({ remaining: REST_SECONDS, total: REST_SECONDS })
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

  function saveExerciseWeight(ex: ExerciseName, newWeight: number) {
    update({ ...state, weights: { ...state.weights, [ex]: newWeight } })
  }

  function saveExtraWeight(extraIdx: number, newWeight: number) {
    if (!state.session) return
    const defId = state.session.extras[extraIdx].defId
    const extras = (state.session.extras ?? []).map((ex, i) => i === extraIdx ? { ...ex, weight: newWeight } : ex)
    const customExercises = (state.customExercises ?? []).map(def =>
      def.id === defId ? { ...def, defaultWeight: newWeight } : def
    )
    update({ ...state, session: { ...state.session, extras }, customExercises })
  }

  function removeExtra(extraIdx: number) {
    if (!state.session) return
    const extras = (state.session.extras ?? []).filter((_, i) => i !== extraIdx)
    update({ ...state, session: { ...state.session, extras } })
  }

  function addCustomExercise(def: CustomExerciseDef) {
    if (!state.session) return
    const extra: ExtraExercise = {
      defId: def.id, name: def.name,
      sets: Array(def.sets).fill(false), weight: def.defaultWeight, reps: def.reps,
    }
    update({ ...state, session: { ...state.session, extras: [...(state.session.extras ?? []), extra] } })
    setShowExercisePicker(false)
  }

  function createAndAddExercise(name: string, sets: number, reps: number, weight: number) {
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
    setShowExercisePicker(false)
  }

  function deleteCustomExercise(id: string) {
    update({ ...state, customExercises: (state.customExercises ?? []).filter(d => d.id !== id) })
  }

  function saveCustomExerciseDef(name: string, sets: number, reps: number, weight: number): CustomExerciseDef {
    const id = `custom-${state.nextCustomId ?? 1}`
    const def: CustomExerciseDef = { id, name, sets, reps, defaultWeight: weight }
    update({
      ...state,
      nextCustomId: (state.nextCustomId ?? 1) + 1,
      customExercises: [...(state.customExercises ?? []), def],
    })
    return def
  }

  function logBodyWeight(kg: number) {
    const dateKey = new Date().toISOString().slice(0, 10)
    const existing = (state.bodyWeights ?? []).filter(e => e.date !== dateKey)
    update({ ...state, bodyWeights: [...existing, { date: dateKey, kg }] })
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
      historyExercises.push({ name: ex, weight: state.weights[ex], completed, total })
      if (completed === total) {
        if (isMonday) newWeights[ex] = state.weights[ex] + EXERCISES[ex].increment
        newFailStreak[ex] = 0
      } else {
        newFailStreak[ex] = (state.failStreak[ex] ?? 0) + 1
      }
    }

    const extras = (session.extras ?? []).map(ex => ({
      name: ex.name, weight: ex.weight,
      completed: ex.sets.filter(Boolean).length,
      total: ex.sets.length, reps: ex.reps,
    }))

    update({
      ...state,
      weights: newWeights,
      failStreak: newFailStreak,
      nextWorkout: session.workout === 'A' ? 'B' : session.workout === 'B' ? 'A' : state.nextWorkout,
      session: null,
      history: [{
        date: session.startedAt,
        workout: session.workout,
        exercises: historyExercises,
        extras: extras.length ? extras : undefined,
        duration: workoutElapsed,
      }, ...state.history],
    })
    setTimer(null)
  }

  function saveHistoryEdit(historyIdx: number, exercises: HistoryEntry['exercises'], extras: HistoryEntry['extras'], newBWKg: number | null) {
    const entry = state.history[historyIdx]
    const dateKey = toDateKey(entry.date)
    const newHistory = state.history.map((e, i) => i === historyIdx ? { ...e, exercises, extras } : e)
    let newBodyWeights = (state.bodyWeights ?? []).filter(e => e.date !== dateKey)
    if (newBWKg !== null) newBodyWeights = [...newBodyWeights, { date: dateKey, kg: newBWKg }]
    update({ ...state, history: newHistory, bodyWeights: newBodyWeights })
  }

  function resetWeights() {
    if (!confirm('Reset all weights to defaults?')) return
    update({ ...DEFAULT_STATE, history: state.history })
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
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
        if (!parsed.weights || !Array.isArray(parsed.history)) { alert('Invalid backup file.'); return }
        const count = parsed.history.length
        if (!confirm(`Restore ${count} workout${count !== 1 ? 's' : ''}? This replaces all current data.`)) return
        update({ ...DEFAULT_STATE, ...parsed, session: null })
      } catch { alert('Could not read the backup file.') }
    }
    reader.readAsText(file)
  }

  if (!hydrated) return null

  const { session } = state
  const activeExercises = session
    ? (session.workout === 'A' ? WORKOUT_A : session.workout === 'B' ? WORKOUT_B : [])
    : (state.nextWorkout === 'A' ? WORKOUT_A : WORKOUT_B)

  const allDone = session
    ? activeExercises.every(ex => (session.sets[ex]?.filter(Boolean).length ?? 0) === EXERCISES[ex].sets)
    : false

  const todayIsMonday = new Date().getDay() === 1
  const todayKey = new Date().toISOString().slice(0, 10)
  const todayBW = (state.bodyWeights ?? []).find(e => e.date === todayKey)

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.logo}>StrongLifts 5×5</h1>
        <nav className={styles.tabs}>
          <button className={`${styles.tab} ${view === 'workout' ? styles.tabActive : ''}`} onClick={() => setView('workout')}>Workout</button>
          <button className={`${styles.tab} ${view === 'progress' ? styles.tabActive : ''}`} onClick={() => setView('progress')}>Progress</button>
          <button className={`${styles.tab} ${view === 'calendar' ? styles.tabActive : ''}`} onClick={() => setView('calendar')}>Calendar</button>
        </nav>
      </header>

      {view === 'workout' && (
        <main className={styles.main}>
          <div className={styles.workoutHeader}>
            <span className={styles.badge}>
              {session?.workout === 'C' ? 'Free Session' : `Workout ${session ? session.workout : state.nextWorkout}`}
            </span>
            {session && <span className={styles.dateLabel}>{formatDate(session.startedAt)}</span>}
            {session && <span className={styles.workoutTimer}>{formatElapsed(workoutElapsed)}</span>}
          </div>

          {todayIsMonday && <BodyWeightCard todayBW={todayBW} onLog={logBodyWeight} />}

          <div className={styles.exerciseList}>
            {activeExercises.map(ex => (
              <ExerciseCard
                key={ex}
                name={ex}
                weight={state.weights[ex]}
                failStreak={state.failStreak[ex] ?? 0}
                setsState={session?.sets[ex] ?? Array(EXERCISES[ex].sets).fill(false)}
                isActive={!!session}
                onToggleSet={setIdx => toggleSet(ex, setIdx)}
                onWeightSave={newWeight => saveExerciseWeight(ex, newWeight)}
              />
            ))}
          </div>

          {session && (session.extras ?? []).map((extra, extraIdx) => (
            <ExtraCard
              key={extraIdx}
              extra={extra}
              onToggleSet={setIdx => toggleExtraSet(extraIdx, setIdx)}
              onWeightSave={newWeight => saveExtraWeight(extraIdx, newWeight)}
              onRemove={() => removeExtra(extraIdx)}
            />
          ))}

          {session && (
            showExercisePicker ? (
              <ExercisePicker
                customExercises={state.customExercises ?? []}
                onAdd={addCustomExercise}
                onCreate={createAndAddExercise}
                onDelete={deleteCustomExercise}
                onClose={() => setShowExercisePicker(false)}
              />
            ) : (
              <button className={styles.addExerciseBtn} onClick={() => setShowExercisePicker(true)}>
                + Add Exercise
              </button>
            )
          )}

          {!session ? (() => {
            const dow = new Date().getDay()
            if (dow === 0 || dow === 6) return <div className={styles.restDay}>Rest day — recover and come back strong.</div>
            if (dow === 2 || dow === 4) return <button className={styles.primaryBtn} onClick={startFreeSession}>Start Free Session</button>
            return <button className={styles.primaryBtn} onClick={startWorkout}>Start Workout {state.nextWorkout}</button>
          })() : (
            <div className={styles.actionRow}>
              <button
                className={`${styles.primaryBtn} ${!allDone ? styles.btnDisabled : ''}`}
                onClick={completeWorkout}
                disabled={!allDone}
              >Complete Workout</button>
              <button className={styles.ghostBtn} onClick={completeWorkout}>Finish Early</button>
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

      {view === 'progress' && (
        <ProgressView history={state.history} weights={state.weights} />
      )}

      {view === 'calendar' && (
        <CalendarView
          history={state.history}
          bodyWeights={state.bodyWeights ?? []}
          customExercises={state.customExercises ?? []}
          onSaveHistory={saveHistoryEdit}
          onCreateCustomExercise={saveCustomExerciseDef}
          onDeleteCustomExercise={deleteCustomExercise}
        />
      )}

      {timer !== null && (
        <RestTimer
          timer={timer}
          onDismiss={() => setTimer(null)}
          onAdjust={delta => setTimer(t => t ? { ...t, remaining: Math.max(0, t.remaining + delta) } : t)}
        />
      )}
    </div>
  )
}
