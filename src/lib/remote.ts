import type { GroceryItem, Ingredient, PantryItem, PlanEntry } from '../data/model';
import {
  DEFAULT_UNIT,
  METHODS,
  PROTEIN_KINDS,
  STARCH_KINDS,
  UNITS,
  VEGETABLE_KINDS,
  type CategoryCode,
  type DishStyle,
  type MethodCode,
  type UnitCode,
} from '../data/reference';
import { supabase } from './supabase/client';

export interface Snapshot {
  catalogue: Ingredient[];
  pantry: PantryItem[];
  plan: PlanEntry[];
  grocery: GroceryItem[];
  methodsOff: MethodCode[];
}

export const EMPTY: Snapshot = {
  catalogue: [],
  pantry: [],
  plan: [],
  grocery: [],
  methodsOff: [],
};

const INGREDIENTS = 'meal_planner_ingredients';
const PANTRY = 'meal_planner_pantry';
const HISTORY = 'meal_planner_history';
const HISTORY_INGREDIENTS = 'meal_planner_history_ingredients';
const SHOPPING_LIST = 'meal_planner_shopping_list';
const METHOD_SETTINGS = 'meal_planner_method_settings';

/**
 * The reference tables are seeded by the migration with ids written out, and
 * src/data/reference.ts mirrors them, so codes resolve to ids here without a
 * round trip. The two must be changed together.
 */
const CATEGORY_ID: Record<CategoryCode, number> = { protein: 1, vegetable: 2, starch: 3 };
const CATEGORY_CODE_BY_ID = new Map<number, CategoryCode>(
  Object.entries(CATEGORY_ID).map(([code, id]) => [id, code as CategoryCode]),
);
const unitId = new Map<UnitCode, number>(UNITS.map((u) => [u.code, u.id]));
const unitCode = new Map<number, UnitCode>(UNITS.map((u) => [u.id, u.code]));
const methodId = new Map<MethodCode, number>(METHODS.map((m) => [m.code, m.id]));
const methodCode = new Map<number, MethodCode>(METHODS.map((m) => [m.id, m.code]));
const proteinId = new Map(PROTEIN_KINDS.map((k) => [k.code, k.id]));
const proteinCode = new Map(PROTEIN_KINDS.map((k) => [k.id, k.code]));
const vegetableId = new Map(VEGETABLE_KINDS.map((k) => [k.code, k.id]));
const vegetableCode = new Map(VEGETABLE_KINDS.map((k) => [k.id, k.code]));
const starchId = new Map(STARCH_KINDS.map((k) => [k.code, k.id]));
const starchCode = new Map(STARCH_KINDS.map((k) => [k.id, k.code]));

interface IngredientRow {
  id: string;
  name: string;
  short_name: string | null;
  id_category: number;
  id_protein_kind: number | null;
  id_vegetable_kind: number | null;
  id_starch_kind: number | null;
  gluten_free: boolean | null;
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

function orThrow(result: { error: unknown }): void {
  if (result.error) throw result.error;
}

/** The three kind columns, only one of which is ever set. */
function kindColumns(item: Ingredient) {
  return {
    id_protein_kind: item.category === 'protein' ? (proteinId.get(item.kind) ?? null) : null,
    id_vegetable_kind: item.category === 'vegetable' ? (vegetableId.get(item.kind) ?? null) : null,
    id_starch_kind: item.category === 'starch' ? (starchId.get(item.kind) ?? null) : null,
  };
}

function toIngredient(row: IngredientRow): Ingredient {
  const category = CATEGORY_CODE_BY_ID.get(row.id_category) ?? 'protein';
  const kind =
    (category === 'protein' && row.id_protein_kind ? proteinCode.get(row.id_protein_kind) : null) ??
    (category === 'vegetable' && row.id_vegetable_kind
      ? vegetableCode.get(row.id_vegetable_kind)
      : null) ??
    (category === 'starch' && row.id_starch_kind ? starchCode.get(row.id_starch_kind) : null) ??
    '';
  return { name: row.name, shortName: row.short_name, category, kind, glutenFree: row.gluten_free };
}

/** Resolves the names the app works in to the ids the tables key on. */
async function ingredientIds(userId: string, names: string[]): Promise<Map<string, string>> {
  const wanted = [...new Set(names)];
  if (!wanted.length) return new Map();

  const rows = await client()
    .from(INGREDIENTS)
    .select('id, name')
    .eq('user_id', userId)
    .in('name', wanted)
    .returns<Array<{ id: string; name: string }>>();
  orThrow(rows);
  return new Map((rows.data ?? []).map((row) => [row.name, row.id]));
}

/** Everything the signed-in account has stored. A new account comes back empty. */
export async function loadSnapshot(userId: string): Promise<Snapshot> {
  const db = client();
  const [ingredients, pantry, history, links, list, methods] = await Promise.all([
    db
      .from(INGREDIENTS)
      .select('id, name, short_name, id_category, id_protein_kind, id_vegetable_kind, id_starch_kind, gluten_free')
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
      .select('id, name_meal, note, dish_style, id_method, date_cooked')
      .eq('user_id', userId)
      .order('date_cooked', { ascending: false })
      .order('created_at', { ascending: false })
      .returns<
        Array<{
          id: string;
          name_meal: string;
          note: string;
          dish_style: DishStyle;
          id_method: number | null;
          date_cooked: string;
        }>
      >(),
    db
      .from(HISTORY_INGREDIENTS)
      .select('id_history, id_ingredient')
      .returns<Array<{ id_history: string; id_ingredient: string }>>(),
    db
      .from(SHOPPING_LIST)
      .select('id_ingredient, quantity, id_unit, note, acquired')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .returns<
        Array<{
          id_ingredient: string;
          quantity: number;
          id_unit: number;
          note: string;
          acquired: boolean;
        }>
      >(),
    db
      .from(METHOD_SETTINGS)
      .select('id_method, enabled')
      .eq('user_id', userId)
      .returns<Array<{ id_method: number; enabled: boolean }>>(),
  ]);

  [ingredients, pantry, history, links, list, methods].forEach(orThrow);

  const rows = ingredients.data ?? [];
  const nameOf = new Map(rows.map((row) => [row.id, row.name]));

  const linksByMeal = new Map<string, string[]>();
  for (const link of links.data ?? []) {
    const name = nameOf.get(link.id_ingredient);
    if (!name) continue;
    linksByMeal.set(link.id_history, [...(linksByMeal.get(link.id_history) ?? []), name]);
  }

  return {
    catalogue: rows.map(toIngredient),
    pantry: (pantry.data ?? []).flatMap((row) => {
      const name = nameOf.get(row.id_ingredient);
      return name
        ? [
            {
              name,
              qty: Number(row.quantity),
              unit: unitCode.get(row.id_unit) ?? DEFAULT_UNIT,
              expiresOn: row.date_expiration,
            },
          ]
        : [];
    }),
    plan: (history.data ?? []).map((row) => ({
      id: row.id,
      dish: row.name_meal,
      note: row.note,
      style: row.dish_style,
      method: row.id_method ? (methodCode.get(row.id_method) ?? null) : null,
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
              unit: unitCode.get(row.id_unit) ?? DEFAULT_UNIT,
              note: row.note,
              acquired: row.acquired,
            },
          ]
        : [];
    }),
    methodsOff: (methods.data ?? [])
      .filter((row) => !row.enabled)
      .flatMap((row) => {
        const code = methodCode.get(row.id_method);
        return code ? [code] : [];
      }),
  };
}

