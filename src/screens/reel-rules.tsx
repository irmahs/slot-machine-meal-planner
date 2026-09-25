import type { Dispatch } from "react";

import { Switch } from "../components/switch";
import type { Action, PlannerState } from "../state/planner";

interface Props {
  state: PlannerState;
  dispatch: Dispatch<Action>;
}

/** How long a dish stays off the reels once cooked. Days. */
const REPEAT_OPTIONS = [3, 5, 7, 14];

export function ReelRules({ state, dispatch }: Props) {
  return (
    <div className="rules">
      <div className="rcard">
        <div className="kicker">What stays off the reels</div>
        <div className="chip-row">
          {state.vocab.dietRules.map((rule) => (
            <button
              key={rule.code}
              type="button"
              className="diet-chip"
              aria-pressed={state.diets.includes(rule.code)}
              onClick={() =>
                dispatch({ code: rule.code, type: "rules/toggleDiet" })
              }
            >
              {rule.label}
            </button>
          ))}
        </div>
        <p className="body-sm">
          Each rule is a row in meal_planner_diet_rules saying what it keeps
          off, read against each ingredient’s kind — so a rule works on anything
          you add, and a new one is a new row.
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
              onClick={() => dispatch({ days: d, type: "rules/repeatDays" })}
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
        onClick={() => dispatch({ type: "rules/toggleWeighting" })}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="weight-card__title">Weight the reels by expiry</span>
          <span className="weight-card__body">
            Anything with two days left comes up about four times as often.
          </span>
        </span>
        <Switch on={state.weighting} large />
      </button>

      <p className="footnote">
        Rules apply to the next draw. A held column is never overridden.
      </p>
    </div>
  );
}
