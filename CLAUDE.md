@AGENTS.md

# StrongLifts 5×5 Tracker

A mobile-first Next.js app for tracking the Stronglifts 5×5 barbell programme. All state is persisted in `localStorage` — no backend, no auth.

## What the app does

**Stronglifts 5×5** alternates two workouts:
- **Workout A**: Squat 5×5, Bench Press 5×5, Barbell Row 5×5
- **Workout B**: Squat 5×5, Overhead Press 5×5, Deadlift 1×5

Workouts follow a weekly schedule: Monday/Wednesday/Friday run the next A/B workout, Tuesday/Thursday offer a **Free Session** (workout `'C'` — pick any exercises via the exercise picker, no fixed exercise list), and weekends show a rest-day message with no session available.

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

### Workout timer
A live `MM:SS` elapsed counter appears in the workout header as soon as a session starts. The duration is saved to the history entry on completion and displayed on history/calendar cards as "42 min" or "1h 12m".

### Weight editing
Tap the weight display on any exercise card to edit it inline. Enter or blur saves; Escape cancels. Works both during an active session and on the pre-workout preview.

### Extra exercises
During an active session a "+ Add Exercise" button (dashed border) appears below the standard exercise cards. Tapping it opens a picker with:
- **Saved exercises** — previously created exercises listed as tap targets (name + sets×reps + default weight). Tap to add instantly, or tap the ✎ button to expand an inline form and override sets/reps/weight for this add only (the saved default is unchanged).
- **New exercise form** — enter name, sets, reps, weight, then "Add & Save". The exercise is saved to the library and added to the session.

Added exercise cards behave like standard ones (set buttons, inline weight editing, rest timer). There is a × button to remove them. Editing a weight also updates the saved default. Extras are recorded in history and shown on Calendar detail cards under an "Extras" label.

### Body weight tracking
On Mondays, a "Body Weight" card appears above the exercise list. Enter weight in kg and tap "Log". After logging the value is displayed with an "Edit" button. Body weight entries are shown on Calendar detail cards for the matching date.

### Views
| Tab | Description |
|---|---|
| Workout | Current/next session with set tracking |
| Progress | Per-exercise stats (session count, personal best, success rate) and a weight-over-time sparkline |
| Calendar | Month grid with A/B/F dots (F = Free Session); tap a day to see that session's results |

### History editing
The Calendar day-detail panel for a past session has an **Edit** button that opens a bottom-sheet modal (`HistoryEditModal`) covering most of the viewport. It allows editing:
- Body weight for that day
- Exercise and extra weight, completed set count, and total set count
- Save / ✕ Cancel (or tap the backdrop to cancel)

### Data management
Three small buttons at the bottom of the Workout tab:
- **Export** — downloads `stronglifts-YYYY-MM-DD.json`
- **Import** — restores from a backup file (prompts for confirmation, clears any in-progress session)
- **Reset** — resets weights to defaults, keeps history

## File structure

```
src/app/
  layout.tsx            — root layout, metadata ("StrongLifts 5×5")
  page.tsx              — server component, renders <WorkoutTracker>
  WorkoutTracker.tsx    — client component: state, handlers, and the Workout tab layout
  workout.module.css    — all component styles (dark athletic theme)
  globals.css           — CSS variables and base reset
  components/
    ExerciseCard.tsx    — standard exercise card (sets, weight editing, deload warning)
    ExtraCard.tsx       — extra/custom exercise card
    BodyWeightCard.tsx  — Monday body weight logging card
    ExercisePicker.tsx  — add-exercise picker (saved list + new exercise form)
    RestTimer.tsx       — fixed bottom rest timer overlay
    CalendarView.tsx    — Calendar tab, including day detail/edit panel
    ProgressView.tsx    — Progress tab (per-exercise stats + sparklines)
  lib/
    types.ts            — shared TypeScript types
    constants.ts        — exercise defs, workout lists, rest duration
    storage.ts          — localStorage load/save
    utils.ts            — date/formatting helpers
public/
  sw.js                 — service worker (cache-first static, network-first navigation)
```

## Data model (localStorage key: `stronglifts-5x5`)

```ts
interface AppState {
  weights: Record<ExerciseName, number>      // current working weight per exercise
  nextWorkout: 'A' | 'B'
  failStreak: Record<ExerciseName, number>   // consecutive failures per exercise
  session: Session | null                    // null when no workout in progress
  history: HistoryEntry[]                    // newest first
  bodyWeights: BodyWeightEntry[]
  customExercises: CustomExerciseDef[]
  nextCustomId: number                       // auto-increment id for custom exercises
}

interface Session {
  workout: 'A' | 'B' | 'C'  // 'C' = Free Session
  startedAt: string        // ISO timestamp (used to determine day-of-week for Monday check)
  sets: Record<ExerciseName, boolean[]>
  extras: ExtraExercise[]
}

interface HistoryEntry {
  date: string
  workout: 'A' | 'B' | 'C'
  exercises: { name: ExerciseName; weight: number; completed: number; total: number }[]
  extras?: { name: string; weight: number; completed: number; total: number; reps: number }[]
  duration?: number        // seconds
}

interface BodyWeightEntry {
  date: string             // YYYY-MM-DD
  kg: number
}

interface CustomExerciseDef {
  id: string               // "custom-N"
  name: string
  sets: number
  reps: number
  defaultWeight: number    // updated when weight is edited during a session
}

interface ExtraExercise {
  defId: string
  name: string             // copied from def at add-time
  sets: boolean[]
  weight: number
  reps: number             // copied from def at add-time
}
```

## Design
Dark athletic theme (`#0f0f0f` background, `#f97316` orange accent, `#22c55e` green success). Mobile-first, max-width 480px, sticky header with tab navigation. Set buttons are large (58×58px) for easy tapping at the gym.
