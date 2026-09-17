import { addDaysISO } from '../lib/dates';

export type Diet = 'meat' | 'fish' | 'veg';

export interface ReelItem {
  name: string;
  diet: Diet;
  gf?: boolean;
}

export interface PantryItem {
  name: string;
  days: number;
  qty: number;
}

export interface PlanEntry {
  id: string;
  /** ISO date; the day badge label is derived from it so "Tonight" stops being tonight. */
  cookedOn: string;
  dish: string;
  sub: string;
  /** The three picks the dish was drawn from. */
  ingredients: string[];
}

export interface GroceryItem {
  name: string;
  qty: number;
  acquired: boolean;
}

export const PROTEIN: ReelItem[] = [
  { name: 'Chicken Thighs', diet: 'meat' },
  { name: 'Salmon Fillet', diet: 'fish' },
  { name: 'Chickpeas', diet: 'veg' },
  { name: 'Firm Tofu', diet: 'veg' },
  { name: 'Ground Beef', diet: 'meat' },
  { name: 'Eggs', diet: 'veg' },
];

export const GREEN: ReelItem[] = [
  'Broccoli',
  'Baby Spinach',
  'Bell Peppers',
  'Zucchini',
  'Green Beans',
  'Mushrooms',
].map((name) => ({ name, diet: 'veg' as const }));

export const GRAIN: ReelItem[] = [
  { name: 'Jasmine Rice', diet: 'veg', gf: true },
  { name: 'Rice Noodles', diet: 'veg', gf: true },
  { name: 'Sweet Potato', diet: 'veg', gf: true },
  { name: 'Farro', diet: 'veg', gf: false },
  { name: 'Corn Tortillas', diet: 'veg', gf: true },
  { name: 'Orzo', diet: 'veg', gf: false },
];

export const REELS: ReelItem[][] = [PROTEIN, GREEN, GRAIN];
export const REEL_LABELS = ['Protein', 'Green', 'Grain'];

export const GRAIN_TEMPLATES: Record<string, (protein: string) => string> = {
  'Jasmine Rice': (p) => `${p} Rice Bowl`,
  'Rice Noodles': (p) => `${p} Noodle Stir-Fry`,
  'Sweet Potato': (p) => `Roasted Sweet Potato & ${p}`,
  Farro: (p) => `${p} Farro Grain Bowl`,
  'Corn Tortillas': (p) => `${p} Tacos`,
  Orzo: (p) => `${p} Orzo Skillet`,
};

export const GREEN_PHRASES: Record<string, string> = {
  Broccoli: 'charred broccoli',
  'Baby Spinach': 'wilted spinach',
  'Bell Peppers': 'blistered peppers',
  Zucchini: 'griddled zucchini',
  'Green Beans': 'garlicky green beans',
  Mushrooms: 'seared mushrooms',
};

export const SINGULAR: Record<string, string> = {
  'Chicken Thighs': 'Chicken',
  'Salmon Fillet': 'Salmon',
  'Ground Beef': 'Beef',
  'Firm Tofu': 'Tofu',
};

export const SEED_PANTRY: PantryItem[] = [
  { name: 'Chicken Thighs', days: 2, qty: 1 },
  { name: 'Baby Spinach', days: 1, qty: 1 },
  { name: 'Zucchini', days: 3, qty: 2 },
  { name: 'Jasmine Rice', days: 90, qty: 1 },
  { name: 'Eggs', days: 9, qty: 8 },
  { name: 'Mushrooms', days: 4, qty: 1 },
  { name: 'Corn Tortillas', days: 12, qty: 10 },
  { name: 'Firm Tofu', days: 6, qty: 1 },
];

export function seedPlan(): PlanEntry[] {
  return [
    {
      dish: 'Tofu Tacos with blistered peppers',
      sub: 'Used up the peppers · 2 portions left',
      ingredients: ['Firm Tofu', 'Bell Peppers', 'Corn Tortillas'],
    },
    {
      dish: 'Salmon Rice Bowl with charred broccoli',
      sub: 'Rescued salmon on its last day',
      ingredients: ['Salmon Fillet', 'Broccoli', 'Jasmine Rice'],
    },
    {
      dish: 'Chickpea Orzo Skillet with wilted spinach',
      sub: 'Pantry-only pull',
      ingredients: ['Chickpeas', 'Baby Spinach', 'Orzo'],
    },
  ].map((entry, i) => ({ ...entry, id: crypto.randomUUID(), cookedOn: addDaysISO(-(i + 1)) }));
}

export const SEED_GROCERY: GroceryItem[] = [
  { name: 'Broccoli', qty: 1, acquired: false },
  { name: 'Bell Peppers', qty: 2, acquired: false },
  { name: 'Salmon Fillet', qty: 1, acquired: true },
];
