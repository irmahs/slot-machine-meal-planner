import { useMemo, type Dispatch } from 'react';
import CategoryIcon from '../components/CategoryIcon';
import { CATEGORIES } from '../data/categories';
import { reelsFrom } from '../engine/reel';
import type { Action, PlannerState, RepeatWindow } from '../state/planner';
import styles from './RulesScreen.module.css';

const WINDOWS: RepeatWindow[] = [3, 5, 7, 14];

interface RulesScreenProps {
  state: PlannerState;
  dispatch: Dispatch<Action>;
}

export default function RulesScreen({ state, dispatch }: RulesScreenProps) {
  const reels = useMemo(() => reelsFrom(state.pantry), [state.pantry]);

  return (
    <div className={styles.screen}>
      <section>
        <h2 className={styles.kicker}>What the reels have to draw from</h2>
        <div className={styles.stock}>
          {CATEGORIES.map((category, k) => (
            <div key={category.code} className={styles.reel} data-empty={reels[k].length === 0}>
              <span className={styles.mark}>
                <CategoryIcon category={category.code} size={20} />
              </span>
              <span className={styles.reelCount}>{reels[k].length}</span>
              <span className={styles.reelLabel}>{category.label}</span>
            </div>
          ))}
        </div>
        <p className={styles.footnote}>
          A reel holds whatever in the fridge carries that category. An ingredient’s category is set
          once, when you create it, and every empty reel stops the draw.
        </p>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Don’t repeat a dish for</h2>
          <div className={styles.cardValue}>{state.repeatDays} days</div>
        </div>
        <div className={styles.segments}>
          {WINDOWS.map((days) => (
            <button
              key={days}
              type="button"
              className={styles.segment}
              aria-pressed={state.repeatDays === days}
              aria-label={`${days} days`}
              onClick={() => dispatch({ type: 'rules/repeatDays', days })}
            >
              {days}d
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        className={styles.weighting}
        aria-pressed={state.weighting}
        onClick={() => dispatch({ type: 'rules/toggleWeighting' })}
      >
        <span className={styles.weightingBody}>
          <span className={styles.weightingTitle}>Weight the reels by expiry</span>
          <span className={styles.weightingNote}>
            Anything with two days left spins up about four times as often.
          </span>
        </span>
        <span className={styles.switch} aria-hidden="true">
          <span className={styles.knob} />
        </span>
      </button>

      <p className={styles.footnote}>
        Constraints apply to the next pull. Locked reels are never overridden.
      </p>
    </div>
  );
}
