import type { Dispatch } from 'react';
import type { PantryItem } from '../data/seed';
import type { Action, PlannerState } from '../state/planner';
import styles from './FridgeScreen.module.css';

interface FridgeScreenProps {
  state: PlannerState;
  dispatch: Dispatch<Action>;
}

type Window = 'soon' | 'fresh' | 'stocked';

function windowOf(item: PantryItem): Window {
  if (item.days <= 3) return 'soon';
  if (item.days <= 10) return 'fresh';
  return 'stocked';
}

function subFor(item: PantryItem): string {
  if (item.days > 30) return `${item.qty} · keeps for months`;
  if (item.days === 1) return `${item.qty} · use today`;
  return `${item.qty} · use within ${item.days} days`;
}

const TAGS: Record<Window, string> = { soon: 'Use it', fresh: 'Fresh', stocked: 'Stocked' };

export default function FridgeScreen({ state, dispatch }: FridgeScreenProps) {
  const rows = [...state.pantry].sort((a, b) => a.days - b.days);

  return (
    <div className={styles.screen}>
      <form
        className={styles.addRow}
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: 'pantry/add' });
        }}
      >
        <input
          className={styles.input}
          value={state.draftName}
          placeholder="Add an item…"
          aria-label="Item name"
          onChange={(e) => dispatch({ type: 'pantry/draftName', value: e.target.value })}
        />
        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.step}
            aria-label="One day fewer"
            onClick={() => dispatch({ type: 'pantry/stepDays', delta: -1 })}
          >
            −
          </button>
          <span className={styles.days}>{state.draftDays}d left</span>
          <button
            type="button"
            className={styles.step}
            aria-label="One day more"
            onClick={() => dispatch({ type: 'pantry/stepDays', delta: 1 })}
          >
            +
          </button>
        </div>
        <button type="submit" className={styles.add}>
          Add
        </button>
      </form>

      {rows.length === 0 && <p className={styles.empty}>Nothing in the fridge — the reels have little to go on.</p>}

      {rows.map((item) => {
        const window = windowOf(item);
        return (
          <div key={item.name} className={styles.row} data-window={window} data-soon={window === 'soon'}>
            <div className={styles.pip} />
            <div className={styles.body}>
              <div className={styles.name}>{item.name}</div>
              <div className={styles.sub}>{subFor(item)}</div>
            </div>
            <div className={styles.tag} data-window={window}>
              {TAGS[window]}
            </div>
            <button
              type="button"
              className={styles.remove}
              aria-label={`Remove ${item.name}`}
              onClick={() => dispatch({ type: 'pantry/remove', name: item.name })}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
