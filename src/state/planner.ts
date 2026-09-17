import {
  SEED_GROCERY,
  SEED_PANTRY,
  seedPlan,
  type GroceryItem,
  type PantryItem,
  type PlanEntry,
} from '../data/seed';
import { todayISO } from '../lib/dates';
import type { Snapshot } from '../lib/remote';
import { dishName, pantryOf, pickedNames, settleIdx, type DietRule, type SpinPlan, type Triple } from '../engine/reel';

export type Screen = 'spin' | 'pantry' | 'plan' | 'list' | 'setup';
export type RepeatWindow = 3 | 5 | 7 | 14;

export interface PlannerState {
  screen: Screen;
  drawer: boolean;
  idx: Triple<number>;
  locks: Triple<boolean>;
  dur: Triple<string>;
  spinning: boolean;
  picked: Triple<number> | null;
  pantry: PantryItem[];
  plan: PlanEntry[];
  grocery: GroceryItem[];
  diets: DietRule[];
  repeatDays: RepeatWindow;
  weighting: boolean;
  draftName: string;
  draftDays: number;
  draftGroc: string;
}

export function createInitialState(): PlannerState {
  return {
    screen: 'spin',
    drawer: false,
    idx: [0, 0, 0],
    locks: [false, false, false],
    dur: ['0s', '0s', '0s'],
    spinning: false,
    picked: null,
    pantry: SEED_PANTRY,
    plan: seedPlan(),
    grocery: SEED_GROCERY,
    diets: [],
    repeatDays: 7,
    weighting: true,
    draftName: '',
    draftDays: 5,
    draftGroc: '',
  };
}

export function snapshotOf(state: PlannerState): Snapshot {
  return {
    pantry: state.pantry,
    plan: state.plan,
    grocery: state.grocery,
  };
}

export type Action =
  | { type: 'state/hydrate'; snapshot: Snapshot }
  | { type: 'screen/go'; screen: Screen }
  | { type: 'drawer/set'; open: boolean }
  | { type: 'reel/toggleLock'; reel: number }
  | { type: 'spin/start'; plan: SpinPlan }
  | { type: 'spin/settle'; targets: Triple<number> }
  | { type: 'dish/cook' }
  | { type: 'pantry/draftName'; value: string }
  | { type: 'pantry/stepDays'; delta: number }
  | { type: 'pantry/add' }
  | { type: 'pantry/remove'; name: string }
  | { type: 'grocery/draft'; value: string }
  | { type: 'grocery/add' }
  | { type: 'grocery/toggle'; name: string }
  | { type: 'grocery/remove'; name: string }
  | { type: 'grocery/stock'; name: string }
  | { type: 'rules/toggleDiet'; diet: DietRule }
  | { type: 'rules/repeatDays'; days: RepeatWindow }
  | { type: 'rules/toggleWeighting' };

const DEFAULT_DRAFT_DAYS = 5;
const STOCKED_WINDOW = 6;
const COOKED_WINDOW = 14;

export function plannerReducer(state: PlannerState, action: Action): PlannerState {
  switch (action.type) {
    case 'state/hydrate':
      return {
        ...state,
        pantry: action.snapshot.pantry,
        plan: action.snapshot.plan,
        grocery: action.snapshot.grocery,
      };

    case 'screen/go':
      return { ...state, screen: action.screen, drawer: false };

    case 'drawer/set':
      return { ...state, drawer: action.open };

    case 'reel/toggleLock': {
      const locks = [...state.locks] as Triple<boolean>;
      locks[action.reel] = !locks[action.reel];
      return { ...state, locks };
    }

    case 'spin/start':
      return {
        ...state,
        idx: action.plan.idx,
        dur: action.plan.durations,
        spinning: true,
        picked: null,
      };

    case 'spin/settle':
      return {
        ...state,
        spinning: false,
        picked: action.targets,
        idx: settleIdx(action.targets),
        dur: ['0s', '0s', '0s'],
      };

    case 'dish/cook': {
      if (!state.picked) return state;
      const names = pickedNames(state.picked);
      const dish = dishName(names);
      const missing = names.filter((name) => !pantryOf(state.pantry, name));
      return {
        ...state,
        screen: 'plan',
        picked: null,
        plan: [
          {
            id: crypto.randomUUID(),
            cookedOn: todayISO(),
            dish,
            sub: 'Just added from a pull',
            ingredients: [...names],
          },
          ...state.plan,
        ],
        pantry: state.pantry.map((item) =>
          names.includes(item.name) ? { ...item, days: Math.max(item.days, COOKED_WINDOW) } : item,
        ),
        grocery: [
          ...state.grocery,
          ...missing
            .filter((name) => !state.grocery.some((g) => g.name === name))
            .map((name) => ({ name, qty: 1, acquired: false })),
        ],
      };
    }

    case 'pantry/draftName':
      return { ...state, draftName: action.value };

    case 'pantry/stepDays':
      return { ...state, draftDays: Math.min(90, Math.max(1, state.draftDays + action.delta)) };

    case 'pantry/add': {
      const name = state.draftName.trim();
      if (!name) return state;
      return {
        ...state,
        pantry: [
          { name, days: state.draftDays, qty: 1 },
          ...state.pantry.filter((p) => p.name !== name),
        ],
        grocery: state.grocery.filter((g) => g.name.toLowerCase() !== name.toLowerCase()),
        draftName: '',
        draftDays: DEFAULT_DRAFT_DAYS,
      };
    }

    case 'pantry/remove':
      return { ...state, pantry: state.pantry.filter((p) => p.name !== action.name) };

    case 'grocery/draft':
      return { ...state, draftGroc: action.value };

    case 'grocery/add': {
      const name = state.draftGroc.trim();
      if (!name) return state;
      const already = state.grocery.some((g) => g.name.toLowerCase() === name.toLowerCase());
      return {
        ...state,
        grocery: already ? state.grocery : [{ name, qty: 1, acquired: false }, ...state.grocery],
        draftGroc: '',
      };
    }

    case 'grocery/toggle':
      return {
        ...state,
        grocery: state.grocery.map((g) =>
          g.name === action.name ? { ...g, acquired: !g.acquired } : g,
        ),
      };

    case 'grocery/remove':
      return { ...state, grocery: state.grocery.filter((g) => g.name !== action.name) };

    case 'grocery/stock':
      return {
        ...state,
        pantry: [
          { name: action.name, days: STOCKED_WINDOW, qty: 1 },
          ...state.pantry.filter((p) => p.name !== action.name),
        ],
        grocery: state.grocery.filter((g) => g.name !== action.name),
      };

    case 'rules/toggleDiet':
      return {
        ...state,
        diets: state.diets.includes(action.diet)
          ? state.diets.filter((d) => d !== action.diet)
          : [...state.diets, action.diet],
      };

    case 'rules/repeatDays':
      return { ...state, repeatDays: action.days };

    case 'rules/toggleWeighting':
      return { ...state, weighting: !state.weighting };
  }
}
