import type { Screen } from '../state/planner';
import styles from './Drawer.module.css';

const ITEMS: Array<[Screen, string]> = [
  ['spin', 'Spin'],
  ['pantry', 'Fridge'],
  ['plan', 'Cooked'],
  ['list', 'Shopping list'],
  ['setup', 'Reel rules'],
];

interface DrawerProps {
  open: boolean;
  screen: Screen;
  pantryCount: number;
  email: string | null;
  saveFailed: boolean;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
  onSignOut: () => void;
}

export default function Drawer({
  open,
  screen,
  pantryCount,
  email,
  saveFailed,
  onClose,
  onNavigate,
  onSignOut,
}: DrawerProps) {
  return (
    <>
      <button
        type="button"
        className={styles.scrim}
        data-open={open}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        aria-label="Close menu"
      />
      <nav className={styles.drawer} data-open={open} aria-label="Screens" aria-hidden={!open}>
        <div className={styles.header}>
          <div className={styles.brand}>Spin Supper</div>
          <div className={styles.count}>{pantryCount} items in the fridge</div>
        </div>
        {ITEMS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={styles.item}
            aria-current={screen === key ? 'page' : undefined}
            tabIndex={open ? 0 : -1}
            onClick={() => onNavigate(key)}
          >
            <span className={styles.pip} />
            {label}
          </button>
        ))}
        <div className={styles.spacer} />
        {saveFailed && <div className={styles.warning}>Not saved — check your connection.</div>}
        {email && (
          <div className={styles.account}>
            <span className={styles.email}>{email}</span>
            <button type="button" className={styles.signOut} tabIndex={open ? 0 : -1} onClick={onSignOut}>
              Sign out
            </button>
          </div>
        )}
        <div className={styles.note}>Reels favour what’s closest to going off.</div>
      </nav>
    </>
  );
}
