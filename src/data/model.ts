import type { CategoryCode } from './categories';
import type { UnitCode } from './units';

/**
 * The app's types. There is no ingredient catalogue in the source — the reels are built from
 * what is in the fridge, and the fridge is built from ingredients you create. Nothing about a
 * specific ingredient is known ahead of time.
 */

/** A row of your own ingredient list. The category is set once, here, and is what puts the
 *  ingredient on a reel; everything else points at the ingredient by name. */
export interface Ingredient {
  name: string;
  category: CategoryCode;
}

export interface PantryItem {
  name: string;
  /**
   * Copied from the ingredient when the item is stocked, so the reels and the rows can read a
   * category without carrying the whole catalogue around. The stored truth is the id_category
   * column on the ingredient row; this is a projection of it.
   */
  category: CategoryCode;
  /** The last day it is good for, as an ISO date. Days remaining are derived from it. */
  expiresOn: string;
  qty: number;
  unit: UnitCode;
}

export interface PlanEntry {
  id: string;
  /** ISO date; the day badge label is derived from it so "Tonight" stops being tonight. */
  cookedOn: string;
  dish: string;
  sub: string;
  /** The picks the dish was drawn from. */
  ingredients: string[];
}

export interface GroceryItem {
  name: string;
  category: CategoryCode;
  qty: number;
  unit: UnitCode;
  acquired: boolean;
}
