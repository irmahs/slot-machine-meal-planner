import type { Dispatch } from 'react';
import type { DietRule } from '../engine/reel';
import type { Action, PlannerState, RepeatWindow } from '../state/planner';
import styles from './RulesScreen.module.css';

const DIETS: DietRule[] = ['Vegetarian', 'Pescatarian', 'No red meat', 'Gluten-free'];
const WINDOWS: RepeatWindow[] = [3, 5, 7, 14];

interface RulesScreenProps {
  state: PlannerState;
  dispatch: Dispatch<Action>;
}

export default function RulesScreen({ state, dispatch }: RulesScreenProps) {
  return (
    <div className={styles.screen}>
      <section>
        <h2 className={styles.kicker}>What stays off the reels</h2>
        <div className={styles.chips}>
          {DIETS.map((diet) => (
            <button
              key={diet}
              type="button"
              className={styles.chip}
              aria-pressed={state.diets.includes(diet)}
              onClick={() => dispatch({ type: 'rules/toggleDiet', diet })}
            >
              {diet}
            </button>
          ))}
        </div>
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
