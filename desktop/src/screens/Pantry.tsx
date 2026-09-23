import { LABELS } from '../data';
import { daysNote } from '../engine';
import type { Store } from '../useSpinSupper';

const FILTERS: [number, string][] = [[-1, 'All'], [0, 'Protein'], [1, 'Vegetables'], [2, 'Starch']];

export function Pantry({ s }: { s: Store }) {
  const rows = s.pantry
    .map(p => ({ ...p, k: p.cat ?? s.catOf(p.name) }))
    .filter(p => s.pantryFilter < 0 || p.k === s.pantryFilter)
    .sort((a, b) => a.days - b.days);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="toolbar">
        {FILTERS.map(([k, label]) => (
          <button key={k} type="button" className="chip" aria-pressed={s.pantryFilter === k} onClick={() => s.setPantryFilter(k)}>{label}</button>
        ))}
        <div className="toolbar__spacer" />
        <button type="button" className="btn" onClick={() => s.setScreen('add')}>+ Add ingredient</button>
      </div>
      <div className="pantry-grid">
        {rows.map(p => {
          const soon = p.days <= 3, mid = p.days <= 10;
          return (
            <article key={p.name} className={'pcard' + (soon ? ' pcard--soon' : '')}>
              <div className="pcard__head">
                <div className="chip-row" style={{ gap: 6 }}>
                  <span className={'badge ' + (soon ? 'badge--dark' : mid ? 'tone-fresh' : 'tone-buy')}>{soon ? 'Use it' : mid ? 'Fresh' : 'Stocked'}</span>
                  <span className="badge badge--line">{p.k >= 0 ? LABELS[p.k] : 'Other'}</span>
                </div>
                <button type="button" className="icon-x" aria-label={'Remove ' + p.name} onClick={() => s.removePantry(p.name)}>×</button>
              </div>
              <div>
                <div className="pcard__name">{p.name}</div>
                <div className="body-sm pcard__sub">{p.qty} · {daysNote(p.days)}</div>
              </div>
              <div className="bar" role="presentation">
                <div style={{ width: Math.max(6, Math.min(100, Math.round((p.days / 14) * 100))) + '%' }} />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
