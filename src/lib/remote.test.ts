import { beforeEach, describe, expect, it, vi } from 'vitest';

interface Op {
  table: string;
  verb: 'select' | 'insert' | 'upsert' | 'delete';
  payload?: unknown;
  filters: Array<[string, unknown]>;
}

/**
 * A stand-in for the Supabase client: it records what the write path asked for and answers
 * selects from fixtures, applying eq/in filters so a query that over-fetches shows up here
 * rather than silently passing.
 */
const harness = vi.hoisted(() => {
  const ops: Op[] = [];
  const rows: Record<string, unknown[]> = {};

  const from = (table: string) => {
    const op: Op = { table, verb: 'select', filters: [] };
    let single = false;
    const record = (verb: Op['verb'], payload?: unknown) => {
      op.verb = verb;
      op.payload = payload;
      ops.push(op);
      return chain;
    };
    const matching = () =>
      (rows[table] ?? []).filter((row) =>
        op.filters.every(([column, value]) => {
          const cell = (row as Record<string, unknown>)[column];
          if (cell === undefined) return true;
          return Array.isArray(value) ? value.includes(cell) : cell === value;
        }),
      );
    const chain = {
      select: () => record('select'),
      insert: (payload: unknown) => record('insert', payload),
      upsert: (payload: unknown) => record('upsert', payload),
      delete: () => record('delete'),
      eq: (column: string, value: unknown) => (op.filters.push([column, value]), chain),
      in: (column: string, value: unknown) => (op.filters.push([column, value]), chain),
      order: () => chain,
      maybeSingle: () => ((single = true), chain),
      returns: () => chain,
      then: (resolve: (result: { data: unknown; error: null }) => unknown) => {
        const found = matching();
        return resolve({ data: single ? (found[0] ?? null) : found, error: null });
      },
    };
    return chain;
  };

  return { ops, rows, supabase: { from } };
});

vi.mock('./supabase', () => ({ supabase: harness.supabase }));

const { loadSnapshot, seedSnapshot, writeChanges } = await import('./remote');

const USER = 'user-1';

const INGREDIENTS = [
  { id: 'ing-chicken', name: 'Chicken Thighs' },
  { id: 'ing-broccoli', name: 'Broccoli' },
  { id: 'ing-rice', name: 'Jasmine Rice' },
];

function snapshot(overrides: Partial<Parameters<typeof writeChanges>[2]> = {}) {
  return {
    pantry: [{ name: 'Chicken Thighs', days: 2, qty: '600 g' }],
    plan: [],
    grocery: [{ name: 'Broccoli', why: 'Ran out', got: false }],
    rules: { diets: [], repeatDays: 7 as const, weighting: true },
    ...overrides,
  };
}

function opsFor(table: string, verb: Op['verb']) {
  return harness.ops.filter((op) => op.table === table && op.verb === verb);
}

beforeEach(() => {
  harness.ops.length = 0;
  harness.rows.ingredients = INGREDIENTS;
  harness.rows.pantry = [];
  harness.rows.meal_planner_history = [];
  harness.rows.meal_planner_history_ingredients = [];
  harness.rows.shoppinglist = [];
  harness.rows.reel_rules = [];
});

describe('seeding a new account', () => {
  it('writes the pantry, the list and the rules', async () => {
    await seedSnapshot(USER, snapshot());

    expect(opsFor('pantry', 'upsert')).toHaveLength(1);
    expect(opsFor('pantry', 'upsert')[0].payload).toEqual([
      expect.objectContaining({
        user_id: USER,
        id_ingredient: 'ing-chicken',
        quantity: '600 g',
      }),
    ]);
    expect(opsFor('shoppinglist', 'upsert')).toHaveLength(1);
    expect(opsFor('reel_rules', 'upsert')).toHaveLength(1);
  });

  it('creates every ingredient it references before pointing rows at it', async () => {
    await seedSnapshot(USER, snapshot());

    const created = opsFor('ingredients', 'upsert')[0].payload as Array<{ name: string }>;
    expect(created.map((row) => row.name)).toEqual(['Chicken Thighs', 'Broccoli']);
  });
});

