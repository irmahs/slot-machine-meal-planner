import styles from './TopBar.module.css';

interface TopBarProps {
  kicker: string;
  title: string;
  onOpenDrawer: () => void;
}

export default function TopBar({ kicker, title, onOpenDrawer }: TopBarProps) {
  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <button type="button" className={styles.burger} onClick={onOpenDrawer} aria-label="Open menu">
          <span />
          <span />
          <span />
        </button>
        <div className={styles.heading}>
          <div className={styles.kicker}>{kicker}</div>
          <h1 className={styles.title}>{title}</h1>
        </div>
      </div>
    </header>
  );
}
