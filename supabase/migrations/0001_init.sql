-- Spin Supper — pantry, history, shopping list and reel rules, one set per signed-in user.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).

create table if not exists public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  -- Stored as a date, not a countdown: days remaining are derived on read so the
  -- number keeps shrinking while the app is closed.
  use_by date not null,
  qty text not null default '1',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.cooked_entries (
  -- Client-generated so the reducer owns row identity and can diff without a round trip.
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  dish text not null,
  note text not null,
  cooked_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  why text not null,
  got boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.reel_rules (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  diets text[] not null default '{}',
  repeat_days smallint not null default 7,
  weighting boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists cooked_entries_user_cooked_on_idx
  on public.cooked_entries (user_id, cooked_on desc, created_at desc);
create index if not exists grocery_items_user_created_at_idx
  on public.grocery_items (user_id, created_at desc);

alter table public.pantry_items enable row level security;
alter table public.cooked_entries enable row level security;
alter table public.grocery_items enable row level security;
alter table public.reel_rules enable row level security;

-- The anon key ships in the browser bundle, so every table is readable and writable
-- only by the user whose id is on the row.
create policy "own pantry" on public.pantry_items
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own history" on public.cooked_entries
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own list" on public.grocery_items
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rules" on public.reel_rules
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
