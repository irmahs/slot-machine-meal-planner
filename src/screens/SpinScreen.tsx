import { useMemo, type Dispatch } from 'react';
import CategoryIcon from '../components/CategoryIcon';
import { CookIcons, CookTrack } from '../components/CookLoader';
import Reel from '../components/Reel';
import { CATEGORIES, labelOf, type CategoryCode } from '../data/categories';
import { canSpin, daysLeft, dishName, emptyReels, pantryOf, reelsFrom } from '../engine/reel';
import type { Action, PlannerState } from '../state/planner';
import styles from './SpinScreen.module.css';

interface SpinScreenProps {
  state: PlannerState;
  dispatch: Dispatch<Action>;
  onSpin: () => void;
}

function listOf(labels: string[]): string {
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

export default function SpinScreen({ state, dispatch, onSpin }: SpinScreenProps) {
  const reels = useMemo(() => reelsFrom(state.pantry), [state.pantry]);
  const ready = canSpin(reels);
  const settled = state.picked !== null && !state.spinning;
  const weekday = new Date().toLocaleDateString('en-GB', { weekday: 'long' });

  const missing = emptyReels(reels).map(labelOf);
  const hint = !ready
    ? `Add ${listOf(missing.map((m) => m.toLowerCase()))} to the fridge to draw.`
    : state.spinning
      ? 'Turning over…'
      : settled
        ? 'Tap a column to keep it.'
        : 'Tap to draw three.';

  return (
    <div className={styles.screen}>
      <div className={styles.day}>
        <div className={styles.weekday}>{weekday}</div>
        <h2 className={styles.dayTitle}>what the basket holds</h2>
        <div className={styles.rule} />
      </div>

      <div className={styles.reels}>
        <div className={styles.payline} />
        {reels.map((items, k) => (
          <Reel
            key={CATEGORIES[k].code}
            items={items}
            label={CATEGORIES[k].label}
            offset={state.idx[k]}
            duration={state.dur[k]}
            locked={state.locks[k]}
            onToggleLock={() => dispatch({ type: 'reel/toggleLock', reel: k })}
          />
        ))}
      </div>

      <div className={styles.draw}>
        <button
          type="button"
          className={styles.drawButton}
          onClick={onSpin}
          disabled={state.spinning || !ready}
        >
          Draw three
        </button>
        <p className={styles.hint} aria-live="polite">
          {hint}
        </p>
      </div>

      {state.picked && settled ? (
        <div className={styles.recipe}>
          {/* Three marks, one per reel — the dish has no photograph to show. */}
          <div className={styles.icons} role="img" aria-label="Protein, green and grain">
            {CATEGORIES.map((category, k) =>
              state.picked?.[k] ? (
                <span key={category.code} className={styles.icon} data-reel={category.code}>
                  <CategoryIcon category={category.code as CategoryCode} size={26} />
                </span>
              ) : null,
            )}
          </div>
          <div className={styles.kicker}>This evening</div>
          <h2 className={styles.dish}>{dishName(state.picked)}</h2>
          <div className={styles.tags}>
            {state.picked.map((name) => {
              if (!name) return null;
              const stocked = pantryOf(state.pantry, name);
              const urgent = stocked !== undefined && daysLeft(stocked) <= 3;
              return (
                <span key={name} className={styles.tag} data-state={urgent ? 'soon' : 'stocked'}>
                  {urgent ? `${name} · use it up` : name}
                </span>
              );
            })}
          </div>
          <button type="button" className={styles.commit} onClick={() => dispatch({ type: 'dish/cook' })}>
            Into the pot
          </button>
        </div>
      ) : (
        <div className={styles.recipe}>
          <div className={styles.waiting}>
            <CookIcons />
            <div className={styles.question}>what will we be cooking tonight?</div>
            <CookTrack />
          </div>
        </div>
      )}
    </div>
  );
}
