-- Spin Supper — everything the app stores, scoped to the signed-in user.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- Ownership: you sign in with an email, and Supabase maps that address to a stable user id in
-- auth.users. Every table below carries that id and its policies compare it to auth.uid(), so a
-- row is readable and writable only by the account that created it — and the data survives a
-- change of email address, which scoping by the address itself would not.

-- One ingredient, named once. pantry, history and the shopping list all point at this row, so
-- "Broccoli" is the same thing everywhere and a rename is one update.
create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.pantry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id_ingredient uuid not null references public.ingredients on delete cascade,
  quantity text not null default '1',
  -- A date, not a countdown, so days remaining keep shrinking while the app is closed.
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

-- A meal is drawn from three ingredients, so the link is its own table; one row per ingredient
-- on the meal keeps the meal named once instead of repeated three times.
create table if not exists public.meal_planner_history_ingredients (
  id_history uuid not null references public.meal_planner_history on delete cascade,
  id_ingredient uuid not null references public.ingredients on delete cascade,
  primary key (id_history, id_ingredient)
);

create table if not exists public.shoppinglist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id_ingredient uuid not null references public.ingredients on delete cascade,
  quantity text not null default '1',
  -- Both are on screen today: the reason line under the name, and the bought checkbox.
  why text not null default '',
  got boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, id_ingredient)
);

-- The Reel rules screen: diet constraints, the no-repeat window, the expiry-weighting switch.
create table if not exists public.reel_rules (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  diets text[] not null default '{}',
  repeat_days smallint not null default 7,
  weighting boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists pantry_user_idx on public.pantry (user_id);
create index if not exists shoppinglist_user_created_idx
  on public.shoppinglist (user_id, created_at desc);
create index if not exists meal_planner_history_user_date_idx
  on public.meal_planner_history (user_id, date_cooked desc, created_at desc);
create index if not exists meal_planner_history_ingredients_ingredient_idx
  on public.meal_planner_history_ingredients (id_ingredient);

alter table public.ingredients enable row level security;
alter table public.pantry enable row level security;
alter table public.meal_planner_history enable row level security;
alter table public.meal_planner_history_ingredients enable row level security;
alter table public.shoppinglist enable row level security;
alter table public.reel_rules enable row level security;

-- The anon key ships inside the browser bundle, so every table is closed by default and opened
-- only to the owner of the row.
create policy "own ingredients" on public.ingredients
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own pantry" on public.pantry
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own history" on public.meal_planner_history
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The link table has no user_id of its own; it inherits ownership from the meal it belongs to.
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

create policy "own shopping list" on public.shoppinglist
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rules" on public.reel_rules
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
