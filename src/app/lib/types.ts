export type ExerciseName = 'squat' | 'benchPress' | 'barbellRow' | 'overheadPress' | 'deadlift'
export type WorkoutLabel = 'A' | 'B' | 'C'

export interface ExerciseDef {
  label: string
  sets: number
  increment: number
}

// A weight of 'bw' marks a bodyweight exercise (dips, pull-ups) with no plate load.
export type Weight = number | 'bw'

export interface CustomExerciseDef {
  id: string
  name: string
  sets: number
  reps: number
  defaultWeight: Weight
}

export interface ExtraExercise {
  defId: string
  name: string
  sets: boolean[]
  weight: Weight
  reps: number
}

export interface Session {
  workout: WorkoutLabel
  startedAt: string
  sets: Record<ExerciseName, boolean[]>
  extras: ExtraExercise[]
}

export interface HistoryEntry {
  date: string
  workout: WorkoutLabel
  exercises: { name: ExerciseName; weight: number; completed: number; total: number }[]
  extras?: { name: string; weight: Weight; completed: number; total: number; reps: number }[]
  duration?: number
}

export interface BodyWeightEntry {
  date: string
  kg: number
}

export interface AppState {
  weights: Record<ExerciseName, number>
  nextWorkout: WorkoutLabel
  failStreak: Record<ExerciseName, number>
  session: Session | null
  history: HistoryEntry[]
  bodyWeights: BodyWeightEntry[]
  customExercises: CustomExerciseDef[]
  nextCustomId: number
}
