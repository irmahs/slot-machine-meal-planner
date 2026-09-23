import { describe, expect, it } from 'vitest';
import { FEATURES } from '../features';
import { createInitialState, plannerReducer, type PlannerState } from './planner';

/**
 * The cook action with history switched off: the draw clears and the use-by
 * dates move, but nothing is recorded. These assertions follow the flag, so
 * they keep meaning something when it is turned on.
 */
const drawn: PlannerState = {
  ...createInitialState(),
  catalogue: [
    { name: 'Chicken Thighs', shortName: 'Chicken', category: 'protein', kind: 'poultry', glutenFree: null },
    { name: 'Broccoli', shortName: null, category: 'vegetable', kind: 'brassica', glutenFree: null },
    { name: 'Jasmine Rice', shortName: 'Rice', category: 'starch', kind: 'grain', glutenFree: true },
  ],
  pantry: [
    { name: 'Chicken Thighs', qty: 600, unit: 'g', expiresOn: '2026-09-25' },
    { name: 'Broccoli', qty: 1, unit: 'bunch', expiresOn: '2026-09-28' },
    { name: 'Jasmine Rice', qty: 1.5, unit: 'kg', expiresOn: '2026-12-22' },
  ],
  picked: ['Chicken Thighs', 'Broccoli', 'Jasmine Rice'],
  method: 'air_fry',
};

describe('into the pot', () => {
  const after = plannerReducer(drawn, { type: 'dish/cook' });

  it('clears the draw either way', () => {
    expect(after.picked).toBeNull();
  });

  it('pushes the drawn items back without bringing any date forward', () => {
    const rice = after.pantry.find((p) => p.name === 'Jasmine Rice');
    const chicken = after.pantry.find((p) => p.name === 'Chicken Thighs');
    // December is further out than two weeks, so it is left alone.
    expect(rice?.expiresOn).toBe('2026-12-22');
    expect(chicken?.expiresOn).not.toBe('2026-09-25');
  });

  it('records the meal only when history is on', () => {
    if (FEATURES.history) {
      expect(after.plan).toHaveLength(1);
      expect(after.plan[0].dish).toBe('Air-fried Chicken Rice Bowl with charred broccoli');
      expect(after.screen).toBe('plan');
    } else {
      expect(after.plan).toHaveLength(0);
      expect(after.screen).toBe('spin');
      expect(after.flash).toContain('another two weeks');
    }
  });

  it('does nothing without a draw', () => {
    const state = { ...drawn, picked: null };
    expect(plannerReducer(state, { type: 'dish/cook' })).toBe(state);
  });
});
