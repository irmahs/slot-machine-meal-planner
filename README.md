# Spin Supper

A mobile web app that decides dinner for you.

Three reels — **Protein**, **Vegetables**, **Starch** — spin from what is actually in your
pantry, weighted so items closest to expiring come up more often. Hold any column you like, draw
the rest again, then send the dish into the pot. Built for someone who wants to meal-prep but
loses track of what they have, so food expires and the same three dishes come round on repeat.

## Screens

| Screen | What it does |
| --- | --- |
| **Draw** | Three reels, a payline, and one button. Click a column to hold it, draw again for the rest, then send the dish into the pot. Space draws too. |
| **Pantry** | What is stocked, soonest to go off first. Stocking something picks from the ingredients you have already described. |
| **Add ingredient** | Describes a new one: its name, its reel, and its kind. The kind is what dish names and diet filters read. |
| **Shopping list** | What to pick up. Moving something into the pantry is what lets it spin. |
| **Cooking methods** | Which methods are in rotation. Each draw picks one and names the dish after it. |
| **Reel rules** | Diet constraints, the no-repeat window, and the expiry weighting switch. |

A permanent sidebar moves between them.

## How the machine works

**The spin.** Each reel renders its list repeated 10× into one strip and translates it by
`-idx * 84px`. The payline is the *middle* visible cell — strip index `idx + 1`, not `idx`. On a
draw, each unlocked reel picks a target by weight, then travels four full turns plus one extra
turn per reel for stagger, over `1.50s / 1.92s / 2.34s`. At `2500ms` everything snaps back onto
the payline and the result is published. Held reels keep whatever is already on their payline.

**What the reels hold: the pantry, nothing else.** `reelsFrom()` slices what is stocked by the
category of each item's ingredient, soonest to go off at the top. An ingredient you have
described but not stocked never spins. A reel with nothing in it disables the draw, because a
slot machine with an empty column has nothing to pull.

**The weighting.** A pantry item stores the date it goes off, and days remaining are derived from
that date every time they are read — so a pantry left alone for a week comes back a week more
urgent. With weighting on, an item with two days left is worth `6` against a well-stocked item's
`1` — about four times as likely to come up. Turn it off and everything on a reel weighs the same.

**Categories and kinds.** An ingredient belongs to one of three categories, and within it to one
*kind*. The three kind tables are separate because they are genuinely different shapes: a protein
kind carries the diet it counts as and whether it is red meat; a vegetable kind carries the word
its dish name uses; a starch kind carries the shape of the dish and whether it has gluten. That is
what makes the diet filters real rather than a list of banned names — *No red meat* drops anything
whose kind says red meat, including one you added yourself.

**The dish name.** Composed from the picks and the method, never looked up. The starch's kind
decides the shape of the name, the vegetable's kind supplies the word describing it, and the
method supplies the participle in front:

```
Air-fried   Chicken      Rice        Bowl    with charred   broccoli
└ method    └ protein    └ starch    └ from  └ vegetable    └ vegetable
  phrase      short name   short name  starch   kind's word
                                       kind
```

`phrase` is stored on the method rather than derived, because no rule turns *Air-fry* into
*Air-fried* and *Steam* into *Steamed* and *Slow-cook* into *Slow-cooked*. Switch every method off
and the name simply loses its front: *Chicken Rice Bowl with charred broccoli*.


## Stack

- **React 19 + TypeScript**, built with **Vite**
- Plain CSS: one stylesheet, `src/styles.css`, with the palette as custom properties on `:root`
- Hand-drawn **Lucide-style glyphs** at stroke-width 2.75, inlined rather than a package
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

A desktop app: a permanent sidebar and a content column beside it. The Draw screen splits in two —
reels on the left, tonight's dish on the right — so a draw never pushes the result below the fold,
and it collapses to one column when the window is too narrow to hold both.

### Signing in, or not

Signing in with a magic link puts everything in Supabase under your account. **Have a look around**
opens a guest tab instead: a sample basket, every screen working, and the whole session held in
`sessionStorage` — it survives a reload and is gone the moment the tab closes. Nothing a guest does
reaches Supabase, which also means the app is usable with no credentials configured at all.

## Storage (Supabase)

Every screen but Draw reads its rows from Supabase, so this is setup, not an extra.

### The data

Every table carries the `user_id` of the account that owns the row, and its RLS policy compares
that to `auth.uid()`. You sign in with an email; Supabase maps the address to a stable user id, so
the data follows the account even if the address changes.

| Table | Holds |
| --- | --- |
| `meal_planner_categories` | The three reels — protein, vegetables, starch. Shared, not per user. |
| `meal_planner_protein_kinds` | Red meat, white meat, game, poultry, fish, seafood, eggs & dairy, plant-based — each with the `diet` it counts as and whether it is `is_red_meat`. |
| `meal_planner_vegetable_kinds` | Leafy, brassica, root, fruiting, pods, allium, mushroom — each with the `cooking_word` its dish name uses. |
| `meal_planner_starch_kinds` | Grains, noodles, bread, wraps, potatoes, whole grains — each with a `dish_style` and a gluten default. |
| `meal_planner_units` | Twelve units, from `g` to `serving` to `pot`. |
| `meal_planner_cooking_methods` | Ten methods, each with the `phrase` a dish name uses. |
| `meal_planner_ingredients` | Your ingredient list: `name`, `short_name`, `id_category`, one of three kind columns, and `gluten_free` for starches. |
| `meal_planner_pantry` | What is stocked: quantity, unit and `date_expiration`. The reels are built from this table alone. |
| `meal_planner_method_settings` | A row only for a method you switched **off**, so a new account has all ten. |
| `meal_planner_shopping_list` | What to buy, why, and whether it has been bought. |

