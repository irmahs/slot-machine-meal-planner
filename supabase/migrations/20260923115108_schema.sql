-- ─────────────────────────────────────────────────────────────────────────────
-- Spin Supper — the whole schema.
--
-- One file, because nothing is deployed yet. Once this has been pushed to a
-- real project, later changes go in new migrations rather than edits here:
-- `supabase migration new <name>`.
--
-- Ownership. You sign in with an email and Supabase maps that address to a
-- stable id in auth.users. Every table that holds your data carries that id and
-- compares it to auth.uid(), so a row is readable and writable only by the
-- account that created it — and the data survives a change of email address,
-- which scoping on the address itself would not.
--
-- The anon key ships inside the browser bundle and is readable by anyone, so
-- row-level security is the whole security model. Every table is closed by
-- default and opened only by the policies at the bottom of this file.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Reference data ───────────────────────────────────────────────────────────
-- Shared by everyone, so no user_id: readable by anyone signed in, writable by
-- no one. Ids are written out rather than generated, so `default 1` keeps
-- meaning what it means here and a code can be renamed without orphaning rows.

-- The three reels.
create table if not exists public.meal_planner_categories (
  id smallint primary key,
  code text not null unique,
  label text not null,
  -- Left to right on the draw screen.
  position smallint not null unique
);

insert into public.meal_planner_categories (id, code, label, position) values
  (1, 'protein', 'Protein', 1),
  (2, 'vegetable', 'Vegetables', 2),
  (3, 'starch', 'Starch', 3)
on conflict (id) do update
  set code = excluded.code, label = excluded.label, position = excluded.position;

-- Each category has its own kinds, and they are genuinely different shapes —
-- which is why these are three tables and not one. A protein kind decides what
-- the diet filters do with it; a vegetable kind carries the word its dish name
-- uses; a starch kind decides the shape of the dish and whether it has gluten.

create table if not exists public.meal_planner_protein_kinds (
  id smallint primary key,
  code text not null unique,
  label text not null,
  examples text not null default '',
  -- 'meat' | 'fish' | 'veg' — what the Vegetarian and Pescatarian filters read.
  diet text not null check (diet in ('meat', 'fish', 'veg')),
  is_red_meat boolean not null default false
);

insert into public.meal_planner_protein_kinds (id, code, label, examples, diet, is_red_meat) values
  (1, 'red', 'Red meat', 'Beef, lamb, goat', 'meat', true),
  (2, 'white', 'White meat', 'Pork, veal', 'meat', false),
  (3, 'game', 'Game', 'Venison, rabbit, wild boar, bison', 'meat', true),
  (4, 'poultry', 'Poultry', 'Chicken, turkey, duck', 'meat', false),
  (5, 'fish', 'Fish', 'Salmon, tuna, cod', 'fish', false),
  (6, 'seafood', 'Seafood', 'Prawns, mussels, squid', 'fish', false),
  (7, 'eggdairy', 'Eggs & dairy', 'Eggs, halloumi, paneer', 'veg', false),
  (8, 'plant', 'Plant-based', 'Tofu, tempeh, beans, lentils', 'veg', false)
on conflict (id) do update
  set code = excluded.code, label = excluded.label, examples = excluded.examples,
      diet = excluded.diet, is_red_meat = excluded.is_red_meat;

create table if not exists public.meal_planner_vegetable_kinds (
  id smallint primary key,
  code text not null unique,
  label text not null,
  examples text not null default '',
  -- How this vegetable is described in a dish name: "charred broccoli".
  cooking_word text not null
);

insert into public.meal_planner_vegetable_kinds (id, code, label, examples, cooking_word) values
  (1, 'leafy', 'Leafy greens', 'Spinach, kale, chard, lettuce', 'wilted'),
  (2, 'brassica', 'Brassicas', 'Broccoli, cauliflower, cabbage', 'charred'),
  (3, 'root', 'Roots', 'Carrot, beetroot, parsnip', 'roasted'),
  (4, 'fruiting', 'Fruiting', 'Peppers, tomato, zucchini, aubergine', 'blistered'),
  (5, 'pods', 'Pods & legumes', 'Green beans, peas, edamame', 'garlicky'),
  (6, 'allium', 'Alliums', 'Onion, leek, fennel', 'caramelised'),
  (7, 'mushroom', 'Mushrooms', 'Shiitake, oyster, chestnut', 'seared')
