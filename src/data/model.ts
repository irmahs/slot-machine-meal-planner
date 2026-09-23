import type { CategoryCode, DishStyle, MethodCode, UnitCode } from './reference';

/**
 * The app's types. There is no ingredient list in the source: an ingredient is a
 * row you create on the Add ingredient screen, described with the fixed
 * vocabularies in reference.ts. Everything else points at one by name.
 */

export interface Ingredient {
  name: string;
  /** What a dish name calls it — "Chicken" for Chicken Thighs. Null uses `name`. */
  shortName: string | null;
  category: CategoryCode;
  /** A code from the kind table belonging to `category`. */
  kind: string;
  /** Starches only; the kind supplies the default and this is the answer. */
  glutenFree: boolean | null;
}

/** What is actually in the pantry. The reels are built from these alone. */
export interface PantryItem {
  name: string;
  qty: number;
  unit: UnitCode;
  /** The last day it is good for, as an ISO date. Days left are derived from it. */
  expiresOn: string;
}

export interface PlanEntry {
  id: string;
  cookedOn: string;
  dish: string;
  note: string;
  /** Kept as drawn, so the history keeps its icon even if the ingredient changes. */
  style: DishStyle;
  method: MethodCode | null;
  ingredients: string[];
}

export interface GroceryItem {
  name: string;
  qty: number;
  unit: UnitCode;
  note: string;
  acquired: boolean;
}
