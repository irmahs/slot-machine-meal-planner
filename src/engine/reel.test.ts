import { describe, expect, it } from 'vitest';
import type { Ingredient, PantryItem } from '../data/model';
import { addDaysISO } from '../lib/dates';
import {
  allowed,
  canSpin,
  dishName,
  emptyReels,
  ingredientOf,
  paylineOf,
  pickIndex,
  planSpin,
  reelsFrom,
  settledIdx,
  styleOf,
  weightOf,
  type PickContext,
  type Triple,
} from './reel';

const CATALOGUE: Ingredient[] = [
  { name: 'Chicken Thighs', shortName: 'Chicken', category: 'protein', kind: 'poultry', glutenFree: null },
  { name: 'Firm Tofu', shortName: 'Tofu', category: 'protein', kind: 'plant', glutenFree: null },
  { name: 'Ground Beef', shortName: 'Beef', category: 'protein', kind: 'red', glutenFree: null },
  { name: 'Salmon Fillet', shortName: 'Salmon', category: 'protein', kind: 'fish', glutenFree: null },
  { name: 'Broccoli', shortName: null, category: 'vegetable', kind: 'brassica', glutenFree: null },
  { name: 'Baby Spinach', shortName: 'spinach', category: 'vegetable', kind: 'leafy', glutenFree: null },
  { name: 'Jasmine Rice', shortName: 'Rice', category: 'starch', kind: 'grain', glutenFree: true },
  { name: 'Orzo', shortName: null, category: 'starch', kind: 'wholegrain', glutenFree: false },
  { name: 'Corn Tortillas', shortName: 'Tortilla', category: 'starch', kind: 'wraps', glutenFree: true },
];

const stock = (name: string, days: number): PantryItem => ({
  name,
  qty: 1,
  unit: 'piece',
  expiresOn: addDaysISO(days),
});

const PANTRY: PantryItem[] = [
  stock('Chicken Thighs', 2),
  stock('Firm Tofu', 6),
  stock('Ground Beef', 40),
  stock('Broccoli', 5),
  stock('Baby Spinach', 1),
  stock('Jasmine Rice', 90),
  stock('Orzo', 8),
];

const reels = reelsFrom(PANTRY, CATALOGUE);
const ctx: PickContext = { catalogue: CATALOGUE, diets: [], weighting: true };
const named = (name: string) => ingredientOf(CATALOGUE, name);

describe('reels come from the pantry', () => {
  it('slices what is stocked by the category of its ingredient', () => {
    expect(reels.map((r) => r.length)).toEqual([3, 2, 2]);
    expect(reels[2].map((i) => i.name).sort()).toEqual(['Jasmine Rice', 'Orzo']);
  });

  it('ignores an ingredient that is described but not stocked', () => {
    // Salmon, Corn Tortillas are in the catalogue and in no reel.
    const everything = reels.flat().map((i) => i.name);
    expect(everything).not.toContain('Salmon Fillet');
    expect(everything).not.toContain('Corn Tortillas');
  });

  it('puts the soonest to go off at the top of a column', () => {
    expect(reels[0].map((i) => i.name)).toEqual(['Chicken Thighs', 'Firm Tofu', 'Ground Beef']);
  });

  it('cannot draw from an empty pantry', () => {
    const none = reelsFrom([], CATALOGUE);
    expect(canSpin(none)).toBe(false);
    expect(emptyReels(none)).toEqual(['protein', 'vegetable', 'starch']);
  });

  it('names the reel holding the draw up', () => {
    const noStarch = reelsFrom(PANTRY.filter((p) => named(p.name)?.category !== 'starch'), CATALOGUE);
    expect(emptyReels(noStarch)).toEqual(['starch']);
    expect(canSpin(reels)).toBe(true);
  });
});

describe('diet rules read the kind', () => {
  it('keeps only plant and egg proteins for a vegetarian', () => {
    expect(allowed(named('Firm Tofu'), ['Vegetarian'])).toBe(true);
    expect(allowed(named('Chicken Thighs'), ['Vegetarian'])).toBe(false);
    expect(allowed(named('Salmon Fillet'), ['Vegetarian'])).toBe(false);
  });

  it('keeps fish but drops meat for a pescatarian', () => {
    expect(allowed(named('Salmon Fillet'), ['Pescatarian'])).toBe(true);
    expect(allowed(named('Chicken Thighs'), ['Pescatarian'])).toBe(false);
  });

  it('drops red meat by its kind, not by its name', () => {
    expect(allowed(named('Ground Beef'), ['No red meat'])).toBe(false);
    expect(allowed(named('Chicken Thighs'), ['No red meat'])).toBe(true);
  });

  it('goes by the ingredient answer for gluten, not the kind default', () => {
    expect(allowed(named('Jasmine Rice'), ['Gluten-free'])).toBe(true);
    expect(allowed(named('Orzo'), ['Gluten-free'])).toBe(false);
  });

  it('falls back to the unfiltered reel rather than failing to draw', () => {
    const impossible: PickContext = { ...ctx, diets: ['Vegetarian', 'Pescatarian'] };
    const meatOnly = [stock('Chicken Thighs', 2), stock('Ground Beef', 40)];
    expect(pickIndex(meatOnly, impossible)).toBeGreaterThanOrEqual(0);
  });
});

