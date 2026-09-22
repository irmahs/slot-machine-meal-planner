-- ─────────────────────────────────────────────────────────────────────────────
-- 0001 · The tables.
--
-- Applied by `supabase db push`, which records it in supabase_migrations so it
-- never runs twice. Every statement is guarded anyway, so this is also safe to
-- paste into the SQL editor, and safe on a database where the same SQL was
-- already run by hand — which is the case for the first project this ran on.
--
-- Ownership: you sign in with an email, and Supabase maps that address to a
-- stable user id in auth.users. Every table carries that id and its policies
-- compare it to auth.uid(), so a row is readable and writable only by the
-- account that created it — and the data survives a change of email address,
-- which scoping on the address itself would not.
-- ─────────────────────────────────────────────────────────────────────────────

-- The unit enum: shared reference data, the same for everyone, so it carries no
-- user_id. Ids are written out rather than generated, so `default 1` below means
-- "piece" and stays meaning that on a re-run.
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

-- One ingredient, named once. The pantry, the history and the shopping list all
-- point at this row, so "Broccoli" is the same thing everywhere.
create table if not exists public.meal_planner_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
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

create index if not exists meal_planner_pantry_user_idx
  on public.meal_planner_pantry (user_id);
create index if not exists meal_planner_shopping_list_user_created_idx
  on public.meal_planner_shopping_list (user_id, created_at desc);
create index if not exists meal_planner_history_user_date_idx
  on public.meal_planner_history (user_id, date_cooked desc, created_at desc);
create index if not exists meal_planner_history_ingredients_ingredient_idx
  on public.meal_planner_history_ingredients (id_ingredient);

alter table public.meal_planner_units enable row level security;
alter table public.meal_planner_ingredients enable row level security;
alter table public.meal_planner_pantry enable row level security;
alter table public.meal_planner_history enable row level security;
alter table public.meal_planner_history_ingredients enable row level security;
alter table public.meal_planner_shopping_list enable row level security;

-- The anon key ships inside the browser bundle, so every table is closed by
-- default and opened only to the owner of the row. Units and categories are the
-- exception: shared reference data, readable by anyone signed in, writable by no one.
drop policy if exists "read units" on public.meal_planner_units;
create policy "read units" on public.meal_planner_units
  for select to authenticated using (true);

drop policy if exists "own ingredients" on public.meal_planner_ingredients;
create policy "own ingredients" on public.meal_planner_ingredients
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own pantry" on public.meal_planner_pantry;
create policy "own pantry" on public.meal_planner_pantry
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own history" on public.meal_planner_history;
create policy "own history" on public.meal_planner_history
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

drop policy if exists "own shopping list" on public.meal_planner_shopping_list;
create policy "own shopping list" on public.meal_planner_shopping_list
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
