import { supabase } from "../lib/supabase/client";

/**
 * The app's vocabulary, loaded from the reference tables at startup. Nothing in
 * this file is a word the app uses — it only says what shape the rows have and
 * how to read them. Every label, kind, unit, method, diet rule and dish-name
 * template comes from the database, so rewording anything is an edit there.
 *
 * The three category codes are the one thing fixed here, because they are fixed
 * in the schema too: meal_planner_ingredients has one kind column per category,
 * so a fourth category would be a migration, not a row.
 */
export type CategoryCode = "protein" | "vegetable" | "starch";
const CATEGORY_CODES: ReadonlySet<string> = new Set<CategoryCode>([
  "protein",
  "vegetable",
  "starch",
]);

export interface Category {
  id: number;
  code: CategoryCode;
  label: string;
  position: number;
}
export interface ProteinKind {
  id: number;
  code: string;
  label: string;
  examples: string;
  diet: string;
  redMeat: boolean;
}
export interface VegetableKind {
  id: number;
  code: string;
  label: string;
  examples: string;
  word: string;
}
export interface StarchKind {
  id: number;
  code: string;
  label: string;
  examples: string;
  styleId: number;
  glutenFree: boolean;
}
export interface DishStyle {
  id: number;
  code: string;
  label: string;
  template: string;
}
export interface Unit {
  id: number;
  code: string;
  label: string;
  isCount: boolean;
  isDefault: boolean;
}
export interface Method {
  id: number;
  code: string;
  label: string;
  phrase: string;
}
export interface DietRule {
  id: number;
  code: string;
  label: string;
  excludesDiets: string[];
  excludesRedMeat: boolean;
  requiresGlutenFree: boolean;
}

export interface Vocab {
  /** In reel order, left to right. */
  categories: Category[];
  proteinKinds: ProteinKind[];
  vegetableKinds: VegetableKind[];
  starchKinds: StarchKind[];
  dishStyles: DishStyle[];
  units: Unit[];
  methods: Method[];
  dietRules: DietRule[];
}

export const EMPTY_VOCAB: Vocab = {
  categories: [],
  proteinKinds: [],
  vegetableKinds: [],
  starchKinds: [],
  dishStyles: [],
  units: [],
  methods: [],
  dietRules: [],
};

/** The reference tables as PostgREST returns them, keyed by table name. */
export type RawVocab = Record<
  (typeof TABLES)[number],
  Array<Record<string, unknown>>
>;

const TABLES = [
  "meal_planner_categories",
  "meal_planner_protein_kinds",
  "meal_planner_vegetable_kinds",
  "meal_planner_starch_kinds",
  "meal_planner_dish_styles",
  "meal_planner_units",
  "meal_planner_cooking_methods",
  "meal_planner_diet_rules",
] as const;

/** Reads every reference table in parallel. Readable without signing in. */
export async function loadVocab(): Promise<Vocab> {
  if (!supabase) throw new Error("Supabase is not configured");
  const db = supabase;
  const results = await Promise.all(
    TABLES.map((table) =>
      db
        .from(table)
        .select("*")
        .order(table === "meal_planner_categories" ? "position" : "id")
    )
  );
  const raw = {} as RawVocab;
  results.forEach((result, i) => {
    if (result.error) throw result.error;
    raw[TABLES[i]] = (result.data ?? []) as Array<Record<string, unknown>>;
  });
  return toVocab(raw);
}

/** Turns raw rows into the app's shape. Separate from the fetch so it can be tested. */
export function toVocab(raw: RawVocab): Vocab {
  type Row = Record<string, unknown>;
  const rows = (table: (typeof TABLES)[number]): Row[] => raw[table] ?? [];

  return {
    categories: rows("meal_planner_categories")
      .filter((r) => CATEGORY_CODES.has(String(r.code)))
      .map((r) => ({
        code: r.code as CategoryCode,
        id: r.id as number,
        label: r.label as string,
        position: r.position as number,
      }))
      .sort((a, b) => a.position - b.position),
    proteinKinds: rows("meal_planner_protein_kinds").map((r) => ({
      code: r.code as string,
      diet: r.diet as string,
      examples: r.examples as string,
      id: r.id as number,
      label: r.label as string,
      redMeat: r.is_red_meat as boolean,
    })),
    vegetableKinds: rows("meal_planner_vegetable_kinds").map((r) => ({
      code: r.code as string,
      examples: r.examples as string,
      id: r.id as number,
      label: r.label as string,
      word: r.cooking_word as string,
    })),
    starchKinds: rows("meal_planner_starch_kinds").map((r) => ({
      code: r.code as string,
      examples: r.examples as string,
      glutenFree: r.gluten_free as boolean,
      id: r.id as number,
      label: r.label as string,
      styleId: r.id_dish_style as number,
    })),
    dishStyles: rows("meal_planner_dish_styles").map((r) => ({
      code: r.code as string,
      id: r.id as number,
      label: r.label as string,
      template: r.name_template as string,
    })),
    units: rows("meal_planner_units").map((r) => ({
      code: r.code as string,
      id: r.id as number,
      isCount: r.is_count as boolean,
      isDefault: r.is_default as boolean,
      label: r.label as string,
    })),
    methods: rows("meal_planner_cooking_methods").map((r) => ({
      code: r.code as string,
      id: r.id as number,
      label: r.label as string,
      phrase: r.phrase as string,
    })),
    dietRules: rows("meal_planner_diet_rules").map((r) => ({
      code: r.code as string,
      excludesDiets: (r.excludes_diets as string[]) ?? [],
      excludesRedMeat: r.excludes_red_meat as boolean,
      id: r.id as number,
      label: r.label as string,
      requiresGlutenFree: r.requires_gluten_free as boolean,
    })),
  };
}

// ── Reading it ───────────────────────────────────────────────────────────────

export const categoryCodes = (v: Vocab): CategoryCode[] =>
  v.categories.map((c) => c.code);

export const labelOfCategory = (v: Vocab, code: CategoryCode) =>
  v.categories.find((c) => c.code === code)?.label ?? "";

export const kindsFor = (v: Vocab, category: CategoryCode) =>
  category === "protein"
    ? v.proteinKinds
    : category === "vegetable"
      ? v.vegetableKinds
      : v.starchKinds;

export const defaultUnit = (v: Vocab): string =>
  (v.units.find((u) => u.isDefault) ?? v.units[0])?.code ?? "";

export const methodOf = (v: Vocab, code: string | null | undefined) =>
  code ? v.methods.find((m) => m.code === code) : undefined;

/** "×8" for a count, "600 g" for anything else — which is which is a column. */
export function formatQuantity(
  v: Vocab,
  quantity: number,
  unit: string
): string {
  return v.units.find((u) => u.code === unit)?.isCount
    ? `×${quantity}`
    : `${quantity} ${unit}`;
}
