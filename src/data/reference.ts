/**
 * Mirrors the reference tables in the database. Every list here has a table
 * behind it — meal_planner_categories, the three kind tables, meal_planner_units
 * and meal_planner_cooking_methods — and the ids match, so the app can talk in
 * codes and resolve to ids at the boundary in src/lib/remote.ts.
 *
 * Nothing about a particular ingredient lives here. An ingredient is a row you
 * create; these are the fixed vocabularies it is described with.
 */

export type CategoryCode = 'protein' | 'vegetable' | 'starch';
export type Diet = 'meat' | 'fish' | 'veg';
export type DishStyle = 'bowl' | 'noodles' | 'salad' | 'tacos' | 'skillet' | 'roast';
export type UnitCode = (typeof UNITS)[number]['code'];
export type MethodCode = (typeof METHODS)[number]['code'];

export interface Category { id: number; code: CategoryCode; label: string }
export interface ProteinKind { id: number; code: string; label: string; examples: string; diet: Diet; redMeat: boolean }
export interface VegetableKind { id: number; code: string; label: string; examples: string; word: string }
export interface StarchKind { id: number; code: string; label: string; examples: string; style: DishStyle; glutenFree: boolean }

export const CATEGORIES: Category[] = [
  { id: 1, code: 'protein', label: 'Protein' },
  { id: 2, code: 'vegetable', label: 'Vegetables' },
  { id: 3, code: 'starch', label: 'Starch' },
];

/** Left to right on the draw screen, and the order of a Triple everywhere. */
export const CATEGORY_CODES = CATEGORIES.map((c) => c.code);

export const PROTEIN_KINDS: ProteinKind[] = [
  { id: 1, code: 'red', label: 'Red meat', examples: 'Beef, lamb, goat', diet: 'meat', redMeat: true },
  { id: 2, code: 'white', label: 'White meat', examples: 'Pork, veal', diet: 'meat', redMeat: false },
  { id: 3, code: 'game', label: 'Game', examples: 'Venison, rabbit, wild boar, bison', diet: 'meat', redMeat: true },
  { id: 4, code: 'poultry', label: 'Poultry', examples: 'Chicken, turkey, duck', diet: 'meat', redMeat: false },
  { id: 5, code: 'fish', label: 'Fish', examples: 'Salmon, tuna, cod', diet: 'fish', redMeat: false },
  { id: 6, code: 'seafood', label: 'Seafood', examples: 'Prawns, mussels, squid', diet: 'fish', redMeat: false },
  { id: 7, code: 'eggdairy', label: 'Eggs & dairy', examples: 'Eggs, halloumi, paneer', diet: 'veg', redMeat: false },
  { id: 8, code: 'plant', label: 'Plant-based', examples: 'Tofu, tempeh, beans, lentils', diet: 'veg', redMeat: false },
];

export const VEGETABLE_KINDS: VegetableKind[] = [
  { id: 1, code: 'leafy', label: 'Leafy greens', examples: 'Spinach, kale, chard, lettuce', word: 'wilted' },
  { id: 2, code: 'brassica', label: 'Brassicas', examples: 'Broccoli, cauliflower, cabbage', word: 'charred' },
  { id: 3, code: 'root', label: 'Roots', examples: 'Carrot, beetroot, parsnip', word: 'roasted' },
  { id: 4, code: 'fruiting', label: 'Fruiting', examples: 'Peppers, tomato, zucchini, aubergine', word: 'blistered' },
  { id: 5, code: 'pods', label: 'Pods & legumes', examples: 'Green beans, peas, edamame', word: 'garlicky' },
  { id: 6, code: 'allium', label: 'Alliums', examples: 'Onion, leek, fennel', word: 'caramelised' },
  { id: 7, code: 'mushroom', label: 'Mushrooms', examples: 'Shiitake, oyster, chestnut', word: 'seared' },
];

export const STARCH_KINDS: StarchKind[] = [
  { id: 1, code: 'grain', label: 'Grains', examples: 'Rice, farro, quinoa, bulgur', style: 'bowl', glutenFree: true },
  { id: 2, code: 'noodle', label: 'Noodles', examples: 'Udon, rice noodles, soba', style: 'noodles', glutenFree: false },
  { id: 3, code: 'bread', label: 'Bread', examples: 'Sourdough, ciabatta, naan', style: 'skillet', glutenFree: false },
  { id: 4, code: 'wraps', label: 'Wraps', examples: 'Tortillas, pita, flatbread', style: 'tacos', glutenFree: false },
  { id: 5, code: 'tuber', label: 'Potatoes & roots', examples: 'Potato, sweet potato, polenta', style: 'roast', glutenFree: true },
  { id: 6, code: 'wholegrain', label: 'Whole grains', examples: 'Farro, quinoa, bulgur, couscous', style: 'salad', glutenFree: false },
];

export const UNITS = [
  { id: 1, code: 'piece', label: 'pieces' },
  { id: 2, code: 'g', label: 'grams' },
  { id: 3, code: 'kg', label: 'kilograms' },
  { id: 4, code: 'ml', label: 'millilitres' },
  { id: 5, code: 'l', label: 'litres' },
  { id: 6, code: 'serving', label: 'servings' },
  { id: 7, code: 'bag', label: 'bags' },
  { id: 8, code: 'block', label: 'blocks' },
  { id: 9, code: 'pack', label: 'packs' },
  { id: 10, code: 'bunch', label: 'bunches' },
  { id: 11, code: 'can', label: 'cans' },
  { id: 12, code: 'pot', label: 'pots' },
] as const;

