# Spin Supper — desktop

Stand-alone implementation of the Claude Design export `Spin Supper Desktop.dc.html` (the 2a "Basket" skin) in Vite + React + TypeScript. Separate from the main app in the repo root: all state is in memory, no Supabase.

Run everything from this folder (`cd desktop`).

```sh
npm install
npm run dev     # local dev server
npm test        # engine tests (spin maths, weighting, dish naming)
npm run build
```

- `src/data.ts` — seed data, reel categories/kinds, units, icon paths
- `src/engine.ts` — spin plan + payline maths, expiry weighting, diet filters, dish naming, date helpers
- `src/useSpinSupper.ts` — all app state and actions (in memory, no persistence, as in the design)
- `src/screens/*` — Draw, Pantry, Add ingredient, Cooked, Shopping list, Cooking methods, Reel rules
- `src/styles.css` — design tokens as CSS variables and component styles
