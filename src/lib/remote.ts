import type { GroceryItem, PantryItem, PlanEntry } from '../data/seed';
import { DEFAULT_UNIT, type UnitCode } from '../data/units';
import { supabase } from './supabase/client';

export interface Snapshot {
  pantry: PantryItem[];
  plan: PlanEntry[];
  grocery: GroceryItem[];
}

interface IngredientRow {
  id: string;
  name: string;
}

interface UnitRow {
  id: number;
  code: string;
}

const UNITS = 'meal_planner_units';
const INGREDIENTS = 'meal_planner_ingredients';
const PANTRY = 'meal_planner_pantry';
const HISTORY = 'meal_planner_history';
const HISTORY_INGREDIENTS = 'meal_planner_history_ingredients';
const SHOPPING_LIST = 'meal_planner_shopping_list';

function client() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

function orThrow(result: { error: unknown }): void {
  if (result.error) throw result.error;
}

/** The unit enum is shared reference data that never changes mid-session, so it is read once. */
let unitRows: Promise<UnitRow[]> | null = null;

function units(): Promise<UnitRow[]> {
  if (!unitRows) {
    unitRows = (async () => {
      const result = await client().from(UNITS).select('id, code').returns<UnitRow[]>();
      if (result.error) {
        unitRows = null; // a failed read should not poison the rest of the session
        throw result.error;
      }
      return result.data ?? [];
    })();
  }
  return unitRows;
}

async function unitIds(): Promise<Map<UnitCode, number>> {
  return new Map((await units()).map((row) => [row.code as UnitCode, row.id]));
}

async function unitCodes(): Promise<Map<number, UnitCode>> {
  return new Map((await units()).map((row) => [row.id, row.code as UnitCode]));
}

/**
 * Ingredient names are the app's identity for a thing; the tables key on ingredient ids. This
 * resolves one to the other, creating any name the user has not stored before.
 */
async function ingredientIds(userId: string, names: string[]): Promise<Map<string, string>> {
  const wanted = [...new Set(names)];
  if (!wanted.length) return new Map();

  const db = client();
  orThrow(
    await db.from(INGREDIENTS).upsert(
      wanted.map((name) => ({ user_id: userId, name })),
      { onConflict: 'user_id,name', ignoreDuplicates: true },
    ),
  );

  const rows = await db
    .from(INGREDIENTS)
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
  const [codeOf, ingredients, pantry, history, links, list] = await Promise.all([
    unitCodes(),
    db.from(INGREDIENTS).select('id, name').eq('user_id', userId).returns<IngredientRow[]>(),
    db
      .from(PANTRY)
      .select('id_ingredient, quantity, id_unit, date_expiration')
      .eq('user_id', userId)
      .returns<
        Array<{ id_ingredient: string; quantity: number; id_unit: number; date_expiration: string }>
      >(),
    db
      .from(HISTORY)
      .select('id, name_meal, note, date_cooked')
      .eq('user_id', userId)
      .order('date_cooked', { ascending: false })
      .order('created_at', { ascending: false })
      .returns<Array<{ id: string; name_meal: string; note: string; date_cooked: string }>>(),
    db
      .from(HISTORY_INGREDIENTS)
      .select('id_history, id_ingredient')
      .returns<Array<{ id_history: string; id_ingredient: string }>>(),
    db
      .from(SHOPPING_LIST)
      .select('id_ingredient, quantity, id_unit, acquired')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .returns<
        Array<{ id_ingredient: string; quantity: number; id_unit: number; acquired: boolean }>
      >(),
  ]);

  [ingredients, pantry, history, links, list].forEach(orThrow);

  if (!pantry.data?.length && !history.data?.length && !list.data?.length) return null;

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
      return name
        ? [
            {
              name,
              expiresOn: row.date_expiration,
              qty: Number(row.quantity),
              unit: codeOf.get(row.id_unit) ?? DEFAULT_UNIT,
            },
          ]
        : [];
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
      return name
        ? [
            {
              name,
              qty: Number(row.quantity),
              unit: codeOf.get(row.id_unit) ?? DEFAULT_UNIT,
              acquired: row.acquired,
            },
          ]
        : [];
    }),
  };
}

const EMPTY: Snapshot = { pantry: [], plan: [], grocery: [] };

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

  const pantryUpserts = next.pantry.filter((item) => {
    const before = prev.pantry.find((p) => p.name === item.name);
    return (
      !before ||
      before.expiresOn !== item.expiresOn ||
      before.qty !== item.qty ||
      before.unit !== item.unit
    );
  });
  const groceryUpserts = next.grocery.filter((item) => {
    const before = prev.grocery.find((g) => g.name === item.name);
    return (
      !before ||
      before.acquired !== item.acquired ||
      before.qty !== item.qty ||
      before.unit !== item.unit
    );
  });
  const planAdded = next.plan.filter((entry) => !prev.plan.some((p) => p.id === entry.id));

  const [ids, unitId] = await Promise.all([
    ingredientIds(userId, [
      ...pantryUpserts.map((item) => item.name),
      ...groceryUpserts.map((item) => item.name),
      ...planAdded.flatMap((entry) => entry.ingredients),
    ]),
    unitIds(),
  ]);

  if (pantryUpserts.length) {
    orThrow(
      await db.from(PANTRY).upsert(
        pantryUpserts.flatMap((item) => {
          const id = ids.get(item.name);
          return id
            ? [
                {
                  user_id: userId,
                  id_ingredient: id,
                  quantity: item.qty,
                  id_unit: unitId.get(item.unit),
                  date_expiration: item.expiresOn,
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
    orThrow(await deleteByIngredientName(userId, PANTRY, pantryGone));
  }

  if (planAdded.length) {
    orThrow(
      await db.from(HISTORY).insert(
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
        const id = ids.get(name);
        return id ? [{ id_history: entry.id, id_ingredient: id }] : [];
      }),
    );
    if (links.length) {
      orThrow(await db.from(HISTORY_INGREDIENTS).insert(links));
    }
  }

  const planGone = removed(prev.plan, next.plan, (entry) => entry.id);
  if (planGone.length) {
    orThrow(await db.from(HISTORY).delete().eq('user_id', userId).in('id', planGone));
  }

  if (groceryUpserts.length) {
    orThrow(
      await db.from(SHOPPING_LIST).upsert(
        groceryUpserts.flatMap((item) => {
          const id = ids.get(item.name);
          return id
            ? [
                {
                  user_id: userId,
                  id_ingredient: id,
                  quantity: item.qty,
                  id_unit: unitId.get(item.unit),
                  acquired: item.acquired,
                },
              ]
            : [];
        }),
        { onConflict: 'user_id,id_ingredient' },
      ),
    );
  }

  const groceryGone = removed(prev.grocery, next.grocery, (item) => item.name);
  if (groceryGone.length) {
    orThrow(await deleteByIngredientName(userId, SHOPPING_LIST, groceryGone));
  }
}

async function deleteByIngredientName(
  userId: string,
  table: typeof PANTRY | typeof SHOPPING_LIST,
  names: string[],
): Promise<{ error: unknown }> {
  const db = client();
  const rows = await db
    .from(INGREDIENTS)
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
