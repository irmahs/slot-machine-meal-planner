import { DEFAULT_CATEGORY, type CategoryCode } from '../data/categories';
import type { GroceryItem, Ingredient, PantryItem, PlanEntry } from '../data/model';
import { DEFAULT_UNIT, type UnitCode } from '../data/units';
import { addDaysISO, todayISO } from '../lib/dates';
import type { Snapshot } from '../lib/remote';
import { dishName, pickedNames, reelsFrom, settleIdx, type SpinPlan, type Triple } from '../engine/reel';

export type Screen = 'spin' | 'pantry' | 'plan' | 'list' | 'setup';
export type RepeatWindow = 3 | 5 | 7 | 14;

/** Which add form the new-ingredient panel was opened from, so the result lands back in it. */
export type PickerTarget = 'pantry' | 'grocery';

export interface PlannerState {
  screen: Screen;
  drawer: boolean;
  idx: Triple<number>;
  locks: Triple<boolean>;
  dur: Triple<string>;
  spinning: boolean;
  /** The names under the payline once a spin settles; null for a reel with nothing on it. */
  picked: Triple<string | null> | null;
  /** Your ingredients, each with the category that puts it on a reel. */
  catalogue: Ingredient[];
  pantry: PantryItem[];
  plan: PlanEntry[];
  grocery: GroceryItem[];
  repeatDays: RepeatWindow;
  weighting: boolean;
  /** The ingredient chosen in the fridge's dropdown; '' when nothing is chosen. */
  draftName: string;
  /** ISO date the new item goes off, straight from the picker. */
  draftExpiry: string;
  /** Kept as typed text so the field can be empty or half-written; parsed when the item is added. */
  draftQty: string;
  draftUnit: UnitCode;
  draftGroc: string;
  draftGrocQty: string;
  draftGrocUnit: UnitCode;
  /** The "new ingredient" panel: which form opened it, and what is being typed into it. */
  newFor: PickerTarget | null;
  newName: string;
  newCategory: CategoryCode;
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
    catalogue: [],
    pantry: [],
    plan: [],
    grocery: [],
    repeatDays: 7,
    weighting: true,
    draftName: '',
    draftExpiry: addDaysISO(DEFAULT_WINDOW),
    draftQty: '1',
    draftUnit: DEFAULT_UNIT,
    draftGroc: '',
    draftGrocQty: '1',
    draftGrocUnit: DEFAULT_UNIT,
    newFor: null,
    newName: '',
    newCategory: DEFAULT_CATEGORY,
  };
}

