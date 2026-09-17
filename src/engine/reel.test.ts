import { describe, expect, it } from 'vitest';
import { GRAIN, GREEN, PROTEIN, REELS, SEED_PANTRY } from '../data/seed';
import {
  allowed,
  dishName,
  paylineIndex,
  pickIndex,
  planSpin,
  settleIdx,
  weightOf,
  type PickContext,
  type Triple,
} from './reel';

const ctx: PickContext = { pantry: SEED_PANTRY, diets: [], weighting: true };

describe('payline', () => {
  it('reads the middle visible cell, one past the strip offset', () => {
    expect(paylineIndex(0, 6)).toBe(1);
    expect(paylineIndex(5, 6)).toBe(0);
    expect(paylineIndex(-1, 6)).toBe(0);
  });
});

describe('planSpin', () => {
  const idx: Triple<number> = [0, 0, 0];

  it('leaves every target sitting on the payline once the strip settles', () => {
    const plan = planSpin(idx, [false, false, false], ctx);
    const rest = settleIdx(plan.targets);
    plan.targets.forEach((target, k) => {
      expect(paylineIndex(rest[k], REELS[k].length)).toBe(target);
    });
  });

  it('moves each unlocked reel forward by at least four turns', () => {
    const plan = planSpin(idx, [false, false, false], ctx);
    plan.idx.forEach((next, k) => {
      expect(next - idx[k]).toBeGreaterThanOrEqual(4 * REELS[k].length);
    });
  });

  it('staggers the reels', () => {
    const plan = planSpin(idx, [false, false, false], ctx);
    expect(plan.durations).toEqual(['1.50s', '1.92s', '2.34s']);
  });

  it('holds a locked reel on whatever is already on its payline', () => {
    const held: Triple<number> = [3, 0, 0];
    const plan = planSpin(held, [true, false, false], ctx);
    expect(plan.targets[0]).toBe(paylineIndex(3, PROTEIN.length));
    expect(plan.idx[0]).toBe(3);
    expect(plan.durations[0]).toBe('0s');
  });
});

describe('weighting', () => {
  it('favours what is closest to going off', () => {
    const chicken = PROTEIN[0]; // 2 days left
    const tofu = PROTEIN[3]; // 6 days left
    const beef = PROTEIN[4]; // not in the pantry
    expect(weightOf(chicken, ctx)).toBe(6);
    expect(weightOf(tofu, ctx)).toBe(1.6);
    expect(weightOf(beef, ctx)).toBe(0.7);
  });

  it('flattens to a mild pantry preference when weighting is off', () => {
    const flat = { ...ctx, weighting: false };
    expect(weightOf(PROTEIN[0], flat)).toBe(1.4);
    expect(weightOf(PROTEIN[4], flat)).toBe(1);
  });
});

describe('diet constraints', () => {
  it('keeps only vegetarian proteins', () => {
    const vegCtx: PickContext = { ...ctx, diets: ['Vegetarian'] };
    for (let r = 0; r < 200; r += 1) {
      expect(PROTEIN[pickIndex(PROTEIN, vegCtx)].diet).toBe('veg');
    }
  });

  it('excludes meat but keeps fish for pescatarians', () => {
    expect(allowed(PROTEIN[1], PROTEIN, ['Pescatarian'])).toBe(true);
    expect(allowed(PROTEIN[0], PROTEIN, ['Pescatarian'])).toBe(false);
  });

  it('drops the gluten grains only from the grain reel', () => {
    expect(allowed(GRAIN[3], GRAIN, ['Gluten-free'])).toBe(false);
    expect(allowed(GRAIN[0], GRAIN, ['Gluten-free'])).toBe(true);
  });

  it('falls back to the unfiltered list rather than failing on an empty pool', () => {
    const impossible: PickContext = { ...ctx, diets: ['Vegetarian', 'Pescatarian'] };
    const onlyMeat = [PROTEIN[0], PROTEIN[4]];
    expect(pickIndex(onlyMeat, impossible)).toBeGreaterThanOrEqual(0);
  });

  it('always returns an index inside the list', () => {
    for (let r = 0; r < 200; r += 1) {
      const i = pickIndex(GREEN, ctx, () => r / 200);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(GREEN.length);
    }
  });
});

describe('dish naming', () => {
  it('composes the name from the three picks', () => {
    expect(dishName(['Chicken Thighs', 'Broccoli', 'Jasmine Rice'])).toBe(
      'Chicken Rice Bowl with charred broccoli',
    );
    expect(dishName(['Firm Tofu', 'Bell Peppers', 'Corn Tortillas'])).toBe(
      'Tofu Tacos with blistered peppers',
    );
    expect(dishName(['Salmon Fillet', 'Zucchini', 'Sweet Potato'])).toBe(
      'Roasted Sweet Potato & Salmon with griddled zucchini',
    );
  });

  it('falls back to a bowl for an unknown grain', () => {
    expect(dishName(['Eggs', 'Mushrooms', 'Quinoa'])).toBe('Eggs Bowl with seared mushrooms');
  });
});
