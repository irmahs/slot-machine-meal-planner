# Spin Supper

A mobile web app that decides dinner for you.

Three reels — **Protein**, **Fibre**, **Grain** — spin from what is actually in your fridge,
weighted so items closest to expiring come up more often. Lock any column you like, draw the
rest again, then commit the dish to your week. Built for someone who wants to meal-prep but
loses track of what they have, so food expires and the same three dishes come round on repeat.

## Screens

| Screen | What it does |
| --- | --- |
| **Spin** | Three reels, a payline, and one button. Tap a column to hold it, draw again for the rest, then send the dish into the pot. |
| **Fridge** | The inventory the reels weight by, soonest to go off first, with a use-by date on every item. |
| **Cooked** | This week's history — what was drawn, and why it was drawn. |
| **Shopping list** | What to pick up. Stocking an item moves it into the fridge, where the reels can draw it. |
| **Reel rules** | What each reel currently holds, the no-repeat window, and the expiry weighting switch. |

A burger drawer on the left moves between them.

## How the machine works

**The spin.** Each reel renders its six-item list repeated 8× into one strip and translates it by
`-idx * 63px`. The payline is the *middle* visible cell — strip index `idx + 1`, not `idx`. On a
draw, each unlocked reel picks a target by weight, then travels four full turns plus one extra
turn per reel for stagger, over `1.50s / 1.92s / 2.34s`. At `2500ms` everything snaps back onto
the payline and the result is published. Locked reels keep whatever is already on their payline.

**The weighting.** A pantry item stores the date it goes off, and days remaining are derived from
that date every time they are read — so a fridge left alone for a week comes back a week more
urgent. With weighting on, an item with two days left is worth `6` against a well-stocked item's
`1` — about four times as likely to come up. Turn weighting off and every item on a reel weighs the
same.

**What the reels hold: your fridge, nothing else.** `reelsFrom()` slices the pantry by category —
one reel per category, soonest to go off at the top — and that is the whole of it. There is no
ingredient catalogue in the source, so the app knows nothing about any particular food. A reel with
nothing in it renders as *nothing yet · add a protein* and the draw stays disabled until all three
have something, because a slot machine with an empty column has nothing to pull.

**How an ingredient is categorised.** By a column, set by you, once. Every ingredient you create
carries an `id_category` — Protein, Fibre or Grain — chosen in the same panel where you name it,
and that column is the only thing that decides which reel it spins on. Nothing is inferred from the
name, and nothing is guessed.

**The dish name.** Composed from the three picks, never looked up. Four templates describe the
*shape* of a name — `{protein} with {fibre} and {grain}`, `{grain} bowl with {protein} and
{fibre}`, and two more — and a small hash of the three names picks one, so the same three picks
always read the same way. It knows no recipes and no ingredients, which is what lets it name a dish
out of three things you typed yourself.

## Stack

