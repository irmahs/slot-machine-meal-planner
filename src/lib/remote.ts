import type { GroceryItem, PantryItem, PlanEntry } from '../data/seed';
import type { DietRule } from '../engine/reel';
import type { RepeatWindow } from '../state/planner';
import { addDaysISO, daysUntil } from './dates';
import { supabase } from './supabase';

export interface Rules {
  diets: DietRule[];
  repeatDays: RepeatWindow;
  weighting: boolean;
}

export interface Snapshot {
  pantry: PantryItem[];
  plan: PlanEntry[];
  grocery: GroceryItem[];
  rules: Rules;
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

/** Everything the signed-in user has stored, or null on a first sign-in with no rows yet. */
export async function loadSnapshot(userId: string): Promise<Snapshot | null> {
  const db = client();
  const [pantry, plan, grocery, rules] = await Promise.all([
    db.from('pantry_items').select('name, use_by, qty').eq('user_id', userId),
    db
      .from('cooked_entries')
      .select('id, dish, note, cooked_on')
      .eq('user_id', userId)
      .order('cooked_on', { ascending: false })
      .order('created_at', { ascending: false }),
    db
      .from('grocery_items')
      .select('name, why, got')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    db.from('reel_rules').select('diets, repeat_days, weighting').eq('user_id', userId).maybeSingle(),
  ]);

  const failed = [pantry, plan, grocery, rules].find((result) => result.error);
  if (failed?.error) throw failed.error;

  const empty = !pantry.data?.length && !plan.data?.length && !grocery.data?.length && !rules.data;
  if (empty) return null;

  return {
    pantry: (pantry.data ?? []).map((row) => ({
      name: row.name,
      days: daysUntil(row.use_by),
      qty: row.qty,
    })),
    plan: (plan.data ?? []).map((row) => ({
      id: row.id,
      dish: row.dish,
      sub: row.note,
      cookedOn: row.cooked_on,
    })),
    grocery: (grocery.data ?? []).map((row) => ({ name: row.name, why: row.why, got: row.got })),
    rules: rules.data
      ? {
          diets: rules.data.diets as DietRule[],
          repeatDays: rules.data.repeat_days as RepeatWindow,
          weighting: rules.data.weighting,
        }
      : { diets: [], repeatDays: 7, weighting: true },
  };
}

const EMPTY: Snapshot = {
  pantry: [],
  plan: [],
  grocery: [],
  rules: { diets: [], repeatDays: 7, weighting: true },
};

/** Pushes a whole snapshot up — used once, to give a new account its starting fridge. */
export function seedSnapshot(userId: string, snapshot: Snapshot): Promise<void> {
  return writeChanges(userId, EMPTY, snapshot);
}

/**
 * Writes only what changed between two snapshots. Diffing keeps the reducer as the single
 * source of truth — compound actions like "into the pot" need no bespoke persistence path.
 */
export async function writeChanges(userId: string, prev: Snapshot, next: Snapshot): Promise<void> {
  const db = client();
  const jobs: Array<PromiseLike<{ error: unknown }>> = [];

  const pantryUpserts = next.pantry.filter((item) => {
    const before = prev.pantry.find((p) => p.name === item.name);
    return !before || before.days !== item.days || before.qty !== item.qty;
  });
  if (pantryUpserts.length) {
    jobs.push(
      db.from('pantry_items').upsert(
        pantryUpserts.map((item) => ({
          user_id: userId,
          name: item.name,
          use_by: addDaysISO(item.days),
          qty: item.qty,
        })),
        { onConflict: 'user_id,name' },
      ),
    );
  }
  const pantryGone = removed(prev.pantry, next.pantry, (item) => item.name);
  if (pantryGone.length) {
    jobs.push(db.from('pantry_items').delete().eq('user_id', userId).in('name', pantryGone));
  }

  const planAdded = next.plan.filter((entry) => !prev.plan.some((p) => p.id === entry.id));
  if (planAdded.length) {
    jobs.push(
      db.from('cooked_entries').insert(
        planAdded.map((entry) => ({
          id: entry.id,
          user_id: userId,
          dish: entry.dish,
          note: entry.sub,
          cooked_on: entry.cookedOn,
        })),
      ),
    );
  }
  const planGone = removed(prev.plan, next.plan, (entry) => entry.id);
  if (planGone.length) {
    jobs.push(db.from('cooked_entries').delete().eq('user_id', userId).in('id', planGone));
  }

  const groceryUpserts = next.grocery.filter((item) => {
    const before = prev.grocery.find((g) => g.name === item.name);
    return !before || before.got !== item.got || before.why !== item.why;
  });
  if (groceryUpserts.length) {
    jobs.push(
      db.from('grocery_items').upsert(
        groceryUpserts.map((item) => ({
          user_id: userId,
          name: item.name,
          why: item.why,
          got: item.got,
        })),
        { onConflict: 'user_id,name' },
      ),
    );
  }
  const groceryGone = removed(prev.grocery, next.grocery, (item) => item.name);
  if (groceryGone.length) {
    jobs.push(db.from('grocery_items').delete().eq('user_id', userId).in('name', groceryGone));
  }

  if (
    prev.rules.repeatDays !== next.rules.repeatDays ||
    prev.rules.weighting !== next.rules.weighting ||
    prev.rules.diets.join() !== next.rules.diets.join()
  ) {
    jobs.push(
      db.from('reel_rules').upsert(
        {
          user_id: userId,
          diets: next.rules.diets,
          repeat_days: next.rules.repeatDays,
          weighting: next.rules.weighting,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      ),
    );
  }

  const results = await Promise.all(jobs);
  const failure = results.find((result) => result.error);
  if (failure) throw failure.error;
}

function removed<T>(prev: T[], next: T[], key: (item: T) => string): string[] {
  const kept = new Set(next.map(key));
  return prev.map(key).filter((id) => !kept.has(id));
}
