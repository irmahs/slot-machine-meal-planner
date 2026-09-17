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

**The weighting.** With expiry weighting on, an item in the pantry with two days left is worth
`6` against a well-stocked item's `1` — about four times as likely to come up. Items not in the
pantry are worth `0.7`, so the reels lean towards what you already have without ever excluding a
shopping trip. Diet constraints filter the list before the weighted pick; if a filter empties a
list, the unfiltered list is used rather than failing.

**The dish name.** Composed from the three picks rather than looked up — a carb template
(`Jasmine Rice → "{Protein} Rice Bowl"`) joined to a veg phrase (`Broccoli → "charred broccoli"`).
Chicken + broccoli + rice becomes *Chicken Rice Bowl with charred broccoli*. There is no recipe
corpus.

## Stack

- **React 19 + TypeScript**, built with **Vite**
- Plain CSS: design tokens in `src/styles/tokens.css`, component styles in CSS modules
- **Lucide** icons at stroke-width 2.75
- **Vitest** over the reel engine — the spin maths, weighting, and dish naming
- No backend, no auth, no persistence. All state lives in one reducer in memory.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle into dist/
npm test         # reel-engine unit tests
npm run lint     # typecheck
```

The app is laid out for a 402×874 phone viewport and stretches up from there.

## Project structure

```
src/
  data/seed.ts          reel lists, dish-naming tables, seed pantry/history/list
  engine/               the machine: weighted pick, spin maths, dish naming
  state/plannerReducer  all app state and every action over it
  components/           TopBar, Drawer, Reel, CookLoader
  screens/              Spin, Fridge, Cooked, Shopping, Rules
  styles/               tokens.css (design tokens), base.css
```

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

No onboarding, no auth, no persistence, and no per-portion quantities — cooking a dish refreshes
an item's window rather than decrementing a quantity. The dish photo is an empty slot waiting for
a real image source. These are the obvious next increments, not oversights.
