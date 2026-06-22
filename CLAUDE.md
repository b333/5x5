@AGENTS.md

# StrongLifts 5×5 Tracker

A mobile-first Next.js app for tracking the Stronglifts 5×5 barbell programme. All state is persisted in `localStorage` — no backend, no auth.

## What the app does

**Stronglifts 5×5** alternates two workouts:
- **Workout A**: Squat 5×5, Bench Press 5×5, Barbell Row 5×5
- **Workout B**: Squat 5×5, Overhead Press 5×5, Deadlift 1×5

The app tracks which workout is next, the current working weight for each exercise, and a full session history.

### Core behaviours
- Tap a set button to check it off. Checking a set starts a 90-second rest timer.
- When all sets for all exercises are done, "Complete Workout" becomes active.
- "Finish Early" logs the partial session without requiring all sets.
- **Weight progression**: weights only increment on Monday workouts. Upper body lifts go up 2.5 kg, squat and deadlift go up 5 kg. Non-Monday workouts still record success/failure but weights stay the same.
- **Fail streak**: if you don't complete all sets for an exercise, its fail streak increments. At 3 consecutive failures a deload warning appears on the exercise card.
- Completing a workout flips the next workout from A→B or B→A.

### Rest timer
Fixed bottom overlay, auto-starts at 90s when any set is checked. −30/+30 buttons adjust duration on the fly. Three-beep audio alert (Web Audio API) + vibration when the countdown hits zero. Dismissed with ✕ or automatically cleared when a workout is completed.

### Weight editing
Tap the weight display on any exercise card to edit it inline. Enter or blur saves; Escape cancels. Works both during an active session and on the pre-workout preview.

### Views
| Tab | Description |
|---|---|
| Workout | Current/next session with set tracking |
| History | Chronological list of completed sessions |
| Calendar | Month grid with A/B dots; tap a day to see exercise results |

### Data management
Three small buttons at the bottom of the Workout tab:
- **Export** — downloads `stronglifts-YYYY-MM-DD.json`
- **Import** — restores from a backup file (prompts for confirmation, clears any in-progress session)
- **Reset** — resets weights to defaults, keeps history

## File structure

```
src/app/
  layout.tsx          — root layout, metadata ("StrongLifts 5×5")
  page.tsx            — server component, renders <WorkoutTracker>
  WorkoutTracker.tsx  — single client component containing all logic and UI
  workout.module.css  — all component styles (dark athletic theme)
  globals.css         — CSS variables and base reset
```

## Data model (localStorage key: `stronglifts-5x5`)

```ts
interface AppState {
  weights: Record<ExerciseName, number>      // current working weight per exercise
  nextWorkout: 'A' | 'B'
  failStreak: Record<ExerciseName, number>   // consecutive failures per exercise
  session: Session | null                    // null when no workout in progress
  history: HistoryEntry[]                    // newest first
}

interface Session {
  workout: 'A' | 'B'
  startedAt: string        // ISO timestamp (used to determine day-of-week for Monday check)
  sets: Record<ExerciseName, boolean[]>
}

interface HistoryEntry {
  date: string
  workout: 'A' | 'B'
  exercises: { name: ExerciseName; weight: number; completed: number; total: number }[]
}
```

## Design
Dark athletic theme (`#0f0f0f` background, `#f97316` orange accent, `#22c55e` green success). Mobile-first, max-width 480px, sticky header with tab navigation. Set buttons are large (44×44px) for easy tapping at the gym.
