import styles from './TopBar.module.css';

interface TopBarProps {
  kicker: string;
  title: string;
  expiringCount: number;
  onOpenDrawer: () => void;
}

export default function TopBar({ kicker, title, expiringCount, onOpenDrawer }: TopBarProps) {
  return (
    <header className={styles.bar}>
      <button type="button" className={styles.burger} onClick={onOpenDrawer} aria-label="Open menu">
        <span />
        <span />
        <span />
      </button>
      <div className={styles.heading}>
        <div className={styles.kicker}>{kicker}</div>
        <h1 className={styles.title}>{title}</h1>
      </div>
      <div className={styles.expiring}>{expiringCount} soon</div>
    </header>
  );
}
