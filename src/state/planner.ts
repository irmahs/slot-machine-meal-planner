import type { GroceryItem, Ingredient, PantryItem, PlanEntry } from '../data/model';
import {
  EMPTY_VOCAB,
  defaultUnit,
  labelOfCategory,
  methodOf,
  type CategoryCode,
  type Vocab,
} from '../data/vocab';
import { FEATURES } from '../features';
import { addDaysISO, todayISO } from '../lib/dates';
import type { Snapshot } from '../lib/remote';
import {
  dishName,
  ingredientOf,
  pickedNames,
  reelsFrom,
  settledIdx,
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
  /** The ways it can be cooked, as method codes. */
  methods: string[];
  days: number;
  qty: string;
  unit: string;
  /** Straight into the pantry, or onto the shopping list. */
  have: boolean;
}

/** The pantry's own add row: an ingredient you already have, being stocked. */
export interface StockDraft {
  name: string;
  qty: string;
  unit: string;
  days: number;
}

export interface PlannerState {
  /** Every word the app uses, from the reference tables. Empty until loaded. */
  vocab: Vocab;
  screen: Screen;
  catalogue: Ingredient[];
  pantry: PantryItem[];
  plan: PlanEntry[];
  grocery: GroceryItem[];
  /** Method codes switched off. Absence means on, so a new account has all of them. */
  methodsOff: string[];
  idx: Triple<number>;
  locks: Triple<boolean>;
  dur: Triple<string>;
  spinning: boolean;
  picked: Triple<string | null> | null;
  /** The method each pick is cooked with, one per reel; null where none was ticked. */
  methods: Triple<string | null> | null;
  /** Diet rule codes that are on. */
  diets: string[];
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
  proteinKind: '',
  vegetableKind: '',
  starchKind: '',
  glutenFree: false,
  methods: [],
  days: 7,
  qty: '',
  unit: '',
  have: true,
};

const STOCK0: StockDraft = { name: '', qty: '1', unit: '', days: 7 };

