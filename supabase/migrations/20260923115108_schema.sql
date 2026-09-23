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
-- Shared by everyone, so no user_id. Ids are written out rather than generated,
-- so `default 1` below keeps meaning what it means here. A code can be renamed
-- later and every row pointing at the id follows.

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
  (6, 'bag', 'bags'),
  (7, 'block', 'blocks'),
  (8, 'pack', 'packs'),
  (9, 'bunch', 'bunches'),
  (10, 'can', 'cans')
on conflict (id) do update set code = excluded.code, label = excluded.label;

-- Which of the three reels an ingredient spins on.
create table if not exists public.meal_planner_categories (
  id smallint primary key,
  code text not null unique,
  label text not null
);

insert into public.meal_planner_categories (id, code, label) values
  (1, 'protein', 'Protein'),
  (2, 'fibre', 'Fibre'),
  (3, 'grain', 'Grain')
on conflict (id) do update set code = excluded.code, label = excluded.label;


-- ── Your data ────────────────────────────────────────────────────────────────

-- One ingredient, named once. The pantry, the history and the shopping list all
-- point at this row, so "Broccoli" is the same thing everywhere.
--
-- id_category is the whole of how an ingredient is categorised: chosen once, on
-- creation, and the only thing that puts the ingredient on a reel.
create table if not exists public.meal_planner_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  id_category smallint not null default 1
    references public.meal_planner_categories,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

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

create table if not exists public.meal_planner_history (
  -- Client-generated so the app can diff its own rows without a round trip.
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name_meal text not null,
  note text not null default '',
  date_cooked date not null default current_date,
  created_at timestamptz not null default now()
);

-- A meal is drawn from three ingredients, so the link is its own table; one row
-- per ingredient keeps the meal named once instead of repeated three times.
create table if not exists public.meal_planner_history_ingredients (
  id_history uuid not null references public.meal_planner_history on delete cascade,
  id_ingredient uuid not null
    references public.meal_planner_ingredients on delete cascade,
  primary key (id_history, id_ingredient)
);

create table if not exists public.meal_planner_shopping_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id_ingredient uuid not null
    references public.meal_planner_ingredients on delete cascade,
  quantity numeric not null default 1 check (quantity >= 0),
  id_unit smallint not null default 1 references public.meal_planner_units,
  acquired boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, id_ingredient)
);


-- ── Indexes ──────────────────────────────────────────────────────────────────
-- One per read the app actually makes. The unique constraints above already
-- index (user_id, id_ingredient), so these cover the rest.

create index if not exists meal_planner_pantry_user_idx
  on public.meal_planner_pantry (user_id);
create index if not exists meal_planner_shopping_list_user_created_idx
  on public.meal_planner_shopping_list (user_id, created_at desc);
create index if not exists meal_planner_history_user_date_idx
  on public.meal_planner_history (user_id, date_cooked desc, created_at desc);
create index if not exists meal_planner_history_ingredients_ingredient_idx
  on public.meal_planner_history_ingredients (id_ingredient);


-- ── Row-level security ───────────────────────────────────────────────────────

alter table public.meal_planner_units enable row level security;
alter table public.meal_planner_categories enable row level security;
alter table public.meal_planner_ingredients enable row level security;
alter table public.meal_planner_pantry enable row level security;
alter table public.meal_planner_history enable row level security;
alter table public.meal_planner_history_ingredients enable row level security;
alter table public.meal_planner_shopping_list enable row level security;

-- Reference data: readable by anyone signed in, writable by no one.
drop policy if exists "read units" on public.meal_planner_units;
create policy "read units" on public.meal_planner_units
  for select to authenticated using (true);

drop policy if exists "read categories" on public.meal_planner_categories;
create policy "read categories" on public.meal_planner_categories
  for select to authenticated using (true);

-- Your data: one policy per table covering every command.
drop policy if exists "own ingredients" on public.meal_planner_ingredients;
create policy "own ingredients" on public.meal_planner_ingredients
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own pantry" on public.meal_planner_pantry;
create policy "own pantry" on public.meal_planner_pantry
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own history" on public.meal_planner_history;
create policy "own history" on public.meal_planner_history
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own shopping list" on public.meal_planner_shopping_list;
create policy "own shopping list" on public.meal_planner_shopping_list
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The link table has no user_id of its own; it inherits ownership from its meal.
drop policy if exists "own history ingredients" on public.meal_planner_history_ingredients;
create policy "own history ingredients" on public.meal_planner_history_ingredients
  for all to authenticated
  using (
    exists (
      select 1 from public.meal_planner_history h
      where h.id = id_history and h.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meal_planner_history h
      where h.id = id_history and h.user_id = auth.uid()
    )
  );
