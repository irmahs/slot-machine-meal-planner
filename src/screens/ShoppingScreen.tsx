import type { Dispatch } from 'react';
import type { Action, PlannerState } from '../state/planner';
import styles from './ShoppingScreen.module.css';

interface ShoppingScreenProps {
  state: PlannerState;
  dispatch: Dispatch<Action>;
}

export default function ShoppingScreen({ state, dispatch }: ShoppingScreenProps) {
  return (
    <div className={styles.screen}>
      <p className={styles.intro}>
        Pulled from dishes you said yes to, minus whatever’s already in the fridge. Add anything else
        yourself.
      </p>

      <form
        className={styles.addRow}
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: 'grocery/add' });
        }}
      >
        <input
          className={styles.input}
          value={state.draftGroc}
          placeholder="Add to the list…"
          aria-label="Shopping list item"
          onChange={(e) => dispatch({ type: 'grocery/draft', value: e.target.value })}
        />
        <button type="submit" className={styles.add}>
          Add
        </button>
      </form>

      {state.grocery.length === 0 && <p className={styles.empty}>Nothing to buy. The fridge has it covered.</p>}

      {state.grocery.map((item) => (
        <div key={item.name} className={styles.row} data-got={item.acquired}>
          <button
            type="button"
            className={styles.toggle}
            aria-pressed={item.acquired}
            onClick={() => dispatch({ type: 'grocery/toggle', name: item.name })}
          >
            <span className={styles.box} aria-hidden="true">
              {item.acquired ? '✓' : ''}
            </span>
            <span className={styles.body}>
              <span className={styles.name}>{item.name}</span>
              <span className={styles.qty}>×{item.qty}</span>
            </span>
          </button>
          <button
            type="button"
            className={styles.stock}
            aria-label={`Move ${item.name} into the fridge`}
            onClick={() => dispatch({ type: 'grocery/stock', name: item.name })}
          >
            Stock
          </button>
          <button
            type="button"
            className={styles.remove}
            aria-label={`Remove ${item.name}`}
            onClick={() => dispatch({ type: 'grocery/remove', name: item.name })}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
