import type { PantryItem, ReelItem } from './data';

/** Height of one reel cell in px. Drives all of the spin maths. */
export const CELL_H = 84;
/** How many times each reel's list is repeated into its strip. */
export const STRIP_REPEATS = 10;
export const SETTLE_MS = 2500;

/** Compose a dish name from the three picks — there is no recipe corpus. */
export function dishOf(p: ReelItem, v: ReelItem, c: ReelItem): string {
  const P = p.short || p.name;
  const cw = c.word || c.name;
  const vw = (v.cook || 'fresh') + ' ' + (v.word || v.name).toLowerCase();
  const base = {
    bowl: `${P} ${cw} Bowl`,
    noodles: `${P} ${cw} Stir-Fry`,
    salad: `${P} & ${cw} Salad`,
    tacos: `${P} Tacos`,
    skillet: `${P} ${cw} Skillet`,
    roast: `Roasted ${c.name} & ${P}`,
  }[c.style || 'bowl'];
  return `${base} with ${vw}`;
}

export function allowed(item: ReelItem, reel: number, diets: string[]): boolean {
  if (reel === 0 && diets.includes('Vegetarian') && item.diet !== 'veg') return false;
  if (reel === 0 && diets.includes('Pescatarian') && item.diet === 'meat') return false;
  if (reel === 0 && diets.includes('No red meat') && item.red) return false;
  if (reel === 2 && diets.includes('Gluten-free') && item.gf === false) return false;
  return true;
}

export function weightOf(item: ReelItem, pantry: PantryItem[], weighting: boolean): number {
  const p = pantry.find(x => x.name === item.name);
  if (!weighting) return p ? 1.4 : 1;
  if (!p) return 0.7;
  if (p.days <= 2) return 6;
  if (p.days <= 4) return 3;
  if (p.days <= 10) return 1.6;
  return 1;
}

/** Weighted pick of an index into `list`, after diet filtering (falls back to the full list if the filter empties it). */
export function weightedPick(
  list: ReelItem[], reel: number, diets: string[], pantry: PantryItem[], weighting: boolean, rand = Math.random,
): number {
  const pool = list.filter(i => allowed(i, reel, diets));
  const src = pool.length ? pool : list;
  const w = (i: ReelItem) => weightOf(i, pantry, weighting);
  let r = rand() * src.reduce((s, i) => s + w(i), 0);
  for (const i of src) {
    r -= w(i);
    if (r <= 0) return list.indexOf(i);
  }
  return list.indexOf(src[src.length - 1]);
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** The item index sitting on the payline — the middle of three visible cells, i.e. strip index idx + 1. */
export const paylineOf = (idx: number, len: number) => mod(idx + 1, len);

export interface SpinPlan { idx: number[]; dur: string[]; target: number[] }

/**
 * Plan a draw. Locked reels keep their payline item; the others run 4 full turns
 * plus one extra per reel for stagger, and land the chosen item on the payline.
 */
export function planSpin(idx: number[], locks: boolean[], lens: number[], choose: (reel: number) => number): SpinPlan {
  const out: SpinPlan = { idx: idx.slice(), dur: ['0s', '0s', '0s'], target: [] };
  lens.forEach((len, k) => {
    const cur = paylineOf(idx[k], len);
    if (locks[k]) { out.target[k] = cur; return; }
    const chosen = choose(k);
    const delta = mod(chosen - cur, len);
    out.idx[k] = cur + len - 1 + 4 * len + k * len + delta;
    out.dur[k] = (1.5 + k * 0.42).toFixed(2) + 's';
    out.target[k] = chosen;
  });
  return out;
}

/** After the spin settles, snap each strip back so its target sits on the payline near the top of the strip. */
export const settledIdx = (target: number[], lens: number[]) => target.map((c, k) => c + lens[k] - 1);

// — dates —
const noon = () => { const t = new Date(); t.setHours(12, 0, 0, 0); return t; };
const pad = (n: number) => String(n).padStart(2, '0');
export function isoIn(days: number): string {
  const t = noon();
  t.setDate(t.getDate() + days);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}
export const daysTo = (iso: string) => Math.round((new Date(iso + 'T12:00:00').getTime() - noon().getTime()) / 864e5);

export const daysNote = (days: number) => (days > 30 ? 'keeps for months' : days === 1 ? 'use today' : `use within ${days} days`);
