import type { Dispatch } from 'react';
import CategoryIcon from '../components/CategoryIcon';
import IngredientPicker from '../components/IngredientPicker';
import QuantityField from '../components/QuantityField';
import { labelOf } from '../data/categories';
import { formatQuantity } from '../data/units';
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
        What to pick up. <strong>Stock</strong> moves an item straight into the fridge, where the
        reels can draw it.
      </p>

      <form
        className={styles.addRow}
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: 'grocery/add' });
        }}
      >
        <div className={styles.line}>
          <IngredientPicker
            target="grocery"
            state={state}
            dispatch={dispatch}
            value={state.draftGroc}
            onSelect={(value) => dispatch({ type: 'grocery/select', value })}
            placeholder="Choose an ingredient…"
          />
        </div>

        <div className={styles.line}>
          <QuantityField
            quantity={state.draftGrocQty}
            unit={state.draftGrocUnit}
            onQuantity={(value) => dispatch({ type: 'grocery/draftQty', value })}
            onUnit={(unit) => dispatch({ type: 'grocery/draftUnit', unit })}
          />
          <button type="submit" className={styles.add} disabled={!state.draftGroc}>
            Add
          </button>
        </div>
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
            <span className={styles.mark} aria-label={labelOf(item.category)}>
              <CategoryIcon category={item.category} size={16} />
            </span>
            <span className={styles.body}>
              <span className={styles.name}>{item.name}</span>
              <span className={styles.qty}>{formatQuantity(item.qty, item.unit)}</span>
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
