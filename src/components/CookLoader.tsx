import { Carrot, ChefHat, CookingPot, Salad, Soup, UtensilsCrossed } from 'lucide-react';
import styles from './CookLoader.module.css';

const ICONS = [CookingPot, UtensilsCrossed, ChefHat, Carrot, Soup, Salad];

export function CookIcons() {
  return (
    <div className={styles.loader} aria-hidden="true">
      {ICONS.map((Icon, i) => (
        <Icon
          key={i}
          className={styles.icon}
          size={46}
          strokeWidth={2.75}
          style={{ animationDelay: `${i * 0.75}s` }}
        />
      ))}
    </div>
  );
}

export function CookTrack() {
  return (
    <div className={styles.track} aria-hidden="true">
      <div className={styles.bar} />
    </div>
  );
}