/**
 * Writes only what changed between two snapshots. Diffing keeps the reducer as
 * the single source of truth — a compound action like "into the pot" needs no
 * persistence path of its own.
 */
export async function writeChanges(userId: string, prev: Snapshot, next: Snapshot): Promise<void> {
  const db = client();

  // Ingredients go first: every other table points at one, so it has to exist.
  const ingredientChanged = next.catalogue.filter((item) => {
    const before = prev.catalogue.find((p) => p.name === item.name);
    return (
      !before ||
      before.category !== item.category ||
      before.kind !== item.kind ||
      before.shortName !== item.shortName ||
      before.glutenFree !== item.glutenFree
    );
  });
  if (ingredientChanged.length) {
    orThrow(
      await db.from(INGREDIENTS).upsert(
        ingredientChanged.map((item) => ({
          user_id: userId,
          name: item.name,
          short_name: item.shortName,
          id_category: CATEGORY_ID[item.category],
          gluten_free: item.category === 'starch' ? item.glutenFree : null,
          ...kindColumns(item),
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
      before.unit !== item.unit ||
      before.note !== item.note
    );
  });
  const planAdded = next.plan.filter((entry) => !prev.plan.some((p) => p.id === entry.id));

  const ids = await ingredientIds(userId, [
    ...pantryUpserts.map((item) => item.name),
    ...groceryUpserts.map((item) => item.name),
    ...planAdded.flatMap((entry) => entry.ingredients),
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
  if (pantryGone.length) orThrow(await deleteByIngredientName(userId, PANTRY, pantryGone));

  if (planAdded.length) {
    orThrow(
      await db.from(HISTORY).insert(
        planAdded.map((entry) => ({
          id: entry.id,
          user_id: userId,
          name_meal: entry.dish,
          note: entry.note,
          dish_style: entry.style,
          id_method: entry.method ? (methodId.get(entry.method) ?? null) : null,
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
    if (links.length) orThrow(await db.from(HISTORY_INGREDIENTS).insert(links));
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
                  note: item.note,
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

  // A method setting row exists only for a method that is off, so switching one
  // back on deletes its row rather than storing enabled = true.
  const turnedOff = next.methodsOff.filter((code) => !prev.methodsOff.includes(code));
  const turnedOn = prev.methodsOff.filter((code) => !next.methodsOff.includes(code));
  if (turnedOff.length) {
    orThrow(
      await db.from(METHOD_SETTINGS).upsert(
        turnedOff.map((code) => ({ user_id: userId, id_method: methodId.get(code), enabled: false })),
        { onConflict: 'user_id,id_method' },
      ),
    );
  }
  if (turnedOn.length) {
    orThrow(
      await db
        .from(METHOD_SETTINGS)
        .delete()
        .eq('user_id', userId)
        .in('id_method', turnedOn.flatMap((code) => {
          const id = methodId.get(code);
          return id ? [id] : [];
        })),
    );
  }
}

async function deleteByIngredientName(
  userId: string,
  table: typeof PANTRY | typeof SHOPPING_LIST,
  names: string[],
): Promise<{ error: unknown }> {
  const ids = await ingredientIds(userId, names);
  if (!ids.size) return { error: null };
  return client().from(table).delete().eq('user_id', userId).in('id_ingredient', [...ids.values()]);
}

function removed<T>(prev: T[], next: T[], key: (item: T) => string): string[] {
  const kept = new Set(next.map(key));
  return prev.map(key).filter((id) => !kept.has(id));
}
