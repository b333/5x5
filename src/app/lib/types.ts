export type ExerciseName = 'squat' | 'benchPress' | 'barbellRow' | 'overheadPress' | 'deadlift'
export type WorkoutLabel = 'A' | 'B' | 'C'

export interface ExerciseDef {
  label: string
  sets: number
  increment: number
}

export interface CustomExerciseDef {
  id: string
  name: string
  sets: number
  reps: number
  defaultWeight: number
}

export interface ExtraExercise {
  defId: string
  name: string
  sets: boolean[]
  weight: number
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
  extras?: { name: string; weight: number; completed: number; total: number; reps: number }[]
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