export const DEFAULT_UNIT: UnitCode = 'piece';

/**
 * `phrase` is the past participle a dish name uses. It is stored rather than
 * derived because no rule turns "Air-fry" into "Air-fried" and "Steam" into
 * "Steamed" and "Slow-cook" into "Slow-cooked".
 */
export const METHODS = [
  { id: 1, code: 'roast', label: 'Roast', phrase: 'Roasted' },
  { id: 2, code: 'stir_fry', label: 'Stir-fry', phrase: 'Stir-fried' },
  { id: 3, code: 'pan_fry', label: 'Pan-fry', phrase: 'Pan-fried' },
  { id: 4, code: 'grill', label: 'Grill', phrase: 'Grilled' },
  { id: 5, code: 'braise', label: 'Braise', phrase: 'Braised' },
  { id: 6, code: 'steam', label: 'Steam', phrase: 'Steamed' },
  { id: 7, code: 'bake', label: 'Bake', phrase: 'Baked' },
  { id: 8, code: 'air_fry', label: 'Air-fry', phrase: 'Air-fried' },
  { id: 9, code: 'poach', label: 'Poach', phrase: 'Poached' },
  { id: 10, code: 'slow_cook', label: 'Slow-cook', phrase: 'Slow-cooked' },
] as const;

export const DIETS = ['Vegetarian', 'Pescatarian', 'No red meat', 'Gluten-free'] as const;
export type DietRule = (typeof DIETS)[number];
export const REPEAT_OPTIONS = [3, 5, 7, 14];
export const DATE_PRESETS: Array<[number, string]> = [[3, '3 days'], [7, '1 week'], [14, '2 weeks'], [30, '1 month']];

export const labelOfCategory = (code: CategoryCode) =>
  CATEGORIES.find((c) => c.code === code)?.label ?? code;

/** "600 g", "1 bag", and a bare count as "×8" — a unit-less number reads like a date. */
export const formatQuantity = (quantity: number, unit: UnitCode) =>
  unit === 'piece' ? `×${quantity}` : `${quantity} ${unit}`;

export const DISH_ICON: Record<DishStyle, string> = {
  bowl: 'M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z|M7 21h10|M5 12a7 6 0 0 1 14 0|M10 8h.01|M14 9h.01|M12 6h.01',
  noodles: 'M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z|M7 21h10|M13 3l-3 9|M19 3l-5 9|M6 12c0-1.5 1.5-1.5 1.5-3|M9.5 12c0-1.5 1.5-1.5 1.5-3',
  salad: 'M7 21h10|M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z|M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.51 2.51 0 0 1 .03 1.1|m13 12 4-4|M10.9 7.25A3.99 3.99 0 0 0 4 10c0 .73.2 1.41.54 2',
  tacos: 'M2 18a10 10 0 0 1 20 0Z|M5 13c1-1.2 2-.2 3-1.4s2-.2 3-1.4 2-.2 3-1.4 2-.2 3 1',
  skillet: 'M2 11h14v2a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5v-2Z|M16 12h6|M6 7c0-1 1-1.5 1-2.5|M10 7c0-1 1-1.5 1-2.5',
  roast: 'M3 14h18|M5 14v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3|M7 14a5 4 0 0 1 10 0|M12 10V8',
};
export const DISH_KIND: Record<DishStyle, string> = {
  bowl: 'Rice bowl', noodles: 'Noodle bowl', salad: 'Salad bowl', tacos: 'Tacos', skillet: 'Skillet', roast: 'Roasting tray',
};

// Lucide: egg, carrot, wheat
export const CAT_ICON = [
  'M12 22c6.23-.05 7.87-5.57 7.5-10-.36-4.34-3.95-9.96-7.5-10-3.55.04-7.14 5.66-7.5 10-.37 4.43 1.27 9.95 7.5 10z',
  'M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7zM8.64 14l-2.05-2.04M15.34 15l-2.46-2.46|M22 9s-1.33-2-3.5-2C16.86 7 15 9 15 9s1.33 2 3.5 2S22 9 22 9z|M15 2s-2 1.33-2 3.5S15 9 15 9s2-1.84 2-3.5C17 3.33 15 2 15 2z',
  'M2 22 16 8|M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z|M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z|M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z|M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z|M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z|M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z|M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z',
];

// Lucide: cooking-pot, utensils-crossed, chef-hat, carrot, soup, salad
export const COOK_ICONS = [
  'M2 12h20|M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8|m4 8-2-2|m18 8 2-2|m19 5 3-3|m5 5-3-3',
  'm16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8|M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7|M2.1 21.8 13 11|m9 11 1.5 1.5',
  'M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z|M6 17h12',
  CAT_ICON[1],
  'M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z|M7 21h10|M19.5 12 22 6|M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62|M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62|M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62',
  DISH_ICON.salad,
];

/** Lucide: egg, carrot, wheat — one per reel, in category order. */
export const CATEGORY_ICON: Record<CategoryCode, string> = {
  protein: CAT_ICON[0],
  vegetable: CAT_ICON[1],
  starch: CAT_ICON[2],
};