export function createInitialState(): PlannerState {
  return {
    vocab: EMPTY_VOCAB,
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
    methods: null,
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
  | { type: 'vocab/load'; vocab: Vocab }
  | { type: 'state/hydrate'; snapshot: Snapshot }
  | { type: 'screen/go'; screen: Screen }
  | { type: 'reel/toggleLock'; reel: number }
  | { type: 'spin/start'; plan: SpinPlan }
  | { type: 'spin/settle'; target: Triple<number>; methods: Triple<string | null> }
  | { type: 'dish/cook' }
  | { type: 'draft/patch'; patch: Partial<AddDraft> }
  | { type: 'draft/toggleMethod'; code: string }
  | { type: 'draft/submit' }
  | { type: 'stock/patch'; patch: Partial<StockDraft> }
  | { type: 'stock/submit' }
  | { type: 'pantry/remove'; name: string }
  | { type: 'pantry/filter'; filter: CategoryCode | 'all' }
  | { type: 'grocery/add'; name: string }
  | { type: 'grocery/toggle'; name: string }
  | { type: 'grocery/remove'; name: string }
  | { type: 'grocery/stock'; name: string }
  | { type: 'method/toggle'; code: string }
  | { type: 'rules/toggleDiet'; code: string }
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
    case 'vocab/load': {
      // Defaults for the forms come from the vocabulary too: the first kind of
      // each category, and whichever unit the units table marks as the default.
      const v = action.vocab;
      const unit = defaultUnit(v);
      const starch = v.starchKinds[0];
      return {
        ...state,
        vocab: v,
        draft: {
          ...state.draft,
          proteinKind: state.draft.proteinKind || (v.proteinKinds[0]?.code ?? ''),
          vegetableKind: state.draft.vegetableKind || (v.vegetableKinds[0]?.code ?? ''),
          starchKind: state.draft.starchKind || (starch?.code ?? ''),
          glutenFree: starch?.glutenFree ?? false,
          unit: state.draft.unit || unit,
        },
        stock: { ...state.stock, unit: state.stock.unit || unit },
      };
    }

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
        flash: '',
      };

    case 'spin/settle': {
      // The pantry can change while the reels turn, so read the targets back
      // against the reels as they are now rather than as they were planned.
      const reels = reelsFrom(state.pantry, state.catalogue, state.vocab);
      const target = action.target.map((t, k) =>
        reels[k].length ? t % reels[k].length : 0,
      ) as Triple<number>;
      const picked = pickedNames(target, reels);
      // A method only survives if the ingredient that landed still has it ticked.
      const methods = action.methods.map((code, k) => {
        const ingredient = picked[k] ? ingredientOf(state.catalogue, picked[k]!) : undefined;
        return code && ingredient?.methods.includes(code) ? code : null;
      }) as Triple<string | null>;
      return {
        ...state,
        spinning: false,
        picked,
        methods,
        idx: settledIdx(target, reels),
        dur: ['0s', '0s', '0s'],
      };
    }

    case 'dish/cook': {
      if (!state.picked) return state;
      const names = state.picked.filter((n): n is string => n !== null);
      if (!names.length) return state;

      const picks = state.picked.map((n) => (n ? ingredientOf(state.catalogue, n) : undefined)) as Triple<
        Ingredient | undefined
      >;
      const methods = state.methods ?? [null, null, null];
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
          methods: null,
          pantry,
          flash: `${names.join(', ')} — good for another two weeks.`,
        };
      }

      const method = methodOf(state.vocab, methods[0]);
      return {
        ...state,
        screen: 'plan',
        picked: null,
        methods: null,
        pantry,
        plan: [
          {
            id: crypto.randomUUID(),
            cookedOn: todayISO(),
            dish: dishName(picks, methods, state.vocab),
            note: method ? `Just drawn · ${method.label.toLowerCase()}` : 'Just drawn',
            style: styleOf(picks[2], state.vocab)?.code ?? '',
            method: methods[0],
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
        draft.glutenFree =
          state.vocab.starchKinds.find((k) => k.code === action.patch.starchKind)?.glutenFree ?? false;
      }
      return { ...state, draft, flash: '' };
    }

    case 'draft/toggleMethod': {
      const on = state.draft.methods.includes(action.code);
      return {
        ...state,
        draft: {
          ...state.draft,
          methods: on
            ? state.draft.methods.filter((c) => c !== action.code)
            : [...state.draft.methods, action.code],
        },
      };
    }

    case 'draft/submit': {
      const d = state.draft;
      const name = d.name.trim();
      if (!name) return state;

      // Keep the table's order rather than the order the chips were tapped in.
      const methods = state.vocab.methods.map((m) => m.code).filter((c) => d.methods.includes(c));
      const ingredient: Ingredient = {
        name,
        shortName: d.shortName.trim() || null,
        category: d.category,
        kind: kindOfDraft(d),
        glutenFree: d.category === 'starch' ? d.glutenFree : null,
        methods,
      };
      const reel = labelOfCategory(state.vocab, d.category).toLowerCase();

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
              { name, qty: parseQuantity(d.qty), unit: d.unit, note: `New on the ${reel} reel`, acquired: false },
              ...state.grocery.filter((g) => !same(g.name, name)),
            ],
        draft: { ...d, name: '', shortName: '', qty: '', days: 7, methods: [] },
        flash: `${name} is on the ${reel} reel${d.have ? ' and in the pantry.' : ', and on the shopping list.'}`,
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
            unit: state.stock.unit || defaultUnit(state.vocab),
            expiresOn: addDaysISO(state.stock.days),
          },
          ...state.pantry.filter((p) => p.name !== name),
        ],
        grocery: state.grocery.filter((g) => g.name !== name),
        stock: { ...STOCK0, unit: defaultUnit(state.vocab) },
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
          { name, qty: 1, unit: defaultUnit(state.vocab), note: 'Added by you', acquired: false },
          ...state.grocery,
        ],
      };
    }

    case 'grocery/toggle':
      return {
        ...state,
        grocery: state.grocery.map((g) => (g.name === action.name ? { ...g, acquired: !g.acquired } : g)),
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
            unit: bought?.unit ?? defaultUnit(state.vocab),
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
        diets: state.diets.includes(action.code)
          ? state.diets.filter((d) => d !== action.code)
          : [...state.diets, action.code],
      };

    case 'rules/repeatDays':
      return { ...state, repeatDays: action.days };

    case 'rules/toggleWeighting':
      return { ...state, weighting: !state.weighting };

    case 'flash/clear':
      return { ...state, flash: '' };
  }
}

/** The diet rules switched on, as rows. */
export const activeRules = (state: PlannerState) =>
  state.vocab.dietRules.filter((r) => state.diets.includes(r.code));

/** Methods switched on in the Cooking methods screen. */
export const methodsOn = (state: PlannerState) =>
  state.vocab.methods.filter((m) => !state.methodsOff.includes(m.code));
