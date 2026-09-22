import { DEFAULT_CATEGORY, type CategoryCode } from '../data/categories';
import type { GroceryItem, Ingredient, PantryItem, PlanEntry } from '../data/model';
import { DEFAULT_UNIT, type UnitCode } from '../data/units';
import { supabase } from './supabase/client';

export interface Snapshot {
  catalogue: Ingredient[];
  pantry: PantryItem[];
  plan: PlanEntry[];
  grocery: GroceryItem[];
}

export const EMPTY: Snapshot = { catalogue: [], pantry: [], plan: [], grocery: [] };

interface IngredientRow {
  id: string;
  name: string;
  id_category: number | null;
}

interface EnumRow {
  id: number;
  code: string;
}

const UNITS = 'meal_planner_units';
const CATEGORIES = 'meal_planner_categories';
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

/**
 * Units and categories are shared reference data that never change mid-session, so each is read
 * once and kept. A failed read clears the cache rather than poisoning the rest of the session.
 */
const enums = new Map<string, Promise<EnumRow[]>>();

function enumRows(table: string): Promise<EnumRow[]> {
  const cached = enums.get(table);
  if (cached) return cached;

  const pending = (async () => {
    const result = await client().from(table).select('id, code').returns<EnumRow[]>();
    if (result.error) {
      enums.delete(table);
      throw result.error;
    }
    return result.data ?? [];
  })();
  enums.set(table, pending);
  return pending;
}

async function idsByCode<T extends string>(table: string): Promise<Map<T, number>> {
  return new Map((await enumRows(table)).map((row) => [row.code as T, row.id]));
}

async function codesById<T extends string>(table: string): Promise<Map<number, T>> {
  return new Map((await enumRows(table)).map((row) => [row.id, row.code as T]));
}

/**
 * Ingredient names are the app's identity for a thing; the tables key on ingredient ids. This
 * resolves one to the other for ingredients that already exist. Creating one is a deliberate act
 * in the app, so the catalogue diff at the top of writeChanges is the only thing that inserts.
 */
async function ingredientIds(userId: string, names: string[]): Promise<Map<string, string>> {
  const wanted = [...new Set(names)];
  if (!wanted.length) return new Map();

  const rows = await client()
    .from(INGREDIENTS)
    .select('id, name, id_category')
    .eq('user_id', userId)
    .in('name', wanted)
    .returns<IngredientRow[]>();
  orThrow(rows);

  return new Map((rows.data ?? []).map((row) => [row.name, row.id]));
}

/** Everything the signed-in user has stored. A brand-new account comes back empty, not null. */
export async function loadSnapshot(userId: string): Promise<Snapshot> {
  const db = client();
  const [unitCode, categoryCode, ingredients, pantry, history, links, list] = await Promise.all([
    codesById<UnitCode>(UNITS),
    codesById<CategoryCode>(CATEGORIES),
    db
      .from(INGREDIENTS)
      .select('id, name, id_category')
      .eq('user_id', userId)
      .order('name')
      .returns<IngredientRow[]>(),
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

  const rows = ingredients.data ?? [];
  const nameOf = new Map(rows.map((row) => [row.id, row.name]));
  const catalogue: Ingredient[] = rows.map((row) => ({
    name: row.name,
    category: (row.id_category ? categoryCode.get(row.id_category) : null) ?? DEFAULT_CATEGORY,
  }));
  const categoryOf = new Map(catalogue.map((i) => [i.name, i.category]));

  const linksByMeal = new Map<string, string[]>();
  for (const link of links.data ?? []) {
    const name = nameOf.get(link.id_ingredient);
    if (!name) continue;
    linksByMeal.set(link.id_history, [...(linksByMeal.get(link.id_history) ?? []), name]);
  }

  return {
    catalogue,
    pantry: (pantry.data ?? []).flatMap((row) => {
      const name = nameOf.get(row.id_ingredient);
      return name
        ? [
            {
              name,
              category: categoryOf.get(name) ?? DEFAULT_CATEGORY,
              expiresOn: row.date_expiration,
              qty: Number(row.quantity),
              unit: unitCode.get(row.id_unit) ?? DEFAULT_UNIT,
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
              category: categoryOf.get(name) ?? DEFAULT_CATEGORY,
              qty: Number(row.quantity),
              unit: unitCode.get(row.id_unit) ?? DEFAULT_UNIT,
              acquired: row.acquired,
            },
          ]
        : [];
    }),
  };
}

/**
 * Writes only what changed between two snapshots. Diffing keeps the reducer as the single
 * source of truth — compound actions like "into the pot" need no bespoke persistence path.
 */
export async function writeChanges(userId: string, prev: Snapshot, next: Snapshot): Promise<void> {
  const db = client();

  // New ingredients go first: every other table points at an ingredient row, so it has to exist
  // before anything can reference it.
  const created = next.catalogue.filter((item) => !prev.catalogue.some((p) => p.name === item.name));
  if (created.length) {
    const categoryId = await idsByCode<CategoryCode>(CATEGORIES);
    orThrow(
      await db.from(INGREDIENTS).upsert(
        created.map((item) => ({
          user_id: userId,
          name: item.name,
          id_category: categoryId.get(item.category),
        })),
        { onConflict: 'user_id,name' },
      ),
    );
  }

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
    idsByCode<UnitCode>(UNITS),
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
  const ids = await ingredientIds(userId, names);
  if (!ids.size) return { error: null };
  return db.from(table).delete().eq('user_id', userId).in('id_ingredient', [...ids.values()]);
}

function removed<T>(prev: T[], next: T[], key: (item: T) => string): string[] {
  const kept = new Set(next.map(key));
  return prev.map(key).filter((id) => !kept.has(id));
}
