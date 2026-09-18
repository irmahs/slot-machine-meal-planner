import type { UnitCode } from './units';

export type Diet = 'meat' | 'fish' | 'veg';

export interface ReelItem {
  name: string;
  diet: Diet;
  gf?: boolean;
}

export interface PantryItem {
  name: string;
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
  /** The three picks the dish was drawn from. */
  ingredients: string[];
}

export interface GroceryItem {
  name: string;
  qty: number;
  unit: UnitCode;
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

