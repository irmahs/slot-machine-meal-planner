import { describe, expect, it } from 'vitest';
import type { PantryItem } from '../data/model';
import { addDaysISO } from '../lib/dates';
import {
  canSpin,
  dishName,
  emptyReels,
  paylineIndex,
  pickIndex,
  planSpin,
  reelsFrom,
  settleIdx,
  weightOf,
  type PickContext,
  type Triple,
} from './reel';

const item = (
  name: string,
  category: PantryItem['category'],
  days: number,
  qty = 1,
  unit: PantryItem['unit'] = 'piece',
): PantryItem => ({ name, category, expiresOn: addDaysISO(days), qty, unit });

const PANTRY: PantryItem[] = [
  item('Chicken Thighs', 'protein', 2, 600, 'g'),
  item('Firm Tofu', 'protein', 6, 1, 'block'),
  item('Eggs', 'protein', 40, 6),
  item('Baby Spinach', 'green', 1, 1, 'bag'),
  item('Zucchini', 'green', 3, 2),
  item('Jasmine Rice', 'grain', 90, 1.5, 'kg'),
  item('Corn Tortillas', 'grain', 8, 1, 'pack'),
];

const reels = reelsFrom(PANTRY);
const ctx: PickContext = { reels, weighting: true };

describe('reels from the fridge', () => {
  it('slices the pantry into one reel per category', () => {
    expect(reels.map((list) => list.length)).toEqual([3, 2, 2]);
    expect(reels[1].every((i) => i.category === 'green')).toBe(true);
  });

  it('puts the soonest to go off at the top of a column', () => {
    expect(reels[0].map((i) => i.name)).toEqual(['Chicken Thighs', 'Firm Tofu', 'Eggs']);
  });

  it('holds nothing at all for an empty fridge', () => {
    const none = reelsFrom([]);
    expect(none.map((list) => list.length)).toEqual([0, 0, 0]);
    expect(canSpin(none)).toBe(false);
    expect(emptyReels(none)).toEqual(['protein', 'green', 'grain']);
  });

  it('names the reel that is holding the draw up', () => {
    const noGrain = reelsFrom(PANTRY.filter((i) => i.category !== 'grain'));
    expect(emptyReels(noGrain)).toEqual(['grain']);
    expect(canSpin(noGrain)).toBe(false);
    expect(canSpin(reels)).toBe(true);
  });
});

describe('payline', () => {
  it('reads the middle visible cell, one past the strip offset', () => {
    expect(paylineIndex(0, 6)).toBe(1);
    expect(paylineIndex(5, 6)).toBe(0);
    expect(paylineIndex(-1, 6)).toBe(0);
  });

  it('stays in range for an empty column', () => {
    expect(paylineIndex(4, 0)).toBe(0);
  });
});

describe('planSpin', () => {
  const idx: Triple<number> = [0, 0, 0];

  it('leaves every target sitting on the payline once the strip settles', () => {
    const plan = planSpin(idx, [false, false, false], ctx);
    const rest = settleIdx(plan.targets, reels);
    plan.targets.forEach((target, k) => {
      expect(paylineIndex(rest[k], reels[k].length)).toBe(target);
    });
  });

  it('moves each unlocked reel forward by at least four turns', () => {
    const plan = planSpin(idx, [false, false, false], ctx);
    plan.idx.forEach((next, k) => {
      expect(next - idx[k]).toBeGreaterThanOrEqual(4 * reels[k].length);
    });
  });

  it('staggers the reels', () => {
    const plan = planSpin(idx, [false, false, false], ctx);
    expect(plan.durations).toEqual(['1.50s', '1.92s', '2.34s']);
  });

  it('holds a locked reel on whatever is already on its payline', () => {
    const held: Triple<number> = [2, 0, 0];
    const plan = planSpin(held, [true, false, false], ctx);
    expect(plan.targets[0]).toBe(paylineIndex(2, reels[0].length));
    expect(plan.idx[0]).toBe(2);
    expect(plan.durations[0]).toBe('0s');
  });

  it('leaves an empty reel alone rather than dividing by nothing', () => {
    const noGreen = reelsFrom(PANTRY.filter((i) => i.category !== 'green'));
    const plan = planSpin(idx, [false, false, false], { reels: noGreen, weighting: true });
    expect(plan.targets[1]).toBe(0);
    expect(plan.durations[1]).toBe('0s');
    expect(Number.isNaN(plan.idx[1])).toBe(false);
  });
});

describe('weighting', () => {
  it('favours what is closest to going off', () => {
    expect(weightOf(item('x', 'protein', 2), true)).toBe(6);
    expect(weightOf(item('x', 'protein', 4), true)).toBe(3);
    expect(weightOf(item('x', 'protein', 6), true)).toBe(1.6);
    expect(weightOf(item('x', 'protein', 40), true)).toBe(1);
  });

  it('treats everything alike when weighting is off', () => {
    expect(weightOf(item('x', 'protein', 2), false)).toBe(1);
    expect(weightOf(item('x', 'protein', 40), false)).toBe(1);
  });
});

describe('pickIndex', () => {
  it('always returns an index inside the reel', () => {
    for (let r = 0; r < 200; r += 1) {
      const i = pickIndex(reels[0], true, () => r / 200);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(reels[0].length);
    }
  });

  it('reports -1 for a reel with nothing on it', () => {
    expect(pickIndex([], true)).toBe(-1);
  });

  it('leans towards the urgent item', () => {
    let urgent = 0;
    for (let r = 0; r < 600; r += 1) {
      if (reels[0][pickIndex(reels[0], true)].name === 'Chicken Thighs') urgent += 1;
    }
    // Weights are 6 : 1.6 : 1, so the urgent one should take well over half the draws.
    expect(urgent).toBeGreaterThan(300);
  });
});

describe('dish naming', () => {
  it('composes a name from the three picks alone', () => {
    const name = dishName(['Chicken Thighs', 'Broccoli', 'Jasmine Rice']);
    expect(name).toContain('Chicken Thighs');
    expect(name).toContain('Broccoli');
    expect(name).toContain('Jasmine Rice');
  });

  it('gives the same three picks the same name every time', () => {
    const picks: Triple<string | null> = ['Eggs', 'Mushrooms', 'Orzo'];
    expect(dishName(picks)).toBe(dishName(picks));
  });

  it('reads sensibly for ingredients it has never seen', () => {
    const name = dishName(['Tempeh', 'Cavolo Nero', 'Freekeh']);
    expect(name).toContain('Tempeh');
    expect(name).toContain('Freekeh');
  });

  it('falls back to what it has when a reel drew nothing', () => {
    expect(dishName(['Eggs', null, 'Orzo'])).toBe('Eggs & Orzo');
    expect(dishName([null, null, null])).toBe('Nothing drawn yet');
  });
});
