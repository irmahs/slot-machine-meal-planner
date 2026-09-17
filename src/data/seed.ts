export type Diet = 'meat' | 'fish' | 'veg';

export interface ReelItem {
  name: string;
  diet: Diet;
  gf?: boolean;
}

export interface PantryItem {
  name: string;
  days: number;
  qty: string;
}

export interface PlanEntry {
  day: string;
  dish: string;
  sub: string;
}

export interface GroceryItem {
  name: string;
  why: string;
  got: boolean;
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
  { name: 'Chicken Thighs', days: 2, qty: '600 g' },
  { name: 'Baby Spinach', days: 1, qty: '1 bag' },
  { name: 'Zucchini', days: 3, qty: '2' },
  { name: 'Jasmine Rice', days: 90, qty: '1.5 kg' },
  { name: 'Eggs', days: 9, qty: '8' },
  { name: 'Mushrooms', days: 4, qty: '250 g' },
  { name: 'Corn Tortillas', days: 12, qty: '10' },
  { name: 'Firm Tofu', days: 6, qty: '1 block' },
];

export const SEED_PLAN: PlanEntry[] = [
  { day: 'Sun', dish: 'Tofu Tacos with blistered peppers', sub: 'Used up the peppers · 2 portions left' },
  { day: 'Sat', dish: 'Salmon Rice Bowl with charred broccoli', sub: 'Rescued salmon on its last day' },
  { day: 'Fri', dish: 'Chickpea Orzo Skillet with wilted spinach', sub: 'Pantry-only pull' },
];

export const SEED_GROCERY: GroceryItem[] = [
  { name: 'Broccoli', why: 'Wanted by Saturday’s bowl', got: false },
  { name: 'Bell Peppers', why: 'Ran out on Sunday', got: false },
  { name: 'Salmon Fillet', why: 'Spun twice, never in stock', got: true },
];
