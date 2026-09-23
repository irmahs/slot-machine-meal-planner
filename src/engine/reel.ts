import type { Ingredient, PantryItem } from '../data/model';
import {
  CATEGORY_CODES,
  METHODS,
  PROTEIN_KINDS,
  STARCH_KINDS,
  VEGETABLE_KINDS,
  type CategoryCode,
  type DietRule,
  type DishStyle,
  type MethodCode,
} from '../data/reference';
import { daysUntil } from '../lib/dates';

/** Height of one reel cell in px. Drives all of the spin maths. */
export const CELL_H = 84;
export const STRIP_REPEATS = 10;
export const SETTLE_MS = 2500;

export type Triple<T> = [T, T, T];
/** One reel per category, in category order: Protein, Vegetables, Starch. */
export type Reels = Triple<PantryItem[]>;

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Look an ingredient up by the name every other table stores. */
export function ingredientOf(catalogue: Ingredient[], name: string): Ingredient | undefined {
  return catalogue.find((i) => i.name === name);
}

export const proteinKind = (code: string) => PROTEIN_KINDS.find((k) => k.code === code);
export const vegetableKind = (code: string) => VEGETABLE_KINDS.find((k) => k.code === code);
export const starchKind = (code: string) => STARCH_KINDS.find((k) => k.code === code);
export const methodOf = (code: MethodCode | null) =>
  code ? METHODS.find((m) => m.code === code) : undefined;

/**
 * The reels are the pantry, sliced by the category of each item's ingredient.
 * Nothing you have not stocked can spin, so an empty pantry means empty reels.
 * Soonest to go off sits at the top of each column.
 */
export function reelsFrom(pantry: PantryItem[], catalogue: Ingredient[]): Reels {
  return CATEGORY_CODES.map((code) =>
    pantry
      .filter((item) => ingredientOf(catalogue, item.name)?.category === code)
      .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn)),
  ) as Reels;
}

export function emptyReels(reels: Reels): CategoryCode[] {
  return CATEGORY_CODES.filter((_, k) => reels[k].length === 0);
}

export const canSpin = (reels: Reels) => emptyReels(reels).length === 0;

export const daysLeft = (item: PantryItem) => daysUntil(item.expiresOn);

/** The payline is the middle of three visible cells, i.e. strip index idx + 1. */
export const paylineOf = (idx: number, len: number) => (len === 0 ? 0 : mod(idx + 1, len));

/** Diet rules read the ingredient's kind, which is the only thing that knows. */
export function allowed(ingredient: Ingredient | undefined, diets: DietRule[]): boolean {
  if (!ingredient) return true;

  if (ingredient.category === 'protein') {
    const kind = proteinKind(ingredient.kind);
    if (!kind) return true;
    if (diets.includes('Vegetarian') && kind.diet !== 'veg') return false;
    if (diets.includes('Pescatarian') && kind.diet === 'meat') return false;
    if (diets.includes('No red meat') && kind.redMeat) return false;
  }

  if (ingredient.category === 'starch' && diets.includes('Gluten-free')) {
    const kind = starchKind(ingredient.kind);
    const gf = ingredient.glutenFree ?? kind?.glutenFree ?? false;
    if (!gf) return false;
  }

  return true;
}

/** Everything on a reel is in the pantry, so weight is purely about urgency. */
export function weightOf(item: PantryItem, weighting: boolean): number {
  if (!weighting) return 1;
  const left = daysLeft(item);
  if (left <= 2) return 6;
  if (left <= 4) return 3;
  if (left <= 10) return 1.6;
  return 1;
}

export interface PickContext {
  catalogue: Ingredient[];
  diets: DietRule[];
  weighting: boolean;
}

/**
 * Weighted pick within one reel, after diet filtering. A filter that empties the
 * reel falls back to the unfiltered list rather than failing to draw.
 */
