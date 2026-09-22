/**
 * Mirrors the meal_planner_categories table. A category is which reel an ingredient sits on —
 * the machine has three columns, and every ingredient belongs to exactly one of them. The ids
 * are fixed in the table, so this list and the table describe the same enum; the app resolves
 * codes to ids at the boundary, the same way units do.
 */
export const CATEGORIES = [
  { code: 'protein', label: 'Protein' },
  { code: 'green', label: 'Green' },
  { code: 'grain', label: 'Grain' },
] as const;

export type CategoryCode = (typeof CATEGORIES)[number]['code'];

export const CATEGORY_CODES = CATEGORIES.map((c) => c.code) as readonly CategoryCode[];

export const DEFAULT_CATEGORY: CategoryCode = 'protein';

export function labelOf(code: CategoryCode): string {
  return CATEGORIES.find((c) => c.code === code)?.label ?? code;
}
