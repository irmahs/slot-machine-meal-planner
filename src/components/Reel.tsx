import type { PantryItem } from '../data/model';
import { CELL_HEIGHT, STRIP_REPEATS, daysLeft } from '../engine/reel';
import styles from './Reel.module.css';

interface ReelProps {
  items: PantryItem[];
  label: string;
  offset: number;
  duration: string;
  locked: boolean;
  onToggleLock: () => void;
}

/** Everything on a reel is in the fridge, so the note under a name is only ever about time. */
function noteFor(item: PantryItem): string {
  const left = daysLeft(item);
  if (left > 30) return 'stocked';
  if (left < 0) return 'overdue';
  if (left === 0) return 'today';
  if (left === 1) return '1d left';
  return `${left}d left`;
}

export default function Reel({ items, label, offset, duration, locked, onToggleLock }: ReelProps) {
  const empty = items.length === 0;
  const strip = empty ? [] : Array.from({ length: STRIP_REPEATS }, () => items).flat();

  return (
    <button
      type="button"
      className={styles.column}
      data-locked={locked}
      data-empty={empty}
      aria-pressed={locked}
      aria-label={
        empty ? `${label} reel, empty` : `${label} reel, ${locked ? 'held' : 'free'}`
      }
      disabled={empty}
      onClick={onToggleLock}
    >
      <div className={styles.fade} />
      {empty ? (
        <div className={styles.blank}>
          <div className={styles.name}>nothing yet</div>
          <div className={styles.note}>add {label.toLowerCase()}</div>
        </div>
      ) : (
        <div
          className={styles.strip}
          style={{ transform: `translateY(${-offset * CELL_HEIGHT}px)`, transitionDuration: duration }}
        >
          {strip.map((item, i) => (
            <div className={styles.cell} key={`${item.name}-${i}`}>
              <div className={styles.name}>{item.name}</div>
              <div className={styles.note}>{noteFor(item)}</div>
            </div>
          ))}
        </div>
      )}
      <div className={styles.foot}>{locked ? 'held' : label}</div>
    </button>
  );
}
