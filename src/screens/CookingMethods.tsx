import type { Dispatch } from 'react';
import { Switch } from '../components/Switch';
import { METHODS, type MethodCode } from '../data/reference';
import type { Action, PlannerState } from '../state/planner';

interface Props {
  state: PlannerState;
  dispatch: Dispatch<Action>;
}

/**
 * Methods are a fixed list because each one carries the participle its dish name
 * uses — "Air-fry" has to read as "Air-fried". Switching one off keeps it out of
 * the draw without losing that.
 */
export function CookingMethods({ state, dispatch }: Props) {
  const on = METHODS.filter((m) => !state.methodsOff.includes(m.code));

  return (
    <div className="page-narrow">
      <p className="intro">
        Each draw picks one of the methods switched on here, and the dish is named after it —
        {' '}<em>{on[0]?.phrase ?? 'Roasted'} Chicken Rice Bowl with charred broccoli</em>. Switch off
        anything you don’t feel like doing this week.
      </p>
      {on.length === 0 && (
        <p className="intro">
          Everything is off, so dishes will be named without a method.
        </p>
      )}
      <ul className="rows">
        {METHODS.map((m) => {
          const enabled = !state.methodsOff.includes(m.code);
          return (
            <li key={m.code} className={'lrow' + (enabled ? '' : ' lrow--done')}>
              <span className="lrow__main" style={{ cursor: 'default' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="lrow__name">{m.label}</span>
                  <span className="lrow__why">names a dish “{m.phrase} …”</span>
                </span>
              </span>
              <button
                type="button"
                className="method-toggle"
                role="switch"
                aria-checked={enabled}
                aria-label={m.label}
                onClick={() => dispatch({ type: 'method/toggle', code: m.code as MethodCode })}
              >
                {enabled ? 'On' : 'Off'}
                <Switch on={enabled} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