describe('weighting', () => {
  it('favours what is closest to going off', () => {
    expect(weightOf(stock('x', 2), true)).toBe(6);
    expect(weightOf(stock('x', 4), true)).toBe(3);
    expect(weightOf(stock('x', 6), true)).toBe(1.6);
    expect(weightOf(stock('x', 40), true)).toBe(1);
  });

  it('treats everything alike when weighting is off', () => {
    expect(weightOf(stock('x', 2), false)).toBe(1);
    expect(weightOf(stock('x', 40), false)).toBe(1);
  });

  it('leans towards the urgent item', () => {
    let urgent = 0;
    for (let r = 0; r < 600; r += 1) {
      if (reels[0][pickIndex(reels[0], ctx)].name === 'Chicken Thighs') urgent += 1;
    }
    expect(urgent).toBeGreaterThan(300);
  });
});

describe('the spin', () => {
  const idx: Triple<number> = [0, 0, 0];

  it('leaves every target on the payline once the strip settles', () => {
    const plan = planSpin(idx, [false, false, false], reels, ctx);
    const rest = settledIdx(plan.target, reels);
    plan.target.forEach((t, k) => expect(paylineOf(rest[k], reels[k].length)).toBe(t));
  });

  it('staggers the reels', () => {
    const plan = planSpin(idx, [false, false, false], reels, ctx);
    expect(plan.dur).toEqual(['1.50s', '1.92s', '2.34s']);
  });

  it('holds a locked reel on whatever is already on its payline', () => {
    const held: Triple<number> = [2, 0, 0];
    const plan = planSpin(held, [true, false, false], reels, ctx);
    expect(plan.target[0]).toBe(paylineOf(2, reels[0].length));
    expect(plan.dur[0]).toBe('0s');
  });

  it('leaves an empty reel alone rather than dividing by nothing', () => {
    const noVeg = reelsFrom(PANTRY.filter((p) => named(p.name)?.category !== 'vegetable'), CATALOGUE);
    const plan = planSpin(idx, [false, false, false], noVeg, ctx);
    expect(plan.target[1]).toBe(0);
    expect(Number.isNaN(plan.idx[1])).toBe(false);
  });
});

describe('dish naming', () => {
  const picks = (p: string, v: string, s: string) =>
    [named(p), named(v), named(s)] as Triple<Ingredient | undefined>;

  it('puts the method participle in front and the vegetable word behind', () => {
    expect(dishName(picks('Chicken Thighs', 'Broccoli', 'Jasmine Rice'), 'air_fry')).toBe(
      'Air-fried Chicken Rice Bowl with charred broccoli',
    );
  });

  it('uses the short name, so Chicken Thighs cooks as Chicken', () => {
    expect(dishName(picks('Chicken Thighs', 'Baby Spinach', 'Jasmine Rice'), 'bake')).toBe(
      'Baked Chicken Rice Bowl with wilted spinach',
    );
  });

  it('takes the shape of the dish from the starch kind', () => {
    expect(styleOf(named('Corn Tortillas'))).toBe('tacos');
    expect(dishName(picks('Firm Tofu', 'Broccoli', 'Corn Tortillas'), 'grill')).toBe(
      'Grilled Tofu Tacos with charred broccoli',
    );
    expect(dishName(picks('Salmon Fillet', 'Broccoli', 'Orzo'), null)).toBe(
      'Salmon & Orzo Salad with charred broccoli',
    );
  });

  it('drops the participle when every method is switched off', () => {
    expect(dishName(picks('Chicken Thighs', 'Broccoli', 'Jasmine Rice'), null)).toBe(
      'Chicken Rice Bowl with charred broccoli',
    );
  });

  it('names what it has when a reel drew nothing', () => {
    expect(dishName([named('Chicken Thighs'), undefined, undefined], 'bake')).toBe('Chicken Thighs');
    expect(dishName([undefined, undefined, undefined], null)).toBe('Nothing drawn yet');
  });
});