on conflict (id) do update
  set code = excluded.code, label = excluded.label, examples = excluded.examples,
      cooking_word = excluded.cooking_word;

create table if not exists public.meal_planner_starch_kinds (
  id smallint primary key,
  code text not null unique,
  label text not null,
  examples text not null default '',
  -- The shape of the finished dish, which picks the name template and the icon.
  dish_style text not null
    check (dish_style in ('bowl', 'noodles', 'salad', 'tacos', 'skillet', 'roast')),
  -- The default for a new ingredient of this kind; the ingredient may override it.
  gluten_free boolean not null default false
);

insert into public.meal_planner_starch_kinds (id, code, label, examples, dish_style, gluten_free) values
  (1, 'grain', 'Grains', 'Rice, farro, quinoa, bulgur', 'bowl', true),
  (2, 'noodle', 'Noodles', 'Udon, rice noodles, soba', 'noodles', false),
  (3, 'bread', 'Bread', 'Sourdough, ciabatta, naan', 'skillet', false),
  (4, 'wraps', 'Wraps', 'Tortillas, pita, flatbread', 'tacos', false),
  (5, 'tuber', 'Potatoes & roots', 'Potato, sweet potato, polenta', 'roast', true),
  (6, 'wholegrain', 'Whole grains', 'Farro, quinoa, bulgur, couscous', 'salad', false)
on conflict (id) do update
  set code = excluded.code, label = excluded.label, examples = excluded.examples,
      dish_style = excluded.dish_style, gluten_free = excluded.gluten_free;

-- How much of something. A quantity is always a number and one of these.
create table if not exists public.meal_planner_units (
  id smallint primary key,
  code text not null unique,
  label text not null
);

insert into public.meal_planner_units (id, code, label) values
  (1, 'piece', 'pieces'),
  (2, 'g', 'grams'),
  (3, 'kg', 'kilograms'),
  (4, 'ml', 'millilitres'),
  (5, 'l', 'litres'),
  (6, 'serving', 'servings'),
  (7, 'bag', 'bags'),
  (8, 'block', 'blocks'),
  (9, 'pack', 'packs'),
  (10, 'bunch', 'bunches'),
  (11, 'can', 'cans'),
  (12, 'pot', 'pots')
on conflict (id) do update set code = excluded.code, label = excluded.label;

-- Cooking methods. `phrase` is the past participle the dish name uses, which is
-- why this is a table and not a list of words in the app: "Air-fry" has to
-- become "Air-fried", and no rule gets that right for every entry.
create table if not exists public.meal_planner_cooking_methods (
  id smallint primary key,
  code text not null unique,
  label text not null,
  phrase text not null
);

insert into public.meal_planner_cooking_methods (id, code, label, phrase) values
  (1, 'roast', 'Roast', 'Roasted'),
  (2, 'stir_fry', 'Stir-fry', 'Stir-fried'),
  (3, 'pan_fry', 'Pan-fry', 'Pan-fried'),
  (4, 'grill', 'Grill', 'Grilled'),
  (5, 'braise', 'Braise', 'Braised'),
  (6, 'steam', 'Steam', 'Steamed'),
  (7, 'bake', 'Bake', 'Baked'),
  (8, 'air_fry', 'Air-fry', 'Air-fried'),
  (9, 'poach', 'Poach', 'Poached'),
  (10, 'slow_cook', 'Slow-cook', 'Slow-cooked')
on conflict (id) do update
  set code = excluded.code, label = excluded.label, phrase = excluded.phrase;


-- ── Your data ────────────────────────────────────────────────────────────────

-- Your ingredient list. Everything else points at a row here, so a name is
-- stored once. The category says which reel it spins on; the kind says what it
-- contributes to a dish name and what the diet filters make of it.
--
-- The kind lives in one of three columns because the three kind tables hold
-- different columns. Exactly one is set, and it has to be the one matching the
-- category — which is what the check below enforces, so a starch can never
-- carry a protein's kind.
create table if not exists public.meal_planner_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  -- What the dish name calls it: "Chicken Thighs" cooks as "Chicken". Null means
  -- the full name reads fine on its own, which is true of most vegetables.
  short_name text,
  id_category smallint not null references public.meal_planner_categories,
  id_protein_kind smallint references public.meal_planner_protein_kinds,
  id_vegetable_kind smallint references public.meal_planner_vegetable_kinds,
  id_starch_kind smallint references public.meal_planner_starch_kinds,
  -- Starches only: the kind supplies the default, this is the ingredient's own
  -- answer. Null everywhere else.
  gluten_free boolean,
  created_at timestamptz not null default now(),
  unique (user_id, name),
  constraint kind_matches_category check (
    case id_category
      when 1 then id_protein_kind is not null
               and id_vegetable_kind is null and id_starch_kind is null
      when 2 then id_vegetable_kind is not null
               and id_protein_kind is null and id_starch_kind is null
      when 3 then id_starch_kind is not null
               and id_protein_kind is null and id_vegetable_kind is null
      else false
    end
  )
);

