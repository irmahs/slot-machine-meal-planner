import { EMPTY, type Snapshot } from './remote';

/**
 * Guest mode: a tab you can look around in without an account. It starts empty —
 * there are no ingredients in the app's source to start it with — and lives in
 * sessionStorage, which is scoped to the one tab and cleared when it closes. A
 * reload keeps the pantry; closing the tab loses it. Nothing reaches your rows in
 * Supabase; the vocabulary is still read from there, as it is for everyone.
 */
const KEY = 'spin-supper:guest';

export const isGuest = () => read() !== null;

export function startGuest(): void {
  write(EMPTY);
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
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot;
    // An older tab may hold ingredients from before methods could be ticked.
    parsed.catalogue = parsed.catalogue.map((i) => ({ ...i, methods: i.methods ?? [] }));
    return parsed;
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
