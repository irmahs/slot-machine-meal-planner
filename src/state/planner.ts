import type { GroceryItem, Ingredient, PantryItem, PlanEntry } from '../data/model';
import {
  DEFAULT_UNIT,
  METHODS,
  PROTEIN_KINDS,
  STARCH_KINDS,
  VEGETABLE_KINDS,
  type CategoryCode,
  type DietRule,
  type MethodCode,
  type UnitCode,
} from '../data/reference';
import { addDaysISO, todayISO } from '../lib/dates';
import { FEATURES } from '../features';
import type { Snapshot } from '../lib/remote';
import {
  dishName,
  ingredientOf,
  methodOf,
  pickedNames,
  reelsFrom,
  settledIdx,
  starchKind,
  styleOf,
  type SpinPlan,
  type Triple,
} from '../engine/reel';

export type Screen = 'spin' | 'pantry' | 'add' | 'plan' | 'list' | 'methods' | 'setup';

/** The Add ingredient form: one ingredient being described. */
export interface AddDraft {
  name: string;
  shortName: string;
  category: CategoryCode;
  /** One per category, so switching reels does not lose what was already picked. */
  proteinKind: string;
  vegetableKind: string;
  starchKind: string;
  glutenFree: boolean;
  days: number;
  qty: string;
  unit: UnitCode;
  /** Straight into the pantry, or onto the shopping list. */
  have: boolean;
}

/** The pantry's own add row: an ingredient you already have, being stocked. */
export interface StockDraft {
  name: string;
  qty: string;
  unit: UnitCode;
  days: number;
}

export interface PlannerState {
  screen: Screen;
  catalogue: Ingredient[];
  pantry: PantryItem[];
  plan: PlanEntry[];
  grocery: GroceryItem[];
  /** Methods switched off. Absence means on, so a new account has all of them. */
  methodsOff: MethodCode[];
  idx: Triple<number>;
  locks: Triple<boolean>;
  dur: Triple<string>;
  spinning: boolean;
  picked: Triple<string | null> | null;
  method: MethodCode | null;
  diets: DietRule[];
  repeatDays: number;
  weighting: boolean;
  pantryFilter: CategoryCode | 'all';
  draft: AddDraft;
  stock: StockDraft;
  flash: string;
}

const DRAFT0: AddDraft = {
  name: '',
  shortName: '',
  category: 'protein',
  proteinKind: 'poultry',
  vegetableKind: 'leafy',
  starchKind: 'grain',
  glutenFree: true,
  days: 7,
  qty: '',
  unit: DEFAULT_UNIT,
  have: true,
};

const STOCK0: StockDraft = { name: '', qty: '1', unit: DEFAULT_UNIT, days: 7 };

export function createInitialState(): PlannerState {
  return {
    screen: 'spin',
    catalogue: [],
    pantry: [],
    plan: [],
    grocery: [],
    methodsOff: [],
    idx: [0, 0, 0],
    locks: [false, false, false],
    dur: ['0s', '0s', '0s'],
    spinning: false,
    picked: null,
    method: null,
    diets: [],
    repeatDays: 7,
    weighting: true,
    pantryFilter: 'all',
    draft: DRAFT0,
    stock: STOCK0,
    flash: '',
  };
}

export function snapshotOf(state: PlannerState): Snapshot {
  return {
    catalogue: state.catalogue,
    pantry: state.pantry,
    plan: state.plan,
    grocery: state.grocery,
    methodsOff: state.methodsOff,
  };
}

export const kindOfDraft = (d: AddDraft): string =>
  d.category === 'protein' ? d.proteinKind : d.category === 'vegetable' ? d.vegetableKind : d.starchKind;

