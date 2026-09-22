import type { Dispatch } from 'react';
import { CATEGORIES, type CategoryCode } from '../data/categories';
import type { Action, PickerTarget, PlannerState } from '../state/planner';
import styles from './IngredientPicker.module.css';

interface IngredientPickerProps {
  target: PickerTarget;
  state: PlannerState;
  dispatch: Dispatch<Action>;
  /** The chosen ingredient's name, or '' for nothing chosen yet. */
  value: string;
  onSelect: (name: string) => void;
  placeholder: string;
}

/**
 * Ingredients come from your own list, not from a dropdown baked into the app — so the choice is
 * a select over what you have named, and anything new is created here, with the category that
 * decides which reel it will spin on.
 */
export default function IngredientPicker({
  target,
  state,
  dispatch,
  value,
  onSelect,
  placeholder,
}: IngredientPickerProps) {
  const creating = state.newFor === target;

  if (creating) {
    return (
      <div className={styles.create}>
        <input
          className={styles.newName}
          value={state.newName}
          autoFocus
          placeholder="New ingredient…"
          aria-label="New ingredient name"
          onChange={(e) => dispatch({ type: 'ingredient/newName', value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              dispatch({ type: 'ingredient/create' });
            }
            if (e.key === 'Escape') dispatch({ type: 'ingredient/cancelNew' });
          }}
        />
        <span className={styles.selectWrap}>
          <select
            className={styles.category}
            value={state.newCategory}
            aria-label="Which reel it spins on"
            onChange={(e) =>
              dispatch({ type: 'ingredient/newCategory', category: e.target.value as CategoryCode })
            }
          >
            {CATEGORIES.map((category) => (
              <option key={category.code} value={category.code}>
                {category.label}
              </option>
            ))}
          </select>
        </span>
        <button
          type="button"
          className={styles.save}
          disabled={!state.newName.trim()}
          onClick={() => dispatch({ type: 'ingredient/create' })}
        >
          Save
        </button>
        <button
          type="button"
          className={styles.cancel}
          aria-label="Cancel new ingredient"
          onClick={() => dispatch({ type: 'ingredient/cancelNew' })}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <>
      <span className={styles.selectWrap}>
        <select
          className={styles.select}
          value={value}
          aria-label={placeholder}
          onChange={(e) => onSelect(e.target.value)}
        >
          <option value="">{placeholder}</option>
          {CATEGORIES.map((category) => {
            const items = state.catalogue.filter((i) => i.category === category.code);
            return items.length ? (
              <optgroup key={category.code} label={category.label}>
                {items.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
            ) : null;
          })}
        </select>
      </span>
      <button
        type="button"
        className={styles.new}
        onClick={() => dispatch({ type: 'ingredient/startNew', target })}
      >
        New
      </button>
    </>
  );
}
