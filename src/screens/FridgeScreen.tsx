import type { Dispatch } from 'react';
import CategoryIcon from '../components/CategoryIcon';
import IngredientPicker from '../components/IngredientPicker';
import QuantityField from '../components/QuantityField';
import { labelOf } from '../data/categories';
import type { PantryItem } from '../data/model';
import { formatQuantity } from '../data/units';
import { daysLeft } from '../engine/reel';
import { todayISO } from '../lib/dates';
import type { Action, PlannerState } from '../state/planner';
import styles from './FridgeScreen.module.css';

interface FridgeScreenProps {
  state: PlannerState;
  dispatch: Dispatch<Action>;
}

type Window = 'soon' | 'fresh' | 'stocked';

function windowOf(item: PantryItem): Window {
  const left = daysLeft(item);
  if (left <= 3) return 'soon';
  if (left <= 10) return 'fresh';
  return 'stocked';
}

function subFor(item: PantryItem): string {
  const count = formatQuantity(item.qty, item.unit);
  const left = daysLeft(item);
  if (left > 30) return `${count} · keeps for months`;
  if (left < 0) return `${count} · past its date`;
  if (left === 0) return `${count} · use today`;
  if (left === 1) return `${count} · use tomorrow`;
  return `${count} · use within ${left} days`;
}

const TAGS: Record<Window, string> = { soon: 'Use it', fresh: 'Fresh', stocked: 'Stocked' };

export default function FridgeScreen({ state, dispatch }: FridgeScreenProps) {
  const rows = [...state.pantry].sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));

  return (
    <div className={styles.screen}>
      <form
        className={styles.addRow}
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: 'pantry/add' });
        }}
      >
        <div className={styles.line}>
          <IngredientPicker
            target="pantry"
            state={state}
            dispatch={dispatch}
            value={state.draftName}
            onSelect={(value) => dispatch({ type: 'pantry/select', value })}
            placeholder="Choose an ingredient…"
          />
        </div>

        <div className={styles.line}>
          <QuantityField
            quantity={state.draftQty}
            unit={state.draftUnit}
            onQuantity={(value) => dispatch({ type: 'pantry/draftQty', value })}
            onUnit={(unit) => dispatch({ type: 'pantry/draftUnit', unit })}
          />

          <label className={styles.expiry}>
            <span className={styles.expiryLabel}>Use by</span>
            <input
              className={styles.date}
              type="date"
              min={todayISO()}
              value={state.draftExpiry}
              aria-label="Use by date"
              onChange={(e) => dispatch({ type: 'pantry/draftExpiry', value: e.target.value })}
            />
          </label>
        </div>

        <div className={styles.line}>
          <button type="submit" className={styles.add} disabled={!state.draftName}>
            Add to the fridge
          </button>
        </div>
      </form>

      {state.catalogue.length === 0 && (
        <p className={styles.empty}>
          No ingredients yet. Tap <strong>New</strong> to name one and say which reel it spins on.
        </p>
      )}

      {state.catalogue.length > 0 && rows.length === 0 && (
        <p className={styles.empty}>Nothing in the fridge — the reels have nothing to draw from.</p>
      )}

      {rows.map((item) => {
        const window = windowOf(item);
        return (
          <div key={item.name} className={styles.row} data-window={window} data-soon={window === 'soon'}>
            <span className={styles.mark} title={labelOf(item.category)} aria-label={labelOf(item.category)}>
              <CategoryIcon category={item.category} size={18} />
            </span>
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
