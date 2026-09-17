import { daysUntil } from '../lib/dates';
import {
  GRAIN,
  GRAIN_TEMPLATES,
  GREEN_PHRASES,
  REELS,
  SINGULAR,
  type PantryItem,
  type ReelItem,
} from '../data/seed';

export const CELL_HEIGHT = 63;
export const STRIP_REPEATS = 8;
export const SETTLE_MS = 2500;

export type DietRule = 'Vegetarian' | 'Pescatarian' | 'No red meat' | 'Gluten-free';

export type Triple<T> = [T, T, T];

export interface PickContext {
  pantry: PantryItem[];
  diets: DietRule[];
  weighting: boolean;
}

/** The payline is the middle of the three visible cells, i.e. strip index `idx + 1`. */
export function paylineIndex(idx: number, len: number): number {
  return (((idx + 1) % len) + len) % len;
}

export function pantryOf(pantry: PantryItem[], name: string): PantryItem | undefined {
  return pantry.find((p) => p.name === name);
}

export function allowed(item: ReelItem, list: ReelItem[], diets: DietRule[]): boolean {
  if (diets.includes('Vegetarian') && item.diet !== 'veg') return false;
  if (diets.includes('Pescatarian') && item.diet === 'meat') return false;
  if (diets.includes('No red meat') && item.name === 'Ground Beef') return false;
  if (diets.includes('Gluten-free') && list === GRAIN && item.gf === false) return false;
  return true;
}

export function daysLeft(item: PantryItem): number {
  return daysUntil(item.expiresOn);
}

export function weightOf(item: ReelItem, ctx: PickContext): number {
  const stocked = pantryOf(ctx.pantry, item.name);
  if (!ctx.weighting) return stocked ? 1.4 : 1;
  if (!stocked) return 0.7;

  const left = daysLeft(stocked);
  if (left <= 2) return 6;
  if (left <= 4) return 3;
  if (left <= 10) return 1.6;
  return 1;
}

/** Weighted pick within the diet-filtered pool; an empty pool falls back to the whole list. */
export function pickIndex(list: ReelItem[], ctx: PickContext, random: () => number = Math.random): number {
  const pool = list.filter((item) => allowed(item, list, ctx.diets));
  const source = pool.length ? pool : list;
  const total = source.reduce((sum, item) => sum + weightOf(item, ctx), 0);
  let r = random() * total;
  for (const item of source) {
    r -= weightOf(item, ctx);
    if (r <= 0) return list.indexOf(item);
  }
  return list.indexOf(source[source.length - 1]);
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

  REELS.forEach((list, k) => {
    const len = list.length;
    const current = paylineIndex(idx[k], len);
    if (locks[k]) {
      targets[k] = current;
      return;
    }
    const chosen = pickIndex(list, ctx, random);
    const delta = (((chosen - current) % len) + len) % len;
    nextIdx[k] = idx[k] + 4 * len + k * len + delta;
    durations[k] = `${(1.5 + k * 0.42).toFixed(2)}s`;
    targets[k] = chosen;
  });

  return { idx: nextIdx, durations, targets };
}

/** Where the strip rests once the spin snaps: the target back on the payline. */
export function settleIdx(targets: Triple<number>): Triple<number> {
  return targets.map((target, k) => target + REELS[k].length - 1) as Triple<number>;
}

export function dishName([protein, green, grain]: Triple<string>): string {
  const p = SINGULAR[protein] ?? protein;
  const template = GRAIN_TEMPLATES[grain] ?? ((x: string) => `${x} Bowl`);
  return `${template(p)} with ${GREEN_PHRASES[green] ?? green.toLowerCase()}`;
}

export function pickedNames(picked: Triple<number>): Triple<string> {
  return picked.map((cell, k) => REELS[k][cell].name) as Triple<string>;
}
