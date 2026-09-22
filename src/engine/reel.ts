import { CATEGORY_CODES, type CategoryCode } from '../data/categories';
import type { PantryItem } from '../data/model';
import { daysUntil } from '../lib/dates';

export const CELL_HEIGHT = 63;
export const STRIP_REPEATS = 8;
export const SETTLE_MS = 2500;

export type Triple<T> = [T, T, T];

/** One reel per category, in category order: Protein, Green, Grain. */
export type Reels = Triple<PantryItem[]>;

export interface PickContext {
  reels: Reels;
  weighting: boolean;
}

/**
 * The reels are the fridge, sliced by category — there is no catalogue behind them. An empty
 * fridge means empty reels, and soonest-to-go-off sits at the top of each column.
 */
export function reelsFrom(pantry: PantryItem[]): Reels {
  return CATEGORY_CODES.map((code) =>
    pantry
      .filter((item) => item.category === code)
      .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn)),
  ) as Reels;
}

/** Which reels have nothing to draw from; a draw needs all three. */
export function emptyReels(reels: Reels): CategoryCode[] {
  return CATEGORY_CODES.filter((_, k) => reels[k].length === 0);
}

export function canSpin(reels: Reels): boolean {
  return emptyReels(reels).length === 0;
}

/** The payline is the middle of the three visible cells, i.e. strip index `idx + 1`. */
export function paylineIndex(idx: number, len: number): number {
  if (len === 0) return 0;
  return (((idx + 1) % len) + len) % len;
}

export function pantryOf(pantry: PantryItem[], name: string): PantryItem | undefined {
  return pantry.find((p) => p.name === name);
}

export function daysLeft(item: PantryItem): number {
  return daysUntil(item.expiresOn);
}

/**
 * Everything on a reel is already in the fridge, so weighting is purely about urgency: the
 * closer an item is to its date, the more often it comes up.
 */
export function weightOf(item: PantryItem, weighting: boolean): number {
  if (!weighting) return 1;

  const left = daysLeft(item);
  if (left <= 2) return 6;
  if (left <= 4) return 3;
  if (left <= 10) return 1.6;
  return 1;
}

/** Weighted pick within one reel. An empty reel has nothing to pick, so it reports -1. */
export function pickIndex(
  list: PantryItem[],
  weighting: boolean,
  random: () => number = Math.random,
): number {
  if (!list.length) return -1;

  const total = list.reduce((sum, item) => sum + weightOf(item, weighting), 0);
  let r = random() * total;
  for (let i = 0; i < list.length; i += 1) {
    r -= weightOf(list[i], weighting);
    if (r <= 0) return i;
  }
  return list.length - 1;
}

export interface SpinPlan {
  idx: Triple<number>;
  durations: Triple<string>;
  targets: Triple<number>;
}

/**
 * Unlocked reels travel four full turns plus one extra turn per reel for stagger; locked reels
 * keep whatever already sits on their payline.
 */
export function planSpin(
  idx: Triple<number>,
  locks: Triple<boolean>,
  ctx: PickContext,
  random: () => number = Math.random,
): SpinPlan {
  const nextIdx = [...idx] as Triple<number>;
  const durations: Triple<string> = ['0s', '0s', '0s'];
  const targets = [0, 0, 0] as Triple<number>;

  ctx.reels.forEach((list, k) => {
    const len = list.length;
    const current = paylineIndex(idx[k], len);
    if (locks[k] || len === 0) {
      targets[k] = current;
      return;
    }
    const chosen = pickIndex(list, ctx.weighting, random);
    const delta = (((chosen - current) % len) + len) % len;
    nextIdx[k] = idx[k] + 4 * len + k * len + delta;
    durations[k] = `${(1.5 + k * 0.42).toFixed(2)}s`;
    targets[k] = chosen;
  });

  return { idx: nextIdx, durations, targets };
}

/** Where the strip rests once the spin snaps: the target back on the payline. */
export function settleIdx(targets: Triple<number>, reels: Reels): Triple<number> {
  return targets.map((target, k) => target + Math.max(reels[k].length, 1) - 1) as Triple<number>;
}

/** The names under the payline, or null for a reel with nothing on it. */
export function pickedNames(targets: Triple<number>, reels: Reels): Triple<string | null> {
  return targets.map((target, k) => reels[k][target]?.name ?? null) as Triple<string | null>;
}

/**
 * Names are composed from the picks, never looked up — the app knows no recipes and no
 * ingredients. The templates describe the *shape* of a dish name, so any three things the user
 * typed read as a meal; the same three always produce the same name.
 */
const NAME_TEMPLATES: Array<(p: string, g: string, r: string) => string> = [
  (p, g, r) => `${p} with ${g} and ${r}`,
  (p, g, r) => `${r} bowl with ${p} and ${g}`,
  (p, g, r) => `${p} over ${r}, ${g} on the side`,
  (p, g, r) => `${p}, ${g} & ${r}`,
];

export function dishName(names: Triple<string | null>): string {
  const [protein, green, grain] = names;
  const present = names.filter((name): name is string => name !== null);
  if (!present.length) return 'Nothing drawn yet';
  if (!protein || !green || !grain) return present.join(' & ');

  return NAME_TEMPLATES[hash(present.join('|')) % NAME_TEMPLATES.length](protein, green, grain);
}

/** A small stable hash, so a given three picks always get the same one of the templates. */
function hash(text: string): number {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 31 + text.charCodeAt(i)) >>> 0;
  }
  return value;
}
