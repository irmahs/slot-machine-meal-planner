import type { PlannerState } from '../state/planner';
import styles from './CookedScreen.module.css';

export default function CookedScreen({ state }: { state: PlannerState }) {
  const withoutRepeat = new Set(state.plan.map((entry) => entry.dish)).size;

  return (
    <div className={styles.screen}>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.number}>{state.plan.length}</div>
          <div className={styles.caption}>dishes spun this week</div>
        </div>
        <div className={styles.stat} data-tone="sage">
          <div className={styles.number}>{withoutRepeat}</div>
          <div className={styles.caption}>without a repeat</div>
        </div>
      </div>

      {state.plan.map((entry, i) => (
        <div key={`${entry.day}-${entry.dish}`} className={styles.row} data-latest={i === 0}>
          <div className={styles.badge} data-long={entry.day.length > 4}>
            {entry.day}
          </div>
          <div className={styles.body}>
            <div className={styles.dish}>{entry.dish}</div>
            <div className={styles.sub}>{entry.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