export function pickIndex(
  list: PantryItem[],
  ctx: PickContext,
  random: () => number = Math.random,
): number {
  if (!list.length) return -1;

  const pool = list.filter((item) => allowed(ingredientOf(ctx.catalogue, item.name), ctx.diets));
  const source = pool.length ? pool : list;
  let r = random() * source.reduce((sum, item) => sum + weightOf(item, ctx.weighting), 0);
  for (const item of source) {
    r -= weightOf(item, ctx.weighting);
    if (r <= 0) return list.indexOf(item);
  }
  return list.indexOf(source[source.length - 1]);
}

export interface SpinPlan {
  idx: Triple<number>;
  dur: Triple<string>;
  target: Triple<number>;
}

/**
 * Unlocked reels run four full turns plus one extra per reel for stagger and
 * land their pick on the payline; a locked reel keeps what it already holds.
 */
export function planSpin(
  idx: Triple<number>,
  locks: Triple<boolean>,
  reels: Reels,
  ctx: PickContext,
  random: () => number = Math.random,
): SpinPlan {
  const out: SpinPlan = { idx: [...idx], dur: ['0s', '0s', '0s'], target: [0, 0, 0] };

  reels.forEach((list, k) => {
    const len = list.length;
    const cur = paylineOf(idx[k], len);
    if (locks[k] || len === 0) {
      out.target[k] = cur;
      return;
    }
    const chosen = pickIndex(list, ctx, random);
    out.idx[k] = cur + len - 1 + 4 * len + k * len + mod(chosen - cur, len);
    out.dur[k] = `${(1.5 + k * 0.42).toFixed(2)}s`;
    out.target[k] = chosen;
  });

  return out;
}

/** Where each strip rests once the spin snaps: the target back on the payline. */
export const settledIdx = (target: Triple<number>, reels: Reels): Triple<number> =>
  target.map((c, k) => c + Math.max(reels[k].length, 1) - 1) as Triple<number>;

export const pickedNames = (target: Triple<number>, reels: Reels): Triple<string | null> =>
  target.map((c, k) => reels[k][c]?.name ?? null) as Triple<string | null>;

export function styleOf(starch: Ingredient | undefined): DishStyle {
  return starchKind(starch?.kind ?? '')?.style ?? 'bowl';
}

/**
 * Compose a dish name from the picks and the method — there is no recipe corpus
 * and no list of dish names. The starch's kind decides the shape of the name,
 * the vegetable's kind supplies the word describing it, and the method supplies
 * the participle in front: "Air-fried Chicken Rice Bowl with charred broccoli".
 */
export function dishName(
  picks: Triple<Ingredient | undefined>,
  method: MethodCode | null,
): string {
  const [protein, vegetable, starch] = picks;
  const short = (i: Ingredient | undefined) => (i ? i.shortName || i.name : '');

  const present = picks.filter((i): i is Ingredient => i !== undefined);
  if (!present.length) return 'Nothing drawn yet';

  const P = short(protein);
  const S = short(starch);
  const base: Record<DishStyle, string> = {
    bowl: `${P} ${S} Bowl`,
    noodles: `${P} ${S} Stir-Fry`,
    salad: `${P} & ${S} Salad`,
    tacos: `${P} Tacos`,
    skillet: `${P} ${S} Skillet`,
    roast: `${P} & ${S} Tray`,
  };

  // A reel that drew nothing leaves a gap, so fall back to naming what there is.
  if (!protein || !starch) return present.map((i) => i.name).join(' & ');

  const phrase = methodOf(method)?.phrase;
  const head = phrase ? `${phrase} ${base[styleOf(starch)]}` : base[styleOf(starch)];
  if (!vegetable) return head;

  const word = vegetableKind(vegetable.kind)?.word ?? 'fresh';
  return `${head} with ${word} ${(vegetable.shortName || vegetable.name).toLowerCase()}`;
}

export const daysNote = (days: number) =>
  days > 30 ? 'keeps for months' : days < 0 ? 'past its date' : days === 0 ? 'use today' : days === 1 ? 'use tomorrow' : `use within ${days} days`;
