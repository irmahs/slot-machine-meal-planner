import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import SignIn from './components/SignIn';
import { CATEGORIES, labelOfCategory } from './data/reference';
import { FEATURES } from './features';
import { SETTLE_MS, canSpin, daysLeft, planSpin, reelsFrom } from './engine/reel';
import { useRemoteSync } from './lib/useRemoteSync';
import { AddIngredient } from './screens/AddIngredient';
import { Cooked } from './screens/Cooked';
import { CookingMethods } from './screens/CookingMethods';
import { Draw } from './screens/Draw';
import { Pantry } from './screens/Pantry';
import { ReelRules } from './screens/ReelRules';
import { ShoppingList } from './screens/ShoppingList';
import { createInitialState, methodsOn, plannerReducer, type Screen } from './state/planner';

const TITLES: Record<Screen, string> = {
  spin: 'Tonight',
  pantry: 'The pantry',
  add: 'Add an ingredient',
  plan: 'What you cooked',
  list: 'Shopping list',
  methods: 'Cooking methods',
  setup: 'Reel rules',
};

export default function App() {
  const [state, dispatch] = useReducer(plannerReducer, undefined, createInitialState);
  const { phase, email, guest, saveFailed, signOut, startGuest } = useRemoteSync(state, dispatch);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const reels = useMemo(
    () => reelsFrom(state.pantry, state.catalogue),
    [state.pantry, state.catalogue],
  );
  const ready = canSpin(reels);

  const spin = useCallback(() => {
    if (state.spinning || !ready) return;
    const plan = planSpin(state.idx, state.locks, reels, {
      catalogue: state.catalogue,
      diets: state.diets,
      weighting: state.weighting,
    });
    dispatch({ type: 'spin/start', plan });
    // The method is drawn with the dish, from whatever is in rotation.
    const rotation = methodsOn(state);
    const method = rotation.length ? rotation[Math.floor(Math.random() * rotation.length)].code : null;
    timers.current.push(
      window.setTimeout(() => dispatch({ type: 'spin/settle', target: plan.target, method }), SETTLE_MS),
    );
  }, [state, reels, ready]);

  // Space draws, unless focus is in a control that owns the key.
  useEffect(() => {
    if (state.screen !== 'spin') return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.code !== 'Space' || !el) return;
      if (/^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(el.tagName) || el.getAttribute('role') === 'button') return;
      e.preventDefault();
      spin();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.screen, spin]);

  if (phase === 'signed-out') return <SignIn onGuest={startGuest} />;
  if (phase === 'booting') return <div className="shell" />;

  const rotation = methodsOn(state).length;
  const toBuy = state.grocery.filter((g) => !g.acquired).length;
  const expiring = state.pantry.filter((p) => daysLeft(p) <= 3).length;

  const kickers: Record<Screen, string> = {
    spin: 'Draw a dinner',
    pantry: `${state.pantry.length} stocked`,
    add: 'Onto the reels',
    plan: 'Last seven days',
    list: 'Built for you',
    methods: `${rotation} in rotation`,
    setup: 'Constraints',
  };

  const nav: Array<[Screen, string, number | '']> = [
    ['spin', 'Draw', ''],
    ['pantry', 'Pantry', state.pantry.length],
    ['add', 'Add ingredient', ''],
    ...(FEATURES.history ? ([['plan', 'Cooked', state.plan.length]] as Array<[Screen, string, number | '']>) : []),
    ['list', 'Shopping list', toBuy || ''],
    ['methods', 'Cooking methods', rotation],
    ['setup', 'Reel rules', ''],
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__title">Spin Supper</div>
          <div className="sidebar__sub">{state.pantry.length} in the pantry</div>
        </div>
        <nav className="stack" style={{ gap: 6 }} aria-label="Main">
          {nav.map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              className="nav"
              aria-current={state.screen === key ? 'page' : undefined}
              onClick={() => dispatch({ type: 'screen/go', screen: key })}
            >
              <span className="nav__pip" />
              <span className="nav__label">{label}</span>
              <span className="nav__count">{count}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar__foot">
          {saveFailed
            ? 'Not saved — check your connection.'
            : guest
              ? 'Just looking. This pantry goes when the tab closes.'
              : 'The reels favour whatever is closest to going off.'}
          <br />
          <button type="button" className="nav" style={{ padding: '8px 0', marginTop: 10 }} onClick={signOut}>
            <span className="nav__label">{guest ? 'Sign in' : (email ?? 'Sign out')}</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar__kicker">{kickers[state.screen]}</div>
            <h1 className="topbar__title">{TITLES[state.screen]}</h1>
          </div>
          {!ready ? (
            <button
              type="button"
              className="soon-pill"
              onClick={() => dispatch({ type: 'screen/go', screen: 'pantry' })}
            >
              {reels.filter((r) => !r.length).length === CATEGORIES.length
                ? 'Nothing stocked'
                : `No ${labelOfCategory(
                    CATEGORIES[reels.findIndex((r) => !r.length)].code,
                  ).toLowerCase()}`}
            </button>
          ) : (
            <button
              type="button"
              className="soon-pill"
              onClick={() => dispatch({ type: 'screen/go', screen: 'pantry' })}
            >
              {expiring} going off soon
            </button>
          )}
        </header>

        {state.screen === 'spin' && <Draw state={state} dispatch={dispatch} onSpin={spin} />}
        {state.screen === 'pantry' && <Pantry state={state} dispatch={dispatch} />}
        {state.screen === 'add' && <AddIngredient state={state} dispatch={dispatch} />}
        {state.screen === 'plan' && FEATURES.history && <Cooked state={state} />}
        {state.screen === 'list' && <ShoppingList state={state} dispatch={dispatch} />}
        {state.screen === 'methods' && <CookingMethods state={state} dispatch={dispatch} />}
        {state.screen === 'setup' && <ReelRules state={state} dispatch={dispatch} />}
      </main>
    </div>
  );
}