- **React 19 + TypeScript**, built with **Vite**
- Plain CSS: design tokens in `src/styles/tokens.css`, component styles in CSS modules
- **Lucide** icons at stroke-width 2.75
- **Vitest** over the reel engine — the spin maths, weighting, and dish naming
- **Supabase** for storage and magic-link sign-in — where your ingredients, fridge, week and list
  live

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle into dist/
npm test         # reel-engine unit tests
npm run lint     # typecheck
```

### Layout

The design was drawn for a 402×874 phone, and below 900px that is exactly what you get: a single
scrolling column with the burger drawer sliding over it. At 900px and above the drawer docks as a
permanent sidebar, the burger disappears, content sits in a centred 780px column, and the Spin
screen splits in two — reels on the left, tonight's dish on the right, so a draw no longer pushes
the result below the fold. One breakpoint, `DESKTOP` in `src/lib/useMediaQuery.ts`, drives both the
CSS and the drawer's docked state.

### Signing in, or not

Signing in with a magic link puts everything in Supabase under your account. **Have a look around**
opens a guest tab instead: a sample basket, every screen working, and the whole session held in
`sessionStorage` — it survives a reload and is gone the moment the tab closes. Nothing a guest does
reaches Supabase, which also means the app is usable with no credentials configured at all.

## Storage (Supabase)

Every screen but Spin reads its rows from Supabase, so this is setup, not an extra.

### The data

Every table carries the `user_id` of the account that owns the row, and its RLS policy compares
that to `auth.uid()`. You sign in with an email; Supabase maps the address to a stable user id, so
the data follows the account even if the address changes.

| Table | Columns | Holds |
| --- | --- | --- |
| `meal_planner_units` | `id`, `code`, `label` | The unit enum — piece, g, kg, ml, l, bag, block, pack, bunch, can. Shared reference data, not per user. |
| `meal_planner_categories` | `id`, `code`, `label` | The three reels — protein, fibre, grain. Shared reference data, not per user. |
| `meal_planner_ingredients` | `id`, `user_id`, `name`, `id_category` | Your ingredient list. `id_category` is how an ingredient is categorised — set once, on creation, and the only thing that decides its reel. |
| `meal_planner_pantry` | `id`, `user_id`, `id_ingredient`, `quantity`, `id_unit`, `date_expiration` | What's in the fridge. `date_expiration` is picked on a date input and is what the reels weight by. |
| `meal_planner_history` | `id`, `user_id`, `name_meal`, `note`, `date_cooked` | One row per dish sent into the pot. Drives the Cooked screen and its two stat cards. |
| `meal_planner_history_ingredients` | `id_history`, `id_ingredient` | Which three ingredients a meal was drawn from. Separate table because a meal has three, not one. |
| `meal_planner_shopping_list` | `id`, `user_id`, `id_ingredient`, `quantity`, `id_unit`, `acquired` | What to buy, and whether it has been bought. |

Three notes on the shape:

- **`id_ingredient`, not a repeated name.** The history and list key on an ingredient id, so the
  pantry does too and the name lives in `meal_planner_ingredients`. The app still works in names;
  ids are resolved at the boundary in `src/lib/remote.ts`.
- **A quantity is a number and a unit**: `600` + `g`, `1` + `bag`, `2` + `piece`. Units come from
  `meal_planner_units` rather than free text, so the set stays closed; `src/data/units.ts` mirrors
  it for the app's own model, and codes are resolved to ids at the boundary. A count in `piece`
  renders as `×2`, anything else as `600 g`.
- **Reel rules are not stored.** Weighting is computed from `date_expiration` at draw time, so
  there is no rules table; the no-repeat window and the weighting switch live in memory and reset
  on reload.

1. **Create the project** — [supabase.com/dashboard](https://supabase.com/dashboard) → *New
   project*. The Free plan allows two active projects per account.
2. **Apply the migrations** — the schema lives in `supabase/migrations/`, one timestamped file per
   change, and the Supabase CLI applies whatever is not applied yet:

   ```bash
   npx supabase login                          # opens a browser, stores a token
   npx supabase link --project-ref <your-ref>  # the ref from the project URL
   npm run db:push                             # applies pending migrations
   ```

   `db push` records each file in the `supabase_migrations` schema, so it never runs one twice.
   Every migration is also written to be idempotent — `if not exists`, `on conflict do update` —
   which matters if you first built the database by pasting SQL into the editor: pushing then
   replays both files over what is already there and changes nothing it does not need to.
   Pasting a migration straight into *SQL Editor* still works if you would rather not link.
3. **Turn on magic links** — *Authentication → Sign In / Providers → Email*: enable the provider and
   leave *Confirm email* on. Under *Authentication → URL Configuration* set the **Site URL** to where
   the app runs (`http://localhost:5173` for development) and add every other origin you use to
   **Redirect URLs**, including the deployed one. A link only works for a listed origin.
4. **Wire the keys** — copy `.env.example` to `.env.local` and fill in the project URL and the
   **anon public** key from *Project Settings → API*. Never the service-role key: this is a browser
   app and the anon key is the only one meant to ship in a bundle.
5. `npm run dev`, enter your email, open the link from the same device.

A new account starts empty — no ingredients, no fridge. Create an ingredient from the Fridge
screen's **New** button, or run the seed script, which fills a starting list, fridge, week and
shopping list; it is kept outside the repo because it carries a real email address, and it
resolves your account by that address, so run it only after a first sign-in has created the
account.

### Changing the schema

Write a new migration rather than editing an applied one — `npx supabase migration new <name>`
creates the timestamped file, and `npm run db:push` applies it. `npm run db:diff` shows what the
linked database has that the migrations do not, which is how a change made by hand in the
dashboard gets captured back into the repo. The two files there now are the whole history: the
tables, then ingredient categories.

Signing in loads your rows into the reducer; from then on the reducer is mirrored back into
Postgres — write only what changed. The reducer stays the single source of truth in the session, so
a compound action like *Into the pot* needs no bespoke save path.

Two things become honest once data outlives the session: a pantry item stores a **use-by date**
rather than a frozen countdown, so days keep ticking down while the app is closed, and a history
entry stores the **date it was cooked**, so tonight's dish stops calling itself "Tonight" tomorrow.

