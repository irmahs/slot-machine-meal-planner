// Seed data, lookup tables and Lucide-style glyphs for Spin Supper.

export type Cat = 0 | 1 | 2;
export type Diet = 'meat' | 'fish' | 'veg';
export type DishStyle = 'bowl' | 'noodles' | 'salad' | 'tacos' | 'skillet' | 'roast';

export interface ReelItem {
  name: string;
  kind?: string;
  // Protein
  short?: string;
  diet?: Diet;
  red?: boolean;
  // Vegetables
  cook?: string;
  word?: string;
  // Starch
  style?: DishStyle;
  gf?: boolean;
}

export interface PantryItem { name: string; days: number; qty: string; cat: number }
export interface PlanEntry { day: string; dish: string; sub: string; style: DishStyle }
export interface GroceryItem { name: string; why: string; got: boolean }
export interface Method { name: string; on: boolean }

// 24px glyphs, stroke 2.75. Multiple paths are separated by "|".
// Only `salad` is a genuine Lucide glyph; the other dish icons are drawn in Lucide's style.
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

export const LABELS = ['Protein', 'Vegetables', 'Starch'] as const;

// [key, label, examples, diet, red meat?]
export const PROTEIN_KINDS: [string, string, string, Diet, boolean][] = [
  ['red', 'Red meat', 'Beef, lamb, goat', 'meat', true],
  ['white', 'White meat', 'Pork, veal', 'meat', false],
  ['game', 'Game', 'Venison, rabbit, wild boar, bison', 'meat', true],
  ['poultry', 'Poultry', 'Chicken, turkey, duck', 'meat', false],
  ['fish', 'Fish', 'Salmon, tuna, cod', 'fish', false],
  ['seafood', 'Seafood', 'Prawns, mussels, squid', 'fish', false],
  ['eggdairy', 'Eggs & dairy', 'Eggs, halloumi, paneer', 'veg', false],
  ['plant', 'Plant-based', 'Tofu, tempeh, beans, lentils', 'veg', false],
];
// [key, label, examples, cooking word used in the dish name]
export const VEG_KINDS: [string, string, string, string][] = [
  ['leafy', 'Leafy greens', 'Spinach, kale, chard, lettuce', 'wilted'],
  ['brassica', 'Brassicas', 'Broccoli, cauliflower, cabbage', 'charred'],
  ['root', 'Roots', 'Carrot, beetroot, parsnip', 'roasted'],
  ['fruiting', 'Fruiting', 'Peppers, tomato, zucchini, aubergine', 'blistered'],
  ['pods', 'Pods & legumes', 'Green beans, peas, edamame', 'garlicky'],
  ['allium', 'Alliums', 'Onion, leek, fennel', 'caramelised'],
  ['mushroom', 'Mushrooms', 'Shiitake, oyster, chestnut', 'seared'],
];
// [key, label, examples, dish style, gluten-free by default]
export const STARCH_KINDS: [string, string, string, DishStyle, boolean][] = [
  ['noodle', 'Noodles', 'Udon, rice noodles, soba', 'noodles', false],
  ['bread', 'Bread', 'Sourdough, ciabatta, naan', 'skillet', false],
  ['wraps', 'Wraps', 'Tortillas, pita, flatbread', 'tacos', false],
  ['other', 'Other', 'Potato, sweet potato, polenta', 'roast', true],
  ['wholegrain', 'Whole grains', 'Farro, quinoa, bulgur, couscous', 'salad', false],
];
export const UNITS = ['g', 'kg', 'serving', 'pot', 'can'];
export const DATE_PRESETS: [number, string][] = [[3, '3 days'], [7, '1 week'], [14, '2 weeks'], [30, '1 month']];
export const DIETS = ['Vegetarian', 'Pescatarian', 'No red meat', 'Gluten-free'];
export const REPEAT_OPTIONS = [3, 5, 7, 14];

export const CATALOG0: ReelItem[][] = [
  [
    { name: 'Chicken Thighs', short: 'Chicken', diet: 'meat' }, { name: 'Salmon Fillet', short: 'Salmon', diet: 'fish' },
    { name: 'Chickpeas', short: 'Chickpea', diet: 'veg' }, { name: 'Firm Tofu', short: 'Tofu', diet: 'veg' },
    { name: 'Ground Beef', short: 'Beef', diet: 'meat', red: true }, { name: 'Eggs', short: 'Egg', diet: 'veg' },
  ],
  [
    { name: 'Broccoli', cook: 'charred' }, { name: 'Baby Spinach', cook: 'wilted', word: 'spinach' },
    { name: 'Bell Peppers', cook: 'blistered', word: 'peppers' }, { name: 'Zucchini', cook: 'griddled' },
    { name: 'Green Beans', cook: 'garlicky' }, { name: 'Mushrooms', cook: 'seared' },
  ],
  [
    { name: 'Jasmine Rice', style: 'bowl', word: 'Rice', gf: true }, { name: 'Rice Noodles', style: 'noodles', word: 'Noodle', gf: true },
    { name: 'Sweet Potato', style: 'roast', gf: true }, { name: 'Farro', style: 'salad', gf: false },
    { name: 'Corn Tortillas', style: 'tacos', gf: true }, { name: 'Orzo', style: 'skillet', gf: false },
  ],
];

export const METHODS0: Method[] = [
  { name: 'Roast', on: true }, { name: 'Stir-fry', on: true }, { name: 'Pan-fry', on: true }, { name: 'Grill', on: true },
  { name: 'Braise', on: false }, { name: 'Steam', on: true }, { name: 'Bake', on: true }, { name: 'Air-fry', on: false },
];

export const PANTRY0: PantryItem[] = [
  { name: 'Chicken Thighs', days: 2, qty: '600 g', cat: 0 }, { name: 'Baby Spinach', days: 1, qty: '1 bag', cat: 1 },
  { name: 'Zucchini', days: 3, qty: '2', cat: 1 }, { name: 'Jasmine Rice', days: 90, qty: '1.5 kg', cat: 2 },
  { name: 'Eggs', days: 9, qty: '8', cat: 0 }, { name: 'Mushrooms', days: 4, qty: '250 g', cat: 1 },
  { name: 'Corn Tortillas', days: 12, qty: '10', cat: 2 }, { name: 'Firm Tofu', days: 6, qty: '1 block', cat: 0 },
];

export const PLAN0: PlanEntry[] = [
  { day: 'Sun', dish: 'Tofu Tacos with blistered peppers', sub: 'Used up the peppers · two portions left', style: 'tacos' },
  { day: 'Sat', dish: 'Salmon Rice Bowl with charred broccoli', sub: 'Rescued the salmon on its last day', style: 'bowl' },
  { day: 'Fri', dish: 'Chickpea Orzo Skillet with wilted spinach', sub: 'Pantry-only draw', style: 'skillet' },
];

export const GROCERY0: GroceryItem[] = [
  { name: 'Broccoli', why: 'Wanted by Saturday’s bowl', got: false },
  { name: 'Bell Peppers', why: 'Ran out on Sunday', got: false },
  { name: 'Salmon Fillet', why: 'Drawn twice, never in stock', got: true },
];
