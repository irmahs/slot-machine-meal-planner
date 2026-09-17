# Spin Supper

A mobile web app that decides dinner for you.

Three reels — **Protein**, **Green**, **Grain** — spin from what is actually in your fridge,
weighted so items closest to expiring come up more often. Lock any column you like, draw the
rest again, then commit the dish to your week. Built for someone who wants to meal-prep but
loses track of what they have, so food expires and the same three dishes come round on repeat.

## Screens

| Screen | What it does |
| --- | --- |
| **Spin** | Three reels, a payline, and one button. Tap a column to hold it, draw again for the rest, then send the dish into the pot. |
| **Fridge** | The pantry inventory the reels draw from, sorted by days remaining, with what is about to go off called out. |
| **Cooked** | This week's history — what was drawn, and why it was drawn. |
| **Shopping list** | Built from dishes you said yes to, minus whatever is already in the fridge. Items can be stocked straight into the fridge. |
| **Reel rules** | Diet constraints, the no-repeat window, and the expiry weighting switch. |

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
`1` — about four times as likely to come up. Items not in the pantry are worth `0.7`, so the reels
lean towards what you already have without ever excluding a shopping trip. Diet constraints filter
the list before the weighted pick; if a filter empties a list, the unfiltered list is used rather
than failing.

**What the reels hold.** The three reels are a fixed catalogue of six ingredients each, defined in
`src/data/seed.ts` — not a view of your fridge. That is deliberate: the reels can offer something
you have to buy, and what is in the fridge changes the odds rather than the options. Each cell
shows its own status, so `need to buy` sits under an ingredient you do not have.

**The dish name.** Composed from the three picks rather than looked up — a carb template
(`Jasmine Rice → "{Protein} Rice Bowl"`) joined to a veg phrase (`Broccoli → "charred broccoli"`).
Chicken + broccoli + rice becomes *Chicken Rice Bowl with charred broccoli*. There is no recipe
corpus.

## Stack

- **React 19 + TypeScript**, built with **Vite**
- Plain CSS: design tokens in `src/styles/tokens.css`, component styles in CSS modules
- **Lucide** icons at stroke-width 2.75
- **Vitest** over the reel engine — the spin maths, weighting, and dish naming
- **Supabase** for persistence and magic-link sign-in — optional; with no credentials the app runs
  entirely in memory

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

Without Supabase credentials the app skips sign-in entirely and keeps everything in memory, which is
the fastest way to work on the UI.

## Persistence (Supabase)

Optional. Set it up once and your fridge, week and list follow you across devices.

### The data

Every table carries the `user_id` of the account that owns the row, and its RLS policy compares
that to `auth.uid()`. You sign in with an email; Supabase maps the address to a stable user id, so
the data follows the account even if the address changes.

| Table | Columns | Holds |
| --- | --- | --- |
| `meal_planner_units` | `id`, `code`, `label` | The unit enum — piece, g, kg, ml, l, bag, block, pack, bunch, can. Shared reference data, not per user. |
| `meal_planner_ingredients` | `id`, `user_id`, `name` | Every ingredient named once. The other tables point at it, so "Broccoli" is one thing everywhere. |
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
  it for the in-memory path, and codes are resolved to ids at the boundary. A count in `piece`
  renders as `×2`, anything else as `600 g`.
- **Reel rules are not stored.** Weighting is computed from `date_expiration` at draw time, so
  there is no rules table; the diet chips and no-repeat window on the Reel rules screen live in
  memory and reset on reload.

1. **Create the project** — [supabase.com/dashboard](https://supabase.com/dashboard) → *New
   project*. The Free plan allows two active projects per account.
2. **Create the tables** — Dashboard → *SQL Editor* → *New query*, paste the schema SQL, run it. It
   creates the six tables above and turns on row-level security so each row is readable only by its
   owner. The script is kept outside the repo; it is safe to re-run.
3. **Turn on magic links** — *Authentication → Sign In / Providers → Email*: enable the provider and
   leave *Confirm email* on. Under *Authentication → URL Configuration* set the **Site URL** to where
   the app runs (`http://localhost:5173` for development) and add every other origin you use to
   **Redirect URLs**, including the deployed one. A link only works for a listed origin.
4. **Wire the keys** — copy `.env.example` to `.env.local` and fill in the project URL and the
   **anon public** key from *Project Settings → API*. Never the service-role key: this is a browser
   app and the anon key is the only one meant to ship in a bundle.
5. `npm run dev`, enter your email, open the link from the same device.

A separate seed script can fill a signed-in account with the starting fridge, week and list. It is
also kept outside the repo, and it resolves your account by the address you sign in with, so run it
only after a first sign-in has created that account.

The first sign-in on a new account uploads the starting fridge as seed data; after that the reducer
is mirrored into Postgres — hydrate on sign-in, then write only what changed. The reducer stays the
single source of truth, so a compound action like *Into the pot* needs no bespoke save path.

Two things become honest once data outlives the session: a pantry item stores a **use-by date**
rather than a frozen countdown, so days keep ticking down while the app is closed, and a history
entry stores the **date it was cooked**, so tonight's dish stops calling itself "Tonight" tomorrow.

## Project structure

```
src/
  data/seed.ts          reel lists, dish-naming tables, seed pantry/history/list
  engine/               the machine: weighted pick, spin maths, dish naming
  state/planner.ts      all app state and every action over it
  lib/supabase/         client.ts (browser client), auth.ts (magic link, session, sign out)
  lib/remote.ts         load a snapshot, write only what changed
  lib/useRemoteSync.ts  hydrate on sign-in, mirror the reducer from then on
  components/           TopBar, Drawer, Reel, CookLoader, SignIn
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
the number a row carries is what you put there. The dish photo is an empty slot waiting for a real
image source. Reel rules are not persisted. Sync is last-write-wins with no realtime channel, so two
devices editing at once will talk over each other. These are the obvious next increments, not
oversights.
