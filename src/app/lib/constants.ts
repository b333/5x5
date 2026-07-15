import type { ExerciseName, ExerciseDef, AppState } from './types'

export const EXERCISES: Record<ExerciseName, ExerciseDef> = {
  squat:         { label: 'Squat',          sets: 5, increment: 5   },
  benchPress:    { label: 'Bench Press',    sets: 5, increment: 2.5 },
  barbellRow:    { label: 'Barbell Row',    sets: 5, increment: 2.5 },
  overheadPress: { label: 'Overhead Press', sets: 5, increment: 2.5 },
  deadlift:      { label: 'Deadlift',       sets: 1, increment: 5   },
}

export const WORKOUT_A: ExerciseName[] = ['squat', 'benchPress', 'barbellRow']
export const WORKOUT_B: ExerciseName[] = ['squat', 'overheadPress', 'deadlift']

export const DEFAULT_WEIGHTS: Record<ExerciseName, number> = {
  squat:         29.5,
  benchPress:    29.5,
  barbellRow:    29.5,
  overheadPress: 29.5,
  deadlift:      39.5,
}

export const DEFAULT_STATE: AppState = {
  weights: { ...DEFAULT_WEIGHTS },
  nextWorkout: 'A',
  failStreak: { squat: 0, benchPress: 0, barbellRow: 0, overheadPress: 0, deadlift: 0 },
  session: null,
  history: [],
  bodyWeights: [],
  customExercises: [],
  nextCustomId: 1,
}

export const REST_SECONDS = 90
export const STANDARD_REPS = 5
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
export const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
