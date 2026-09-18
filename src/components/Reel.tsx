import { CELL_HEIGHT, STRIP_REPEATS, daysLeft, pantryOf } from '../engine/reel';
import type { PantryItem, ReelItem } from '../data/seed';
import styles from './Reel.module.css';

interface ReelProps {
  items: ReelItem[];
  label: string;
  pantry: PantryItem[];
  offset: number;
  duration: string;
  locked: boolean;
  onToggleLock: () => void;
}

function noteFor(item: ReelItem, pantry: PantryItem[]): string {
  const stocked = pantryOf(pantry, item.name);
  if (!stocked) return 'need to buy';

  const left = daysLeft(stocked);
  if (left > 30) return 'stocked';
  if (left < 0) return 'overdue';
  if (left === 0) return 'today';
  return `${left}d left`;
}

export default function Reel({
  items,
  label,
  pantry,
  offset,
  duration,
  locked,
  onToggleLock,
}: ReelProps) {
  const strip = Array.from({ length: STRIP_REPEATS }, () => items).flat();

  return (
    <button
      type="button"
      className={styles.column}
      data-locked={locked}
      aria-pressed={locked}
      aria-label={`${label} reel, ${locked ? 'held' : 'free'}`}
      onClick={onToggleLock}
    >
      <div className={styles.fade} />
      <div
        className={styles.strip}
        style={{ transform: `translateY(${-offset * CELL_HEIGHT}px)`, transitionDuration: duration }}
      >
        {strip.map((item, i) => (
          <div className={styles.cell} key={`${item.name}-${i}`}>
            <div className={styles.name}>{item.name}</div>
            <div className={styles.note}>{noteFor(item, pantry)}</div>
          </div>
        ))}
      </div>
      <div className={styles.foot}>{locked ? 'held' : label}</div>
    </button>
  );
}
