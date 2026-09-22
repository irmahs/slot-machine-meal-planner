-- ─────────────────────────────────────────────────────────────────────────────
-- 0002 · Ingredient categories.
--
-- The reels used to be a fixed list of eighteen ingredients written into the
-- app's source. They are now built from the fridge, which means each ingredient
-- has to say which of the three reels it belongs on. That is id_category: set
-- once, when you create the ingredient, and nothing else decides it.
--
-- Idempotent, so it lands the same way on a fresh database and on one where the
-- earlier hand-run script was already pasted into the SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. The category enum, alongside the units table. Ids are written out, so
--    `default 1` below means Protein and stays meaning that on a re-run — and a
--    later rename of a code follows every ingredient already pointing at the id.
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

alter table public.meal_planner_categories enable row level security;

-- Shared reference data: readable by anyone signed in, writable by no one.
drop policy if exists "read categories" on public.meal_planner_categories;
create policy "read categories" on public.meal_planner_categories
  for select to authenticated using (true);

-- 2. The column. Rows that predate it land on Protein because something has to
--    be chosen; anything that is really a fibre or a grain is quickest to fix in
--    the app — remove the item and add it again under the right category.
alter table public.meal_planner_ingredients
  add column if not exists id_category smallint not null default 1
    references public.meal_planner_categories;

-- 3. If the old eighteen were seeded before this ran, put them on their reels.
update public.meal_planner_ingredients i
set id_category = c.id
from (values
  ('Broccoli', 'fibre'), ('Baby Spinach', 'fibre'), ('Bell Peppers', 'fibre'),
  ('Zucchini', 'fibre'), ('Green Beans', 'fibre'), ('Mushrooms', 'fibre'),
  ('Jasmine Rice', 'grain'), ('Rice Noodles', 'grain'), ('Sweet Potato', 'grain'),
  ('Farro', 'grain'), ('Corn Tortillas', 'grain'), ('Orzo', 'grain')
) as known(name, category)
join public.meal_planner_categories c on c.code = known.category
where i.name = known.name and i.id_category = 1;
