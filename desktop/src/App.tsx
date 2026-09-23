import { useEffect } from 'react';
import { useSpinSupper, type Screen } from './useSpinSupper';
import { Draw } from './screens/Draw';
import { Pantry } from './screens/Pantry';
import { AddIngredient } from './screens/AddIngredient';
import { Cooked } from './screens/Cooked';
import { ShoppingList } from './screens/ShoppingList';
import { CookingMethods } from './screens/CookingMethods';
import { ReelRules } from './screens/ReelRules';

const TITLES: Record<Screen, string> = {
  spin: 'Tonight', pantry: 'The pantry', add: 'Add an ingredient', plan: 'What you cooked',
  list: 'Shopping list', methods: 'Cooking methods', setup: 'Reel rules',
};

export function App() {
  const s = useSpinSupper();
  const { screen, spin } = s;

  // Space draws on the Draw screen, unless focus is in a control that owns the key.
  useEffect(() => {
    if (screen !== 'spin') return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.code !== 'Space' || !el) return;
      if (/^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(el.tagName) || el.getAttribute('role') === 'button') return;
      e.preventDefault();
      spin();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, spin]);

  const onCount = s.methods.filter(m => m.on).length;
  const toBuy = s.grocery.filter(g => !g.got).length;
  const expiring = s.pantry.filter(p => p.days <= 3).sort((a, b) => a.days - b.days);

  const kickers: Record<Screen, string> = {
    spin: 'Draw a dinner', pantry: s.pantry.length + ' items', add: 'Onto the reels', plan: 'Last seven days',
    list: 'Built for you', methods: onCount + ' in rotation', setup: 'Constraints',
  };
  const nav: [Screen, string, number | ''][] = [
    ['spin', 'Draw', ''], ['pantry', 'Pantry', s.pantry.length], ['add', 'Add ingredient', ''],
    ['plan', 'Cooked', s.plan.length], ['list', 'Shopping list', toBuy || ''],
    ['methods', 'Cooking methods', onCount], ['setup', 'Reel rules', ''],
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__title">Spin Supper</div>
          <div className="sidebar__sub">{s.pantry.length} in the pantry</div>
        </div>
        <nav className="stack" style={{ gap: 6 }} aria-label="Main">
          {nav.map(([key, label, count]) => (
            <button key={key} type="button" className="nav" aria-current={screen === key ? 'page' : undefined} onClick={() => s.setScreen(key)}>
              <span className="nav__pip" />
              <span className="nav__label">{label}</span>
              <span className="nav__count">{count}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar__foot">The reels favour whatever is closest to going off.</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar__kicker">{kickers[screen]}</div>
            <h1 className="topbar__title">{TITLES[screen]}</h1>
          </div>
          <button type="button" className="soon-pill" onClick={() => s.setScreen('pantry')}>
            {expiring.length} going off soon
          </button>
        </header>

        {screen === 'spin' && <Draw s={s} expiring={expiring} />}
        {screen === 'pantry' && <Pantry s={s} />}
        {screen === 'add' && <AddIngredient s={s} />}
        {screen === 'plan' && <Cooked s={s} />}
        {screen === 'list' && <ShoppingList s={s} />}
        {screen === 'methods' && <CookingMethods s={s} />}
        {screen === 'setup' && <ReelRules s={s} />}
      </main>
    </div>
  );
}
