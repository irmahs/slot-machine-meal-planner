import { useCallback, useEffect, useReducer, useRef } from 'react';
import styles from './App.module.css';
import Drawer from './components/Drawer';
import TopBar from './components/TopBar';
import SignIn from './components/SignIn';
import { SETTLE_MS, planSpin } from './engine/reel';
import { DESKTOP, useMediaQuery } from './lib/useMediaQuery';
import { useRemoteSync } from './lib/useRemoteSync';
import CookedScreen from './screens/CookedScreen';
import FridgeScreen from './screens/FridgeScreen';
import RulesScreen from './screens/RulesScreen';
import ShoppingScreen from './screens/ShoppingScreen';
import SpinScreen from './screens/SpinScreen';
import { createInitialState, plannerReducer, type Screen } from './state/planner';

const TITLES: Record<Screen, string> = {
  spin: 'Pull the reels',
  pantry: 'In the fridge',
  plan: 'What you cooked',
  list: 'Shopping list',
  setup: 'Reel rules',
};

export default function App() {
  const [state, dispatch] = useReducer(plannerReducer, undefined, createInitialState);
  const { phase, email, saveFailed, signOut } = useRemoteSync(state, dispatch);
  const docked = useMediaQuery(DESKTOP);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const spinning = state.spinning;
  const spin = useCallback(() => {
    if (spinning) return;
    const plan = planSpin(state.idx, state.locks, {
      pantry: state.pantry,
      diets: state.diets,
      weighting: state.weighting,
    });
    dispatch({ type: 'spin/start', plan });
    timers.current.push(
      window.setTimeout(() => dispatch({ type: 'spin/settle', targets: plan.targets }), SETTLE_MS),
    );
  }, [spinning, state.idx, state.locks, state.pantry, state.diets, state.weighting]);

  const expiringCount = state.pantry.filter((item) => item.days <= 3).length;
  const kickers: Record<Screen, string> = {
    spin: 'Tonight',
    pantry: `${state.pantry.length} items`,
    plan: 'Last seven days',
    list: 'Auto-built',
    setup: 'Constraints',
  };

  if (phase === 'signed-out') return <SignIn />;
  if (phase === 'booting') return <div className={styles.app} />;

  return (
    <div className={styles.app} data-screen={state.screen}>
      <TopBar
        kicker={kickers[state.screen]}
        title={TITLES[state.screen]}
        expiringCount={expiringCount}
        onOpenDrawer={() => dispatch({ type: 'drawer/set', open: true })}
      />

      <div className={styles.scroll}>
        <div className={styles.column}>
          {state.screen === 'spin' && <SpinScreen state={state} dispatch={dispatch} onSpin={spin} />}
          {state.screen === 'pantry' && <FridgeScreen state={state} dispatch={dispatch} />}
          {state.screen === 'plan' && <CookedScreen state={state} />}
          {state.screen === 'list' && <ShoppingScreen state={state} dispatch={dispatch} />}
          {state.screen === 'setup' && <RulesScreen state={state} dispatch={dispatch} />}
        </div>
      </div>

      <Drawer
        open={state.drawer}
        docked={docked}
        screen={state.screen}
        pantryCount={state.pantry.length}
        email={email}
        saveFailed={saveFailed}
        onClose={() => dispatch({ type: 'drawer/set', open: false })}
        onNavigate={(screen) => dispatch({ type: 'screen/go', screen })}
        onSignOut={signOut}
      />
    </div>
  );
}
