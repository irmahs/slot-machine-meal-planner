import type { GroceryItem, PantryItem, PlanEntry } from '../data/seed';
import type { DietRule } from '../engine/reel';
import type { RepeatWindow } from '../state/planner';
import { addDaysISO, daysUntil } from './dates';
import { supabase } from './supabase/client';

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

interface IngredientRow {
  id: string;
  name: string;
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

function orThrow(result: { error: unknown }): void {
  if (result.error) throw result.error;
}

/**
 * Ingredient names are the app's identity for a thing; the tables key on ingredient ids. This
 * resolves one to the other, creating any name the user has not stored before.
 */
async function ingredientIds(userId: string, names: string[]): Promise<Map<string, string>> {
  const wanted = [...new Set(names)];
  if (!wanted.length) return new Map();

  const db = client();
  const inserted = await db
    .from('ingredients')
    .upsert(
      wanted.map((name) => ({ user_id: userId, name })),
      { onConflict: 'user_id,name', ignoreDuplicates: true },
    );
  orThrow(inserted);

  const rows = await db
    .from('ingredients')
    .select('id, name')
    .eq('user_id', userId)
    .in('name', wanted)
    .returns<IngredientRow[]>();
  orThrow(rows);

  return new Map((rows.data ?? []).map((row) => [row.name, row.id]));
}

/** Everything the signed-in user has stored, or null on a first sign-in with no rows yet. */
export async function loadSnapshot(userId: string): Promise<Snapshot | null> {
  const db = client();
  const [ingredients, pantry, history, links, list, rules] = await Promise.all([
    db.from('ingredients').select('id, name').eq('user_id', userId).returns<IngredientRow[]>(),
    db
      .from('pantry')
      .select('id_ingredient, quantity, date_expiration')
      .eq('user_id', userId)
      .returns<Array<{ id_ingredient: string; quantity: string; date_expiration: string }>>(),
    db
      .from('meal_planner_history')
      .select('id, name_meal, note, date_cooked')
      .eq('user_id', userId)
      .order('date_cooked', { ascending: false })
      .order('created_at', { ascending: false })
      .returns<Array<{ id: string; name_meal: string; note: string; date_cooked: string }>>(),
    db
      .from('meal_planner_history_ingredients')
      .select('id_history, id_ingredient')
      .returns<Array<{ id_history: string; id_ingredient: string }>>(),
    db
      .from('shoppinglist')
      .select('id_ingredient, why, got')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .returns<Array<{ id_ingredient: string; why: string; got: boolean }>>(),
    db
      .from('reel_rules')
      .select('diets, repeat_days, weighting')
      .eq('user_id', userId)
      .maybeSingle()
      .returns<{ diets: string[]; repeat_days: number; weighting: boolean } | null>(),
  ]);

  [ingredients, pantry, history, links, list, rules].forEach(orThrow);

  if (!pantry.data?.length && !history.data?.length && !list.data?.length && !rules.data) {
    return null;
  }

  const nameOf = new Map((ingredients.data ?? []).map((row) => [row.id, row.name]));
  const linksByMeal = new Map<string, string[]>();
  for (const link of links.data ?? []) {
    const name = nameOf.get(link.id_ingredient);
    if (!name) continue;
    linksByMeal.set(link.id_history, [...(linksByMeal.get(link.id_history) ?? []), name]);
  }

  return {
    pantry: (pantry.data ?? []).flatMap((row) => {
      const name = nameOf.get(row.id_ingredient);
      return name ? [{ name, days: daysUntil(row.date_expiration), qty: row.quantity }] : [];
    }),
    plan: (history.data ?? []).map((row) => ({
      id: row.id,
      dish: row.name_meal,
      sub: row.note,
      cookedOn: row.date_cooked,
      ingredients: linksByMeal.get(row.id) ?? [],
    })),
    grocery: (list.data ?? []).flatMap((row) => {
      const name = nameOf.get(row.id_ingredient);
      return name ? [{ name, why: row.why, got: row.got }] : [];
    }),
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
export async function seedSnapshot(userId: string, snapshot: Snapshot): Promise<void> {
  await writeChanges(userId, EMPTY, snapshot);
  // The defaults match EMPTY, so the diff above skips them; a new account still wants the row.
  await upsertRules(userId, snapshot.rules);
}

function upsertRules(userId: string, rules: Rules): PromiseLike<{ error: unknown }> {
  return client()
    .from('reel_rules')
    .upsert(
      {
        user_id: userId,
        diets: rules.diets,
        repeat_days: rules.repeatDays,
        weighting: rules.weighting,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
}

/**
 * Writes only what changed between two snapshots. Diffing keeps the reducer as the single
 * source of truth — compound actions like "into the pot" need no bespoke persistence path.
 */
export async function writeChanges(userId: string, prev: Snapshot, next: Snapshot): Promise<void> {
  const db = client();

  const pantryUpserts = next.pantry.filter((item) => {
    const before = prev.pantry.find((p) => p.name === item.name);
    return !before || before.days !== item.days || before.qty !== item.qty;
  });
  const groceryUpserts = next.grocery.filter((item) => {
    const before = prev.grocery.find((g) => g.name === item.name);
    return !before || before.got !== item.got || before.why !== item.why;
  });
  const planAdded = next.plan.filter((entry) => !prev.plan.some((p) => p.id === entry.id));

  const ids = await ingredientIds(userId, [
    ...pantryUpserts.map((item) => item.name),
    ...groceryUpserts.map((item) => item.name),
    ...planAdded.flatMap((entry) => entry.ingredients),
  ]);
  const idOf = (name: string): string | undefined => ids.get(name);

  if (pantryUpserts.length) {
    orThrow(
      await db.from('pantry').upsert(
        pantryUpserts.flatMap((item) => {
          const id = idOf(item.name);
          return id
            ? [
                {
                  user_id: userId,
                  id_ingredient: id,
                  quantity: item.qty,
                  date_expiration: addDaysISO(item.days),
                },
              ]
            : [];
        }),
        { onConflict: 'user_id,id_ingredient' },
      ),
    );
  }

  const pantryGone = removed(prev.pantry, next.pantry, (item) => item.name);
  if (pantryGone.length) {
    orThrow(await deleteByIngredientName(userId, 'pantry', pantryGone));
  }

  if (planAdded.length) {
    orThrow(
      await db.from('meal_planner_history').insert(
        planAdded.map((entry) => ({
          id: entry.id,
          user_id: userId,
          name_meal: entry.dish,
          note: entry.sub,
          date_cooked: entry.cookedOn,
        })),
      ),
    );
    const links = planAdded.flatMap((entry) =>
      entry.ingredients.flatMap((name) => {
        const id = idOf(name);
        return id ? [{ id_history: entry.id, id_ingredient: id }] : [];
      }),
    );
    if (links.length) {
      orThrow(await db.from('meal_planner_history_ingredients').insert(links));
    }
  }

  const planGone = removed(prev.plan, next.plan, (entry) => entry.id);
  if (planGone.length) {
    orThrow(await db.from('meal_planner_history').delete().eq('user_id', userId).in('id', planGone));
  }

  if (groceryUpserts.length) {
    orThrow(
      await db.from('shoppinglist').upsert(
        groceryUpserts.flatMap((item) => {
          const id = idOf(item.name);
          return id ? [{ user_id: userId, id_ingredient: id, why: item.why, got: item.got }] : [];
        }),
        { onConflict: 'user_id,id_ingredient' },
      ),
    );
  }

  const groceryGone = removed(prev.grocery, next.grocery, (item) => item.name);
  if (groceryGone.length) {
    orThrow(await deleteByIngredientName(userId, 'shoppinglist', groceryGone));
  }

  if (
    prev.rules.repeatDays !== next.rules.repeatDays ||
    prev.rules.weighting !== next.rules.weighting ||
    prev.rules.diets.join() !== next.rules.diets.join()
  ) {
    orThrow(await upsertRules(userId, next.rules));
  }
}

async function deleteByIngredientName(
  userId: string,
  table: 'pantry' | 'shoppinglist',
  names: string[],
): Promise<{ error: unknown }> {
  const db = client();
  const rows = await db
    .from('ingredients')
    .select('id, name')
    .eq('user_id', userId)
    .in('name', names)
    .returns<IngredientRow[]>();
  orThrow(rows);

  const ids = (rows.data ?? []).map((row) => row.id);
  if (!ids.length) return { error: null };
  return db.from(table).delete().eq('user_id', userId).in('id_ingredient', ids);
}

function removed<T>(prev: T[], next: T[], key: (item: T) => string): string[] {
  const kept = new Set(next.map(key));
  return prev.map(key).filter((id) => !kept.has(id));
}