export function snapshotOf(state: PlannerState): Snapshot {
  return {
    catalogue: state.catalogue,
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
  | { type: 'ingredient/startNew'; target: PickerTarget }
  | { type: 'ingredient/cancelNew' }
  | { type: 'ingredient/newName'; value: string }
  | { type: 'ingredient/newCategory'; category: CategoryCode }
  | { type: 'ingredient/create' }
  | { type: 'pantry/select'; value: string }
  | { type: 'pantry/draftExpiry'; value: string }
  | { type: 'pantry/draftQty'; value: string }
  | { type: 'pantry/draftUnit'; unit: UnitCode }
  | { type: 'pantry/add' }
  | { type: 'pantry/remove'; name: string }
  | { type: 'grocery/select'; value: string }
  | { type: 'grocery/draftQty'; value: string }
  | { type: 'grocery/draftUnit'; unit: UnitCode }
  | { type: 'grocery/add' }
  | { type: 'grocery/toggle'; name: string }
  | { type: 'grocery/remove'; name: string }
  | { type: 'grocery/stock'; name: string }
  | { type: 'rules/repeatDays'; days: RepeatWindow }
  | { type: 'rules/toggleWeighting' };

/** Refreshing a window never brings an expiry date forward. */
function laterOf(expiresOn: string, days: number): string {
  const refreshed = addDaysISO(days);
  return expiresOn > refreshed ? expiresOn : refreshed;
}

/** A blank or nonsense entry means one of the thing, not NaN. */
function parseQuantity(typed: string): number {
  const value = Number(typed);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function categoryOf(catalogue: Ingredient[], name: string): CategoryCode {
  return catalogue.find((i) => i.name === name)?.category ?? DEFAULT_CATEGORY;
}

function known(catalogue: Ingredient[], name: string): boolean {
  return catalogue.some((i) => i.name.toLowerCase() === name.toLowerCase());
}

/** How far ahead the date picker starts, and the windows the app sets on your behalf. */
const DEFAULT_WINDOW = 5;
const STOCKED_WINDOW = 6;
const COOKED_WINDOW = 14;

export function plannerReducer(state: PlannerState, action: Action): PlannerState {
  switch (action.type) {
    case 'state/hydrate':
      return {
        ...state,
        catalogue: action.snapshot.catalogue,
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

    case 'spin/settle': {
      // The fridge can change while the reels turn, so the targets are read back against the
      // reels as they are now rather than as they were when the spin was planned.
      const reels = reelsFrom(state.pantry);
      const targets = action.targets.map((target, k) =>
        reels[k].length ? target % reels[k].length : 0,
      ) as Triple<number>;
      return {
        ...state,
        spinning: false,
        picked: pickedNames(targets, reels),
        idx: settleIdx(targets, reels),
        dur: ['0s', '0s', '0s'],
      };
    }

    case 'dish/cook': {
      if (!state.picked) return state;
      const names = state.picked.filter((name): name is string => name !== null);
      if (!names.length) return state;

      return {
        ...state,
        screen: 'plan',
        picked: null,
        plan: [
          {
            id: crypto.randomUUID(),
            cookedOn: todayISO(),
            dish: dishName(state.picked),
            sub: 'Just added from a pull',
            ingredients: names,
          },
          ...state.plan,
        ],
        // Everything drawn was in the fridge, so cooking only pushes its window back out.
        pantry: state.pantry.map((item) =>
          names.includes(item.name) ? { ...item, expiresOn: laterOf(item.expiresOn, COOKED_WINDOW) } : item,
        ),
      };
    }

    case 'ingredient/startNew':
      return { ...state, newFor: action.target, newName: '', newCategory: DEFAULT_CATEGORY };

    case 'ingredient/cancelNew':
      return { ...state, newFor: null, newName: '' };

    case 'ingredient/newName':
      return { ...state, newName: action.value };

    case 'ingredient/newCategory':
      return { ...state, newCategory: action.category };

    case 'ingredient/create': {
      const name = state.newName.trim();
      if (!name || !state.newFor) return state;

      // Naming something that already exists just selects it, rather than making a second row.
      const existing = state.catalogue.find((i) => i.name.toLowerCase() === name.toLowerCase());
      const chosen = existing?.name ?? name;
      const selection =
        state.newFor === 'pantry' ? { draftName: chosen } : { draftGroc: chosen };

      return {
        ...state,
        ...selection,
        catalogue: existing
          ? state.catalogue
          : [...state.catalogue, { name, category: state.newCategory }],
        newFor: null,
        newName: '',
      };
    }

    case 'pantry/select':
      return { ...state, draftName: action.value };

    case 'pantry/draftExpiry':
      return { ...state, draftExpiry: action.value };

    case 'pantry/draftQty':
      return { ...state, draftQty: action.value };

    case 'pantry/draftUnit':
      return { ...state, draftUnit: action.unit };

    case 'pantry/add': {
      const name = state.draftName.trim();
      if (!name || !known(state.catalogue, name)) return state;
      return {
        ...state,
        pantry: [
          {
            name,
            category: categoryOf(state.catalogue, name),
            expiresOn: state.draftExpiry,
            qty: parseQuantity(state.draftQty),
            unit: state.draftUnit,
          },
          ...state.pantry.filter((p) => p.name !== name),
        ],
        grocery: state.grocery.filter((g) => g.name !== name),
        draftName: '',
        draftExpiry: addDaysISO(DEFAULT_WINDOW),
        draftQty: '1',
        draftUnit: DEFAULT_UNIT,
      };
    }

    case 'pantry/remove':
      return { ...state, pantry: state.pantry.filter((p) => p.name !== action.name) };

    case 'grocery/select':
      return { ...state, draftGroc: action.value };

    case 'grocery/draftQty':
      return { ...state, draftGrocQty: action.value };

    case 'grocery/draftUnit':
      return { ...state, draftGrocUnit: action.unit };

    case 'grocery/add': {
      const name = state.draftGroc.trim();
      if (!name || !known(state.catalogue, name)) return state;
      const already = state.grocery.some((g) => g.name === name);
      return {
        ...state,
        grocery: already
          ? state.grocery
          : [
              {
                name,
                category: categoryOf(state.catalogue, name),
                qty: parseQuantity(state.draftGrocQty),
                unit: state.draftGrocUnit,
                acquired: false,
              },
              ...state.grocery,
            ],
        draftGroc: '',
        draftGrocQty: '1',
        draftGrocUnit: DEFAULT_UNIT,
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

    case 'grocery/stock': {
      const bought = state.grocery.find((g) => g.name === action.name);
      return {
        ...state,
        pantry: [
          {
            name: action.name,
            category: categoryOf(state.catalogue, action.name),
            expiresOn: addDaysISO(STOCKED_WINDOW),
            qty: bought?.qty ?? 1,
            unit: bought?.unit ?? DEFAULT_UNIT,
          },
          ...state.pantry.filter((p) => p.name !== action.name),
        ],
        grocery: state.grocery.filter((g) => g.name !== action.name),
      };
    }

    case 'rules/repeatDays':
      return { ...state, repeatDays: action.days };

    case 'rules/toggleWeighting':
      return { ...state, weighting: !state.weighting };
  }
}