## Deploying (Vercel)

Import the repo and the defaults are right — Vite is detected, `npm run build`, output `dist`. There
are no client-side routes, so no rewrite config is needed.

**Environment variables.** `.env.local` is gitignored, so Vercel never sees it: the same two
variables have to be set again under *Project Settings → Environment Variables*, ticked for
Production, Preview and Development.

Two things about them are easy to get wrong:

- **They are baked in at build time.** Vite substitutes `import.meta.env.*` into the JavaScript
  during the build rather than reading it when the page loads. Adding or changing a variable does
  nothing until you **redeploy** — a deploy made before you set them will keep saying it is not
  connected.
- **Anything named `VITE_*` ships inside the bundle** and is readable by anyone. That is fine for
  the publishable key, which is designed to be public and is backed by row-level security. It is
  exactly why a `sb_secret_…` key must never be given a `VITE_` name.

**Supabase URL configuration.** Under *Authentication → URL Configuration*, set the Site URL to the
production domain and list every origin that may receive a magic link:

```
Site URL       https://<your-project>.vercel.app

Redirect URLs  https://<your-project>.vercel.app
               https://<your-project>.vercel.app/**
               https://<your-project>-*.vercel.app/**
               http://localhost:5173/**
```

The separators in Supabase's matcher are `.` and `/`: `*` matches within one segment, `**` across
several. So `<your-project>-*.vercel.app` covers preview and branch deploys
(`…-a1b2c3-you.vercel.app`, `…-git-main-you.vercel.app`) but never the bare production host, which
needs its own entry. Both the bare origin and the `/**` form are listed for production because the
app sends `emailRedirectTo: window.location.origin`, which carries no path at all.

Take the production domain from Vercel's *Domains* list rather than assuming it: if the project
name was taken, Vercel appends a suffix and the Site URL above would be wrong.

## Project structure

```
supabase/
  config.toml           CLI settings; carries no project identity, no secrets
  migrations/           the schema's history, applied by `supabase db push`
src/
  data/model.ts         the app's types — no ingredient data anywhere
  data/categories.ts    the three reels, mirroring meal_planner_categories
  data/units.ts         the unit enum, mirroring meal_planner_units
  engine/               the machine: weighted pick, spin maths, dish naming
  state/planner.ts      all app state and every action over it
  lib/supabase/         client.ts (browser client), auth.ts (magic link, session, sign out)
  lib/remote.ts         load a snapshot, write only what changed
  lib/guest.ts          the guest tab: one sessionStorage key, lost with the tab
  lib/useRemoteSync.ts  hydrate on sign-in, mirror the reducer from then on
  components/           TopBar, Drawer, Reel, CookLoader, SignIn, IngredientPicker
  screens/              Spin, Fridge, Cooked, Shopping, Rules
  styles/               tokens.css (design tokens), base.css
```

There is no `server.ts` or `middleware.ts`: this is a static single-page app with no server
runtime, so the anon key plus row-level security is the whole security model.

## Design

Built from a design handoff with two visual directions: *Organic* (cream/terracotta, the approved
information architecture and behaviour for all five screens) and *2a Basket* (the approved visual
language for the spin screen). The spin screen wears the 2a Basket skin — bare reel columns on a
`#efe9d9` ground, 44px radii, no shadows, Gloock over Karla — while the remaining screens and the
chrome carry the Organic palette as specified.

Design rules that are load-bearing, not decoration:

- **No sharp corners, no dashed borders.** Containers round to 44/30/24/22/20px; every button,
  pill, chip and switch is `999px`.
- **Body text sits at ≥4.5:1** against its actual background, headline-scale type at ≥3:1. The
  secondary inks were darkened once already — do not lighten them back.
- **Every tap target is ≥44px**, including the small `×` and `Stock` actions.
- **Keyboard focus is visible**: `:focus-visible { outline: 2px solid <accent>; outline-offset: 2px }`.

## Not built, deliberately

No onboarding. Cooking a dish refreshes an item's window rather than decrementing its quantity, so
the number a row carries is what you put there. An ingredient's category cannot be changed after
it is created — remove the item and add it again. There are no diet filters: with the catalogue
gone there is nothing to filter on, and tagging every ingredient with a diet as well as a category
was more than the screen was worth. Reel rules are not persisted. Sync is last-write-wins with no realtime channel, so two
devices editing at once will talk over each other. These are the obvious next increments, not
oversights.
