import type { Snapshot } from './remote';
import { EMPTY } from './remote';

/**
 * Guest mode: a tab you can look around in without an account. Everything lives in
 * sessionStorage, which is scoped to the one tab and cleared when it closes — a reload keeps
 * your basket, closing the tab loses it. Nothing here ever reaches Supabase.
 */
const KEY = 'spin-supper:guest';

/**
 * A basket to look around with, and the only ingredients written into the source anywhere. A
 * signed-in account never sees them: guest data is read from and written to this tab alone.
 */
const SAMPLE: Snapshot = {
  catalogue: [
    { name: 'Chicken Thighs', category: 'protein' },
    { name: 'Chickpeas', category: 'protein' },
    { name: 'Eggs', category: 'protein' },
    { name: 'Broccoli', category: 'green' },
    { name: 'Baby Spinach', category: 'green' },
    { name: 'Mushrooms', category: 'green' },
    { name: 'Jasmine Rice', category: 'grain' },
    { name: 'Rice Noodles', category: 'grain' },
    { name: 'Sweet Potato', category: 'grain' },
  ],
  pantry: [],
  plan: [],
  grocery: [],
};

/** Dates are relative to the day you start looking around, so nothing is born already expired. */
function sampleBasket(addDays: (days: number) => string): Snapshot {
  return {
    ...SAMPLE,
    pantry: [
      { name: 'Chicken Thighs', category: 'protein', expiresOn: addDays(2), qty: 600, unit: 'g' },
      { name: 'Eggs', category: 'protein', expiresOn: addDays(12), qty: 6, unit: 'piece' },
      { name: 'Baby Spinach', category: 'green', expiresOn: addDays(1), qty: 1, unit: 'bag' },
      { name: 'Broccoli', category: 'green', expiresOn: addDays(5), qty: 1, unit: 'piece' },
      { name: 'Jasmine Rice', category: 'grain', expiresOn: addDays(90), qty: 1.5, unit: 'kg' },
      { name: 'Sweet Potato', category: 'grain', expiresOn: addDays(20), qty: 3, unit: 'piece' },
    ],
  };
}

export function isGuest(): boolean {
  return read() !== null;
}

export function startGuest(addDays: (days: number) => string): Snapshot {
  const basket = sampleBasket(addDays);
  write(basket);
  return basket;
}

export function loadGuest(): Snapshot {
  return read() ?? EMPTY;
}

export function saveGuest(snapshot: Snapshot): void {
  write(snapshot);
}

export function endGuest(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Storage can be unavailable or full; losing guest data is the expected outcome anyway.
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
    // Private windows and full quotas both land here. The session still works in memory; it
    // just will not survive a reload, which is within what guest mode promises.
  }
}
