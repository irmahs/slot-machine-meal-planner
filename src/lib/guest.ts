import { EMPTY, type Snapshot } from './remote';

/**
 * Guest mode: a tab you can look around in without an account. Everything lives
 * in sessionStorage, which is scoped to the one tab and cleared when it closes —
 * a reload keeps the basket, closing the tab loses it. Nothing reaches Supabase.
 */
const KEY = 'spin-supper:guest';

/**
 * A pantry to look around with, and the only ingredients named anywhere in the
 * source. A signed-in account never sees them: guest data is read from and
 * written to this tab alone.
 */
function sample(addDays: (days: number) => string): Snapshot {
  return {
    catalogue: [
      { name: 'Chicken Thighs', shortName: 'Chicken', category: 'protein', kind: 'poultry', glutenFree: null },
      { name: 'Firm Tofu', shortName: 'Tofu', category: 'protein', kind: 'plant', glutenFree: null },
      { name: 'Eggs', shortName: 'Egg', category: 'protein', kind: 'eggdairy', glutenFree: null },
      { name: 'Broccoli', shortName: null, category: 'vegetable', kind: 'brassica', glutenFree: null },
      { name: 'Baby Spinach', shortName: 'spinach', category: 'vegetable', kind: 'leafy', glutenFree: null },
      { name: 'Mushrooms', shortName: null, category: 'vegetable', kind: 'mushroom', glutenFree: null },
      { name: 'Jasmine Rice', shortName: 'Rice', category: 'starch', kind: 'grain', glutenFree: true },
      { name: 'Rice Noodles', shortName: 'Noodle', category: 'starch', kind: 'noodle', glutenFree: true },
      { name: 'Corn Tortillas', shortName: 'Tortilla', category: 'starch', kind: 'wraps', glutenFree: true },
    ],
    pantry: [
      { name: 'Chicken Thighs', qty: 600, unit: 'g', expiresOn: addDays(2) },
      { name: 'Eggs', qty: 8, unit: 'piece', expiresOn: addDays(9) },
      { name: 'Baby Spinach', qty: 1, unit: 'bag', expiresOn: addDays(1) },
      { name: 'Mushrooms', qty: 250, unit: 'g', expiresOn: addDays(4) },
      { name: 'Jasmine Rice', qty: 1.5, unit: 'kg', expiresOn: addDays(90) },
      { name: 'Corn Tortillas', qty: 10, unit: 'piece', expiresOn: addDays(12) },
    ],
    plan: [],
    grocery: [
      { name: 'Broccoli', qty: 1, unit: 'bunch', note: 'Drawn twice, never in stock', acquired: false },
    ],
    methodsOff: ['braise', 'slow_cook'],
  };
}

export const isGuest = () => read() !== null;

export function startGuest(addDays: (days: number) => string): Snapshot {
  const basket = sample(addDays);
  write(basket);
  return basket;
}

export const loadGuest = (): Snapshot => read() ?? EMPTY;
export const saveGuest = (snapshot: Snapshot) => write(snapshot);

export function endGuest(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Storage can be unavailable; losing guest data is the expected outcome.
  }
}

function read(): Snapshot | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

function write(snapshot: Snapshot): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // Private windows and full quotas both land here. The session still works in
    // memory; it just will not survive a reload, which guest mode allows for.
  }
}