export type Action =
  | { type: 'state/hydrate'; snapshot: Snapshot }
  | { type: 'screen/go'; screen: Screen }
  | { type: 'reel/toggleLock'; reel: number }
  | { type: 'spin/start'; plan: SpinPlan }
  | { type: 'spin/settle'; target: Triple<number>; method: MethodCode | null }
  | { type: 'dish/cook' }
  | { type: 'dish/clear' }
  | { type: 'draft/patch'; patch: Partial<AddDraft> }
  | { type: 'draft/submit' }
  | { type: 'stock/patch'; patch: Partial<StockDraft> }
  | { type: 'stock/submit' }
  | { type: 'pantry/remove'; name: string }
  | { type: 'pantry/filter'; filter: CategoryCode | 'all' }
  | { type: 'grocery/add'; name: string }
  | { type: 'grocery/toggle'; name: string }
  | { type: 'grocery/remove'; name: string }
  | { type: 'grocery/stock'; name: string }
  | { type: 'method/toggle'; code: MethodCode }
  | { type: 'rules/toggleDiet'; diet: DietRule }
  | { type: 'rules/repeatDays'; days: number }
  | { type: 'rules/toggleWeighting' }
  | { type: 'flash/clear' };

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

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

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
        methodsOff: action.snapshot.methodsOff,
      };

    case 'screen/go':
      return { ...state, screen: action.screen, flash: '' };

    case 'reel/toggleLock': {
      const locks = [...state.locks] as Triple<boolean>;
      locks[action.reel] = !locks[action.reel];
      return { ...state, locks };
    }

    case 'spin/start':
      return {
        ...state,
        idx: action.plan.idx,
        dur: action.plan.dur,
        spinning: true,
        picked: null,
        method: null,
      };

    case 'spin/settle': {
      // The pantry can change while the reels turn, so read the targets back
      // against the reels as they are now rather than as they were planned.
      const reels = reelsFrom(state.pantry, state.catalogue);
      const target = action.target.map((t, k) =>
        reels[k].length ? t % reels[k].length : 0,
      ) as Triple<number>;
      return {
        ...state,
        spinning: false,
        picked: pickedNames(target, reels),
        method: action.method,
        idx: settledIdx(target, reels),
        dur: ['0s', '0s', '0s'],
      };
    }

    case 'dish/clear':
      return { ...state, picked: null, method: null };

    case 'dish/cook': {
      if (!state.picked) return state;
      const names = state.picked.filter((n): n is string => n !== null);
      if (!names.length) return state;

      const picks = state.picked.map((n) => (n ? ingredientOf(state.catalogue, n) : undefined)) as Triple<
        Ingredient | undefined
      >;
      const method = methodOf(state.method);
      // Everything drawn was in the pantry, so cooking pushes its window out.
      const pantry = state.pantry.map((item) =>
        names.includes(item.name) ? { ...item, expiresOn: laterOf(item.expiresOn, COOKED_WINDOW) } : item,
      );

      // With history off there is nowhere to send it, so the draw clears and the
      // only lasting effect is the refreshed use-by dates.
      if (!FEATURES.history) {
        return {
          ...state,
          picked: null,
          method: null,
          pantry,
          flash: `${names.join(', ')} — good for another two weeks.`,
        };
      }

      return {
        ...state,
        screen: 'plan',
        picked: null,
        pantry,
        plan: [
          {
            id: crypto.randomUUID(),
            cookedOn: todayISO(),
            dish: dishName(picks, state.method),
            note: method ? `Just drawn · ${method.label.toLowerCase()}` : 'Just drawn',
            style: styleOf(picks[2]),
            method: state.method,
            ingredients: names,
          },
          ...state.plan,
        ],
      };
    }

    case 'draft/patch': {
      const draft = { ...state.draft, ...action.patch };
      // Choosing a starch kind carries its gluten default across, unless the
      // same patch said otherwise.
      if (action.patch.starchKind !== undefined && action.patch.glutenFree === undefined) {
        draft.glutenFree = starchKind(action.patch.starchKind)?.glutenFree ?? false;
      }
      return { ...state, draft, flash: '' };
    }

    case 'draft/submit': {
      const d = state.draft;
      const name = d.name.trim();
      if (!name) return state;

      const ingredient: Ingredient = {
        name,
        shortName: d.shortName.trim() || null,
        category: d.category,
        kind: kindOfDraft(d),
        glutenFree: d.category === 'starch' ? d.glutenFree : null,
      };
      const label = d.category === 'vegetable' ? 'vegetables' : d.category;

      return {
        ...state,
        catalogue: [...state.catalogue.filter((i) => !same(i.name, name)), ingredient],
        pantry: d.have
          ? [
              { name, qty: parseQuantity(d.qty), unit: d.unit, expiresOn: addDaysISO(d.days) },
              ...state.pantry.filter((p) => !same(p.name, name)),
            ]
          : state.pantry.filter((p) => !same(p.name, name)),
        grocery: d.have
          ? state.grocery.filter((g) => !same(g.name, name))
          : [
              {
                name,
                qty: parseQuantity(d.qty),
                unit: d.unit,
                note: `New on the ${label} reel`,
                acquired: false,
              },
              ...state.grocery.filter((g) => !same(g.name, name)),
            ],
        draft: { ...d, name: '', shortName: '', qty: '', days: 7 },
        flash: `${name} is on the ${label} reel${d.have ? ' and in the pantry.' : ', and on the shopping list.'}`,
      };
    }

    case 'stock/patch':
      return { ...state, stock: { ...state.stock, ...action.patch } };

    case 'stock/submit': {
      const name = state.stock.name.trim();
      if (!name || !state.catalogue.some((i) => i.name === name)) return state;
      return {
        ...state,
        pantry: [
          {
            name,
            qty: parseQuantity(state.stock.qty),
            unit: state.stock.unit,
            expiresOn: addDaysISO(state.stock.days),
          },
          ...state.pantry.filter((p) => p.name !== name),
        ],
        grocery: state.grocery.filter((g) => g.name !== name),
        stock: STOCK0,
      };
    }

    case 'pantry/remove':
      return { ...state, pantry: state.pantry.filter((p) => p.name !== action.name) };

    case 'pantry/filter':
      return { ...state, pantryFilter: action.filter };

    case 'grocery/add': {
      const name = action.name.trim();
      if (!name || state.grocery.some((g) => same(g.name, name))) return state;
      // Only something you have described can go on the list, since the pantry
      // and the reels both need to know its category.
      if (!state.catalogue.some((i) => i.name === name)) return state;
      return {
        ...state,
        grocery: [
          { name, qty: 1, unit: DEFAULT_UNIT, note: 'Added by you', acquired: false },
          ...state.grocery,
        ],
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
            qty: bought?.qty ?? 1,
            unit: bought?.unit ?? DEFAULT_UNIT,
            expiresOn: addDaysISO(STOCKED_WINDOW),
          },
          ...state.pantry.filter((p) => p.name !== action.name),
        ],
        grocery: state.grocery.filter((g) => g.name !== action.name),
      };
    }

    case 'method/toggle':
      return {
        ...state,
        methodsOff: state.methodsOff.includes(action.code)
          ? state.methodsOff.filter((c) => c !== action.code)
          : [...state.methodsOff, action.code],
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

    case 'flash/clear':
      return { ...state, flash: '' };
  }
}

/** The methods a draw may choose from. */
export const methodsOn = (state: PlannerState) =>
  METHODS.filter((m) => !state.methodsOff.includes(m.code));

export const kindsFor = (category: CategoryCode) =>
  category === 'protein' ? PROTEIN_KINDS : category === 'vegetable' ? VEGETABLE_KINDS : STARCH_KINDS;
