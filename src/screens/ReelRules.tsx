import type { Dispatch } from 'react';
import { Switch } from '../components/Switch';
import { DIETS, REPEAT_OPTIONS, type DietRule } from '../data/reference';
import type { Action, PlannerState } from '../state/planner';

interface Props {
  state: PlannerState;
  dispatch: Dispatch<Action>;
}

export function ReelRules({ state, dispatch }: Props) {
  return (
    <div className="rules">
      <div className="rcard">
        <div className="kicker">What stays off the reels</div>
        <div className="chip-row">
          {DIETS.map((d) => (
            <button
              key={d}
              type="button"
              className="diet-chip"
              aria-pressed={state.diets.includes(d)}
              onClick={() => dispatch({ type: 'rules/toggleDiet', diet: d as DietRule })}
            >
              {d}
            </button>
          ))}
        </div>
        <p className="body-sm">
          Read off each ingredient’s kind, so Pescatarian keeps fish and seafood and drops the rest,
          and Gluten-free goes by the answer you gave when you added the starch.
        </p>
      </div>

      <div className="rcard" style={{ gap: 16 }}>
        <div className="repeat-head">
          <div className="kicker">Don’t repeat a dish for</div>
          <div className="repeat-val">{state.repeatDays} days</div>
        </div>
        <div className="seg">
          {REPEAT_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={state.repeatDays === d}
              onClick={() => dispatch({ type: 'rules/repeatDays', days: d })}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="weight-card"
        role="switch"
        aria-checked={state.weighting}
        onClick={() => dispatch({ type: 'rules/toggleWeighting' })}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="weight-card__title">Weight the reels by expiry</span>
          <span className="weight-card__body">
            Anything with two days left comes up about four times as often.
          </span>
        </span>
        <Switch on={state.weighting} large />
      </button>

      <p className="footnote">Rules apply to the next draw. A held column is never overridden.</p>
    </div>
  );
}