-- What is actually in the pantry, and when it goes off. The reels are built from
-- this table alone — an ingredient you own but have not stocked never spins.
create table if not exists public.meal_planner_pantry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id_ingredient uuid not null
    references public.meal_planner_ingredients on delete cascade,
  quantity numeric not null default 1 check (quantity >= 0),
  id_unit smallint not null default 1 references public.meal_planner_units,
  -- A date, not a countdown, so days remaining keep shrinking while the app is
  -- closed. The reels weight an ingredient off this column alone.
  date_expiration date not null,
  created_at timestamptz not null default now(),
  unique (user_id, id_ingredient)
);

-- Which methods are in rotation. A row exists only for a method you have turned
-- off, so an untouched account has every method available.
create table if not exists public.meal_planner_method_settings (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id_method smallint not null references public.meal_planner_cooking_methods,
  enabled boolean not null default true,
  primary key (user_id, id_method)
);

-- Cooking history is deliberately not here. The Cooked screen is behind
-- FEATURES.history in src/features.ts, switched off, so nothing reads or writes
-- it; turning it on means a new migration adding meal_planner_history and a link
-- table for the ingredients a meal was drawn from.

create table if not exists public.meal_planner_shopping_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id_ingredient uuid not null
    references public.meal_planner_ingredients on delete cascade,
  quantity numeric not null default 1 check (quantity >= 0),
  id_unit smallint not null default 1 references public.meal_planner_units,
  -- Why it is on the list, for the line under the name.
  note text not null default '',
  acquired boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, id_ingredient)
);


-- ── Indexes ──────────────────────────────────────────────────────────────────
-- The unique constraints above already index (user_id, id_ingredient) and
-- (user_id, name); these cover the reads those do not.

create index if not exists meal_planner_ingredients_user_category_idx
  on public.meal_planner_ingredients (user_id, id_category);
create index if not exists meal_planner_pantry_user_expiry_idx
  on public.meal_planner_pantry (user_id, date_expiration);
create index if not exists meal_planner_shopping_list_user_created_idx
  on public.meal_planner_shopping_list (user_id, created_at desc);


-- ── Row-level security ───────────────────────────────────────────────────────

alter table public.meal_planner_categories enable row level security;
alter table public.meal_planner_protein_kinds enable row level security;
alter table public.meal_planner_vegetable_kinds enable row level security;
alter table public.meal_planner_starch_kinds enable row level security;
alter table public.meal_planner_units enable row level security;
alter table public.meal_planner_cooking_methods enable row level security;
alter table public.meal_planner_ingredients enable row level security;
alter table public.meal_planner_pantry enable row level security;
alter table public.meal_planner_method_settings enable row level security;
alter table public.meal_planner_shopping_list enable row level security;

-- Reference data: readable by anyone signed in, writable by no one.
do $$
declare t text;
begin
  foreach t in array array[
    'meal_planner_categories', 'meal_planner_protein_kinds', 'meal_planner_vegetable_kinds',
    'meal_planner_starch_kinds', 'meal_planner_units', 'meal_planner_cooking_methods'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'read ' || t, t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)', 'read ' || t, t);
  end loop;
end $$;

-- Your data. auth.uid() is wrapped in a select so Postgres evaluates it once per
-- statement rather than once per row.
do $$
declare t text;
begin
  foreach t in array array[
    'meal_planner_ingredients', 'meal_planner_pantry', 'meal_planner_method_settings',
    'meal_planner_shopping_list'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'own ' || t, t);
    execute format(
      'create policy %I on public.%I for all to authenticated '
      'using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      'own ' || t, t);
  end loop;
end $$;
