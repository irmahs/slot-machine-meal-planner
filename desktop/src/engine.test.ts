import { describe, expect, it } from 'vitest';
import { CATALOG0, PANTRY0 } from './data';
import { dishOf, paylineOf, planSpin, settledIdx, weightOf, weightedPick } from './engine';

const [P, V, C] = CATALOG0;
const byName = (list: typeof P, n: string) => list.find(i => i.name === n)!;

describe('dishOf', () => {
  it('composes chicken + broccoli + rice', () => {
    expect(dishOf(byName(P, 'Chicken Thighs'), byName(V, 'Broccoli'), byName(C, 'Jasmine Rice'))).toBe('Chicken Rice Bowl with charred broccoli');
  });
  it('uses the starch style template', () => {
    expect(dishOf(byName(P, 'Firm Tofu'), byName(V, 'Bell Peppers'), byName(C, 'Corn Tortillas'))).toBe('Tofu Tacos with blistered peppers');
    expect(dishOf(byName(P, 'Eggs'), byName(V, 'Zucchini'), byName(C, 'Sweet Potato'))).toBe('Roasted Sweet Potato & Egg with griddled zucchini');
  });
});

describe('weighting', () => {
  it('favours what is about to go off', () => {
    expect(weightOf(byName(P, 'Chicken Thighs'), PANTRY0, true)).toBe(6);
    expect(weightOf(byName(P, 'Salmon Fillet'), PANTRY0, true)).toBe(0.7);
    expect(weightOf(byName(P, 'Salmon Fillet'), PANTRY0, false)).toBe(1);
  });
  it('respects diets, falling back to the full list when filtered empty', () => {
    for (let i = 0; i < 50; i++) expect(P[weightedPick(P, 0, ['Vegetarian'], PANTRY0, true)].diet).toBe('veg');
    const meatOnly = [P[0], P[4]];
    expect(weightedPick(meatOnly, 0, ['Vegetarian'], PANTRY0, true, () => 0)).toBe(0);
  });
});

describe('planSpin', () => {
  const lens = [6, 6, 6];
  it('lands the chosen item on the payline, before and after the snap', () => {
    const chosen = [4, 2, 5];
    const plan = planSpin([0, 0, 0], [false, false, false], lens, k => chosen[k]);
    plan.idx.forEach((v, k) => expect(paylineOf(v, 6)).toBe(chosen[k]));
    expect(plan.dur).toEqual(['1.50s', '1.92s', '2.34s']);
    settledIdx(plan.target, lens).forEach((v, k) => expect(paylineOf(v, 6)).toBe(chosen[k]));
    // Strip is long enough: the lowest visible cell stays inside 10 repeats.
    plan.idx.forEach(v => expect(v + 3).toBeLessThan(60));
  });
  it('keeps locked reels on their payline item', () => {
    const plan = planSpin([3, 3, 3], [true, false, false], lens, () => 0);
    expect(plan.idx[0]).toBe(3);
    expect(plan.target[0]).toBe(4);
    expect(plan.dur[0]).toBe('0s');
  });
});