describe('writing a change', () => {
  it('touches only the row that moved', async () => {
    const prev = snapshot();
    const next = snapshot({ pantry: [{ name: 'Chicken Thighs', days: 14, qty: '600 g' }] });

    await writeChanges(USER, prev, next);

    expect(opsFor('pantry', 'upsert')).toHaveLength(1);
    expect(opsFor('shoppinglist', 'upsert')).toHaveLength(0);
    expect(opsFor('reel_rules', 'upsert')).toHaveLength(0);
    expect(opsFor('meal_planner_history', 'insert')).toHaveLength(0);
  });

  it('writes nothing at all when nothing changed', async () => {
    const same = snapshot();
    await writeChanges(USER, same, { ...same });

    expect(harness.ops.filter((op) => op.verb !== 'select')).toEqual([]);
  });

  it('deletes a removed pantry item by its ingredient id', async () => {
    await writeChanges(USER, snapshot(), snapshot({ pantry: [] }));

    const deletes = opsFor('pantry', 'delete');
    expect(deletes).toHaveLength(1);
    expect(deletes[0].filters).toContainEqual(['id_ingredient', ['ing-chicken']]);
  });

  it('records a cooked meal and links every ingredient it used', async () => {
    const entry = {
      id: 'meal-1',
      cookedOn: '2026-09-17',
      dish: 'Chicken Rice Bowl with charred broccoli',
      sub: 'Just added from a pull',
      ingredients: ['Chicken Thighs', 'Broccoli', 'Jasmine Rice'],
    };

    await writeChanges(USER, snapshot(), snapshot({ plan: [entry] }));

    expect(opsFor('meal_planner_history', 'insert')[0].payload).toEqual([
      expect.objectContaining({ id: 'meal-1', name_meal: entry.dish, date_cooked: '2026-09-17' }),
    ]);
    expect(opsFor('meal_planner_history_ingredients', 'insert')[0].payload).toEqual([
      { id_history: 'meal-1', id_ingredient: 'ing-chicken' },
      { id_history: 'meal-1', id_ingredient: 'ing-broccoli' },
      { id_history: 'meal-1', id_ingredient: 'ing-rice' },
    ]);
  });
});

describe('loading', () => {
  it('returns null for an account with no rows yet', async () => {
    expect(await loadSnapshot(USER)).toBeNull();
  });

  it('joins ingredient names back onto every row', async () => {
    harness.rows.pantry = [
      { id_ingredient: 'ing-chicken', quantity: '600 g', date_expiration: '2099-01-01' },
    ];
    harness.rows.meal_planner_history = [
      { id: 'meal-1', name_meal: 'Chicken Rice Bowl', note: 'Pantry pull', date_cooked: '2026-09-16' },
    ];
    harness.rows.meal_planner_history_ingredients = [
      { id_history: 'meal-1', id_ingredient: 'ing-chicken' },
      { id_history: 'meal-1', id_ingredient: 'ing-rice' },
    ];
    harness.rows.shoppinglist = [{ id_ingredient: 'ing-broccoli', why: 'Ran out', got: true }];

    const loaded = await loadSnapshot(USER);

    expect(loaded?.pantry[0].name).toBe('Chicken Thighs');
    expect(loaded?.plan[0].ingredients).toEqual(['Chicken Thighs', 'Jasmine Rice']);
    expect(loaded?.grocery[0]).toEqual({ name: 'Broccoli', why: 'Ran out', got: true });
  });

  it('turns a stored expiry date back into days remaining', async () => {
    const inThreeDays = new Date();
    inThreeDays.setDate(inThreeDays.getDate() + 3);
    harness.rows.pantry = [
      {
        id_ingredient: 'ing-chicken',
        quantity: '1',
        date_expiration: inThreeDays.toISOString().slice(0, 10),
      },
    ];

    const loaded = await loadSnapshot(USER);
    expect(loaded?.pantry[0].days).toBe(3);
  });
});
