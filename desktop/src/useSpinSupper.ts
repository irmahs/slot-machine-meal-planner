import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CATALOG0, GROCERY0, LABELS, METHODS0, PANTRY0, PLAN0, PROTEIN_KINDS, STARCH_KINDS, VEG_KINDS,
  type DishStyle, type GroceryItem, type Method, type PantryItem, type PlanEntry, type ReelItem,
} from './data';
import { SETTLE_MS, dishOf, planSpin, settledIdx, weightedPick } from './engine';

export type Screen = 'spin' | 'pantry' | 'add' | 'plan' | 'list' | 'methods' | 'setup';

export interface AddDraft {
  name: string;
  cat: number;
  kind: string;     // protein kind
  veg: string;      // vegetable kind
  starch: string;   // starch kind
  style: DishStyle; // derived from starch kind
  gf: boolean;
  days: number;
  qty: string;
  unit: string;
  have: boolean;
}

const DRAFT0: AddDraft = {
  name: '', cat: 0, kind: 'poultry', veg: 'leafy', starch: 'noodle', style: 'noodles', gf: false,
  days: 7, qty: '', unit: 'g', have: true,
};

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function useSpinSupper() {
  const [screen, setScreen] = useState<Screen>('spin');
  const [catalog, setCatalog] = useState<ReelItem[][]>(() => CATALOG0.map(l => l.slice()));
  const [idx, setIdx] = useState([0, 0, 0]);
  const [dur, setDur] = useState(['0s', '0s', '0s']);
  const [locks, setLocks] = useState([false, false, false]);
  const [spinning, setSpinning] = useState(false);
  const [picked, setPicked] = useState<number[] | null>(null);
  const [method, setMethod] = useState('');
  const [pantry, setPantry] = useState<PantryItem[]>(PANTRY0);
  const [plan, setPlan] = useState<PlanEntry[]>(PLAN0);
  const [grocery, setGrocery] = useState<GroceryItem[]>(GROCERY0);
  const [methods, setMethods] = useState<Method[]>(METHODS0);
  const [diets, setDiets] = useState<string[]>([]);
  const [repeatDays, setRepeatDays] = useState(7);
  const [weighting, setWeighting] = useState(true);
  const [pantryFilter, setPantryFilter] = useState(-1);
  const [draft, setDraft] = useState<AddDraft>(DRAFT0);
  const [flash, setFlash] = useState('');

  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Latest state for the spin callback (which is also bound to the Space key).
  const live = useRef({ spinning, idx, locks, catalog, diets, pantry, weighting, methods });
  live.current = { spinning, idx, locks, catalog, diets, pantry, weighting, methods };

  const spin = useCallback(() => {
    const s = live.current;
    if (s.spinning) return;
    const lens = s.catalog.map(l => l.length);
    const plan = planSpin(s.idx, s.locks, lens, k => weightedPick(s.catalog[k], k, s.diets, s.pantry, s.weighting));
    setIdx(plan.idx);
    setDur(plan.dur);
    setSpinning(true);
    setPicked(null);
    timers.current.push(window.setTimeout(() => {
      const on = live.current.methods.filter(m => m.on);
      setMethod(on.length ? on[Math.floor(Math.random() * on.length)].name : '');
      setSpinning(false);
      setPicked(plan.target);
      setIdx(settledIdx(plan.target, live.current.catalog.map(l => l.length)));
      setDur(['0s', '0s', '0s']);
    }, SETTLE_MS));
  }, []);

  const toggleLock = (k: number) => setLocks(l => l.map((v, i) => (i === k ? !v : v)));

  const pickedItems = picked ? picked.map((c, k) => catalog[k][c]) : null;
  const inPantry = (name: string) => pantry.find(p => p.name === name);
  const catOf = (name: string) => catalog.findIndex(l => l.some(i => i.name === name));

  const cookIt = () => {
    if (!pickedItems) return;
    const [p, v, c] = pickedItems;
    const dish = dishOf(p, v, c);
    const missing = pickedItems.map(i => i.name).filter(n => !inPantry(n));
    setPlan(pl => [{ day: 'Today', dish, sub: method ? 'Just drawn · ' + method.toLowerCase() : 'Just drawn', style: c.style || 'bowl' }, ...pl]);
    setGrocery(g => g.concat(missing.filter(m => !g.some(x => x.name === m)).map(m => ({ name: m, why: 'Drawn tonight, not in the pantry', got: false }))));
    setPicked(null);
    setScreen('plan');
  };

  // — shopping list —
  const addGrocery = (raw: string) => {
    const n = raw.trim();
    if (!n) return false;
    setGrocery(g => (g.some(x => same(x.name, n)) ? g : [{ name: n, why: 'Added by you', got: false }, ...g]));
    return true;
  };
  const toggleGrocery = (name: string) => setGrocery(g => g.map(x => (x.name === name ? { ...x, got: !x.got } : x)));
  const removeGrocery = (name: string) => setGrocery(g => g.filter(x => x.name !== name));
  const stockGrocery = (name: string) => {
    setPantry(p => [{ name, days: 6, qty: '1', cat: catOf(name) }, ...p.filter(x => x.name !== name)]);
    removeGrocery(name);
  };

  // — cooking methods —
  const addMethod = (raw: string) => {
    const n = raw.trim();
    if (!n) return false;
    setMethods(ms => (ms.some(m => same(m.name, n)) ? ms : [...ms, { name: n[0].toUpperCase() + n.slice(1), on: true }]));
    return true;
  };
  const toggleMethod = (name: string) => setMethods(ms => ms.map(m => (m.name === name ? { ...m, on: !m.on } : m)));
  const removeMethod = (name: string) => setMethods(ms => ms.filter(m => m.name !== name));

  // — add ingredient —
  const patchDraft = (patch: Partial<AddDraft>) => setDraft(d => ({ ...d, ...patch }));
  const pickStarch = (key: string) => {
    const k = STARCH_KINDS.find(x => x[0] === key)!;
    patchDraft({ starch: key, style: k[3], gf: k[4] });
  };
  const submitAdd = () => {
    const d = draft, n = d.name.trim();
    if (!n) return;
    let item: ReelItem;
    if (d.cat === 0) {
      const k = PROTEIN_KINDS.find(x => x[0] === d.kind)!;
      item = { name: n, short: n, kind: k[0], diet: k[3], red: k[4] };
    } else if (d.cat === 1) {
      const k = VEG_KINDS.find(x => x[0] === d.veg)!;
      item = { name: n, kind: k[0], cook: k[3] };
    } else {
      item = { name: n, kind: d.starch, style: d.style, gf: d.gf };
    }
    const k = d.cat;
    setCatalog(cat => cat.map((l, i) => {
      if (i !== k) return l;
      const at = l.findIndex(x => same(x.name, n));
      return at >= 0 ? l.map((x, j) => (j === at ? item : x)) : [...l, item];
    }));
    setPantry(p => {
      const rest = p.filter(x => !same(x.name, n));
      return d.have ? [{ name: n, days: d.days, qty: d.qty.trim() ? d.qty.trim() + ' ' + d.unit : '1', cat: k }, ...rest] : rest;
    });
    setGrocery(g => {
      const rest = g.filter(x => !same(x.name, n));
      return d.have ? rest : [{ name: n, why: 'New on the ' + LABELS[k].toLowerCase() + ' reel', got: false }, ...rest];
    });
    setDraft(dr => ({ ...dr, name: '', qty: '', days: 7 }));
    setFlash(n + ' is on the ' + LABELS[k].toLowerCase() + ' reel' + (d.have ? ' and in the pantry.' : ', and on the shopping list.'));
    timers.current.push(window.setTimeout(() => setFlash(''), 3200));
  };

  return {
    screen, setScreen,
    catalog, idx, dur, locks, spinning, picked, pickedItems, method, spin, toggleLock, cookIt,
    pantry, inPantry, catOf, removePantry: (name: string) => setPantry(p => p.filter(x => x.name !== name)),
    pantryFilter, setPantryFilter,
    plan,
    grocery, addGrocery, toggleGrocery, removeGrocery, stockGrocery,
    methods, addMethod, toggleMethod, removeMethod,
    diets, toggleDiet: (d: string) => setDiets(ds => (ds.includes(d) ? ds.filter(x => x !== d) : [...ds, d])),
    repeatDays, setRepeatDays,
    weighting, toggleWeighting: () => setWeighting(w => !w),
    draft, patchDraft, pickStarch, submitAdd, flash,
  };
}

export type Store = ReturnType<typeof useSpinSupper>;
