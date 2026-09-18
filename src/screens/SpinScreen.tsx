import { ChefHat } from 'lucide-react';
import type { Dispatch } from 'react';
import { CookIcons, CookTrack } from '../components/CookLoader';
import Reel from '../components/Reel';
import { REELS, REEL_LABELS } from '../data/seed';
import { daysLeft, dishName, pantryOf, pickedNames } from '../engine/reel';
import type { Action, PlannerState } from '../state/planner';
import styles from './SpinScreen.module.css';

interface SpinScreenProps {
  state: PlannerState;
  dispatch: Dispatch<Action>;
  onSpin: () => void;
}

export default function SpinScreen({ state, dispatch, onSpin }: SpinScreenProps) {
  const settled = state.picked !== null && !state.spinning;
  const names = state.picked ? pickedNames(state.picked) : null;
  const weekday = new Date().toLocaleDateString('en-GB', { weekday: 'long' });

  const hint = state.spinning
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
        {REELS.map((items, k) => (
          <Reel
            key={REEL_LABELS[k]}
            items={items}
            label={REEL_LABELS[k]}
            pantry={state.pantry}
            offset={state.idx[k]}
            duration={state.dur[k]}
            locked={state.locks[k]}
            onToggleLock={() => dispatch({ type: 'reel/toggleLock', reel: k })}
          />
        ))}
      </div>

      <div className={styles.draw}>
        <button type="button" className={styles.drawButton} onClick={onSpin} disabled={state.spinning}>
          Draw three
        </button>
        <p className={styles.hint} aria-live="polite">
          {hint}
        </p>
      </div>

      {names && settled ? (
        <div className={styles.recipe}>
          {/* The recipe image slot — wire to a real image source when the product has one. */}
          <div className={styles.photo} role="img" aria-label="Dish photo to come">
            <ChefHat size={44} strokeWidth={2.75} />
          </div>
          <div className={styles.kicker}>This evening</div>
          <h2 className={styles.dish}>{dishName(names)}</h2>
          <div className={styles.tags}>
            {names.map((name) => {
              const stocked = pantryOf(state.pantry, name);
              const urgent = stocked !== undefined && daysLeft(stocked) <= 3;
              const stateName = !stocked ? 'missing' : urgent ? 'soon' : 'stocked';
              const label = !stocked ? `${name} · to buy` : urgent ? `${name} · use it up` : name;
              return (
                <span key={name} className={styles.tag} data-state={stateName}>
                  {label}
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
