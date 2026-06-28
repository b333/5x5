import styles from '../workout.module.css'
import { formatTime } from '../lib/utils'

interface Props {
  timer: { remaining: number; total: number }
  onDismiss: () => void
  onAdjust: (delta: number) => void
}

export function RestTimer({ timer, onDismiss, onAdjust }: Props) {
  return (
    <div className={`${styles.timerWidget} ${timer.remaining === 0 ? styles.timerDone : ''}`}>
      <div className={styles.timerContent}>
        {timer.remaining === 0 ? (
          <span className={styles.timerReadyLabel}>Ready</span>
        ) : (
          <>
            <button className={styles.timerAdjBtn} onClick={() => onAdjust(-30)}>−30</button>
            <span className={styles.timerTime}>{formatTime(timer.remaining)}</span>
            <button className={styles.timerAdjBtn} onClick={() => onAdjust(30)}>+30</button>
          </>
        )}
        <button className={styles.timerDismiss} onClick={onDismiss}>✕</button>
      </div>
      <div className={styles.timerBar}>
        <div
          className={styles.timerFill}
          style={{ width: `${((timer.total - timer.remaining) / timer.total) * 100}%` }}
        />
      </div>
    </div>
  )
}