Five notes on the shape:

- **History is switched off.** `FEATURES.history` in `src/features.ts` is `false`, and the two
  tables it would need are deliberately not in the schema, so nothing reads or writes them. Turning
  it on means a new migration alongside the flag. Until then *Into the pot* pushes the drawn
  ingredients' use-by dates two weeks out and says so — the only lasting effect.
- **`id_ingredient`, not a repeated name.** Everything keys on an ingredient id and the name lives
  in `meal_planner_ingredients`. The app works in names; ids are resolved at the boundary in
  `src/lib/remote.ts`.
- **Three kind tables, not one.** They carry different columns, which is the argument for keeping
  them apart. An ingredient has three nullable kind columns and a check constraint that exactly the
  one matching its category is set, so a starch can never carry a protein's kind.
- **A quantity is a number and a unit**: `600` + `g`, `1` + `bag`, `2` + `piece`. A count in
  `piece` renders as `×2`, anything else as `600 g`.
- **Reel rules are not stored.** Weighting is computed from `date_expiration` at draw time, so
  there is no rules table; the diet chips, the no-repeat window and the weighting switch live in
  memory and reset on reload. Cooking methods *are* stored, because switching one off is a
  standing preference rather than a setting for one draw.

1. **Create the project** — [supabase.com/dashboard](https://supabase.com/dashboard) → *New
   project*. The Free plan allows two active projects per account.
2. **Apply the migrations** — the schema lives in `supabase/migrations/`, one timestamped file per
   change, and the Supabase CLI applies whatever is not applied yet:

   ```bash
   npx supabase login                          # opens a browser, stores a token
   npx supabase link --project-ref <your-ref>  # the ref from the project URL
   npm run db:push                             # applies pending migrations
   ```

   Or let CI do it. `.github/workflows/database.yml` runs the same CLI on every push to `main`
   that touches `supabase/migrations/`, and on demand from the Actions tab. It reads three
   repository settings (*Settings → Secrets and variables → Actions*):

   | | Kind | From |
   | --- | --- | --- |
   | `SUPABASE_ACCESS_TOKEN` | Secret | Account → Access Tokens |
   | `SUPABASE_DB_PASSWORD` | Secret | Project Settings → Database |
   | `SUPABASE_PROJECT_REF` | Variable | The subdomain of the project URL |

   The workflow has two jobs. `verify` starts a throwaway local Postgres with Supabase's own
   auth schema and replays every migration from nothing, so a broken or out-of-order file fails
   before it can reach the project — it needs no secrets and runs on pull requests too. `push`
   runs only after `verify` passes, prints `db push --dry-run` first so the log says what was
   pending, and then applies.

   Doing it by hand needs three things and none of them is `.env.local`: your Supabase account (the
   `login` step, which stores a token under `~/.supabase/`, not in the repo), the **project
   ref** — the subdomain of your project URL — and your **database password**, which `link`
   and `push` prompt for. The password was set when the project was created; if it is lost,
   reset it under *Project Settings → Database → Database password*. The `VITE_*` variables
   are for the browser app at runtime and are never read by the CLI.

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
   **anon public** key from *Project Settings → API*. This is what the running app reads, and it is
   separate from the migration step above. Never the service-role key: this is a browser app and
   the anon key is the only one meant to ship in a bundle.
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
dashboard gets captured back into the repo. There is one file there now, holding the whole
schema — nothing had been pushed when it was written, so there was no history to preserve.

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
.github/workflows/
  database.yml          verify migrations, then apply them to the linked project
supabase/
  config.toml           CLI settings; carries no project identity, no secrets
  migrations/           the schema's history, applied by `supabase db push`
src/
  data/model.ts         the app's types — no ingredient data anywhere
  data/reference.ts     the fixed vocabularies, mirroring the reference tables
  engine/reel.ts        the machine: reels from the pantry, weighting, spin maths, dish naming
  state/planner.ts      all app state and every action over it
  lib/supabase/         client.ts (browser client), auth.ts (magic link, session, sign out)
  lib/remote.ts         load a snapshot, write only what changed
  lib/guest.ts          the guest tab: one sessionStorage key, lost with the tab
  lib/useRemoteSync.ts  hydrate on sign-in, mirror the reducer from then on
  components/           Icon, Switch, SignIn
  features.ts           what is built but switched off
  screens/              Draw, Pantry, AddIngredient, Cooked, ShoppingList, CookingMethods, ReelRules
  styles.css            one stylesheet; the palette lives in :root
```

There is no `server.ts` or `middleware.ts`: this is a static single-page app with no server
runtime, so the anon key plus row-level security is the whole security model.

## Design

The *2a Basket* skin throughout: forest green on a `#efe9d9` ground, flat fills, no shadows,
Gloock over Karla. A permanent sidebar rather than a drawer, because this is a desktop app. The
layout came from the `desktop-version` branch; this is that design carried into the real app, with
pantry-only reels and Supabase behind it.

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
it is created — remove the ingredient and add it again. Cooking methods are a fixed list, because
each one carries the participle its dish name needs; adding your own would mean supplying that too.
The no-repeat window and the diet chips are not persisted. Sync is last-write-wins with no realtime channel, so two
devices editing at once will talk over each other. These are the obvious next increments, not
oversights.
