/**
 * Mirrors the meal_planner_units table. The ids are fixed there, so this list and the table
 * describe the same enum; the app resolves codes to ids through the table at the boundary.
 */
export const UNITS = [
  { code: 'piece', label: 'pieces' },
  { code: 'g', label: 'grams' },
  { code: 'kg', label: 'kilograms' },
  { code: 'ml', label: 'millilitres' },
  { code: 'l', label: 'litres' },
  { code: 'bag', label: 'bags' },
  { code: 'block', label: 'blocks' },
  { code: 'pack', label: 'packs' },
  { code: 'bunch', label: 'bunches' },
  { code: 'can', label: 'cans' },
] as const;

export type UnitCode = (typeof UNITS)[number]['code'];

export const DEFAULT_UNIT: UnitCode = 'piece';

/** "600 g", "1 bag", and a bare count as "×8" — a unit-less number reads like a date otherwise. */
export function formatQuantity(quantity: number, unit: UnitCode): string {
  return unit === 'piece' ? `×${quantity}` : `${quantity} ${unit}`;
}
