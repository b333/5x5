'use client'

import styles from '../workout.module.css'
import type { HistoryEntry, ExerciseName, BodyWeightEntry, CardioEntry } from '../lib/types'
import { EXERCISES, STANDARD_REPS } from '../lib/constants'
import { formatDuration } from '../lib/utils'

const ALL_EXERCISES: ExerciseName[] = ['squat', 'benchPress', 'barbellRow', 'overheadPress', 'deadlift']

interface Session {
  weight: number
  success: boolean
}

interface Props {
  history: HistoryEntry[]
  weights: Record<ExerciseName, number>
  bodyWeights: BodyWeightEntry[]
  cardioSessions: CardioEntry[]
}

export function ProgressView({ history, weights, bodyWeights, cardioSessions }: Props) {
  let totalVolume = 0
  for (const entry of history) {
    for (const ex of entry.exercises) totalVolume += ex.weight * STANDARD_REPS * ex.completed
    for (const ex of entry.extras ?? []) if (ex.weight !== 'bw') totalVolume += ex.weight * ex.reps * ex.completed
  }

  const sortedBW = [...bodyWeights].sort((a, b) => a.date.localeCompare(b.date))
  const bwSessions: Session[] = sortedBW.map(e => ({ weight: e.kg, success: true }))
  const currentBW = sortedBW.length ? sortedBW[sortedBW.length - 1].kg : null
  const bwChange = sortedBW.length > 1 ? currentBW! - sortedBW[0].kg : null

  const sortedCardio = [...cardioSessions].sort((a, b) => a.date.localeCompare(b.date))
  const cardioDurationSessions: Session[] = sortedCardio.map(e => ({ weight: e.duration, success: true }))
  const totalCardioMinutes = sortedCardio.reduce((sum, e) => sum + e.duration, 0)
  const totalCardioDistance = sortedCardio.reduce((sum, e) => sum + (e.distanceKm ?? 0), 0)

  return (
    <main className={styles.main}>
      {totalVolume > 0 && (
        <div className={styles.totalVolumeCard}>
          <span className={styles.totalVolumeLabel}>Total Weight Lifted</span>
          <span className={styles.totalVolumeValue}>
            {Math.round(totalVolume).toLocaleString()}<span className={styles.weightUnit}>kg</span>
          </span>
          {totalVolume >= 1000 && (
            <span className={styles.totalVolumeSub}>≈ {(totalVolume / 1000).toFixed(1)} tonnes</span>
          )}
        </div>
      )}
      {currentBW !== null && (
        <div className={styles.progressCard} style={{ marginBottom: 16 }}>
          <div className={styles.progressHeader}>
            <span className={styles.progressExName}>Body Weight</span>
            <span className={styles.progressCurrentWeight}>
              {currentBW}<span className={styles.weightUnit}>kg</span>
            </span>
          </div>
          <div className={styles.progressStats}>
            <div className={styles.progressStat}>
              <span className={styles.progressStatValue}>{bwSessions.length}</span>
              <span className={styles.progressStatLabel}>entries</span>
            </div>
            <div className={styles.progressStat}>
              <span className={styles.progressStatValue}
                style={{ color: bwChange !== null && bwChange !== 0 ? (bwChange > 0 ? 'var(--success)' : 'var(--danger)') : undefined }}
              >{bwChange !== null ? `${bwChange > 0 ? '+' : ''}${bwChange.toFixed(1)}kg` : '—'}</span>
              <span className={styles.progressStatLabel}>change</span>
            </div>
          </div>
          {bwSessions.length > 1 && <Sparkline sessions={bwSessions} />}
        </div>
      )}
      {sortedCardio.length > 0 && (
        <div className={styles.progressCard} style={{ marginBottom: 16 }}>
          <div className={styles.progressHeader}>
            <span className={styles.progressExName}>Cardio</span>
            <span className={styles.progressCurrentWeight}>
              {formatDuration(totalCardioMinutes * 60)}
            </span>
          </div>
          <div className={styles.progressStats}>
            <div className={styles.progressStat}>
              <span className={styles.progressStatValue}>{sortedCardio.length}</span>
              <span className={styles.progressStatLabel}>sessions</span>
            </div>
            <div className={styles.progressStat}>
              <span className={styles.progressStatValue}>{totalCardioDistance > 0 ? `${totalCardioDistance.toFixed(1)}km` : '—'}</span>
              <span className={styles.progressStatLabel}>distance</span>
            </div>
          </div>
          {cardioDurationSessions.length > 1 && <Sparkline sessions={cardioDurationSessions} />}
        </div>
      )}
      <div className={styles.progressList}>
        {ALL_EXERCISES.map(name => {
          const def = EXERCISES[name]
          const currentWeight = weights[name]

          // Collect sessions oldest-first
          const sessions: Session[] = []
          for (let i = history.length - 1; i >= 0; i--) {
            const ex = history[i].exercises.find(e => e.name === name)
            if (ex) sessions.push({ weight: ex.weight, success: ex.completed === ex.total })
          }

          const pb = sessions.length ? Math.max(...sessions.map(s => s.weight)) : currentWeight
          const successCount = sessions.filter(s => s.success).length
          const successRate = sessions.length ? Math.round((successCount / sessions.length) * 100) : null

          return (
            <div key={name} className={styles.progressCard}>
              <div className={styles.progressHeader}>
                <span className={styles.progressExName}>{def.label}</span>
                <span className={styles.progressCurrentWeight}>
                  {currentWeight}<span className={styles.weightUnit}>kg</span>
                </span>
              </div>

              {sessions.length > 0 && (
                <div className={styles.progressStats}>
                  <div className={styles.progressStat}>
                    <span className={styles.progressStatValue}>{sessions.length}</span>
                    <span className={styles.progressStatLabel}>sessions</span>
                  </div>
                  <div className={styles.progressStat}>
                    <span className={styles.progressStatValue}>{pb}kg</span>
                    <span className={styles.progressStatLabel}>best</span>
                  </div>
                  <div className={styles.progressStat}>
                    <span className={styles.progressStatValue}
                      style={{ color: successRate !== null && successRate >= 80 ? 'var(--success)' : successRate !== null && successRate < 50 ? 'var(--danger)' : undefined }}
                    >{successRate ?? '—'}%</span>
                    <span className={styles.progressStatLabel}>success</span>
                  </div>
                </div>
              )}

              {sessions.length > 0 && <Sparkline sessions={sessions} />}

              {sessions.length === 0 && (
                <span className={styles.progressEmpty}>No sessions logged yet</span>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}

function Sparkline({ sessions }: { sessions: Session[] }) {
  const VW = 400, VH = 56
  const PAD_X = 6, PAD_Y = 8
  const n = sessions.length

  const weights = sessions.map(s => s.weight)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min

  const toX = (i: number) => n <= 1 ? VW / 2 : PAD_X + (i / (n - 1)) * (VW - PAD_X * 2)
  const toY = (w: number) => range > 0
    ? VH - PAD_Y - ((w - min) / range) * (VH - PAD_Y * 2)
    : VH / 2

  const pts = sessions.map((s, i) => ({ x: toX(i), y: toY(s.weight), success: s.success }))
  const lineStr = pts.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="56" style={{ display: 'block' }}>
      {n > 1 && (
        <polyline
          points={lineStr}
          fill="none"
          stroke="#f97316"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.6"
        />
      )}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={n === 1 ? 5 : 4} fill={p.success ? '#22c55e' : '#ef4444'} />
      ))}
    </svg>
  )
}
