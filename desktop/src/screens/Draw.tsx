import { COOK_ICONS, DISH_ICON, DISH_KIND, LABELS, type PantryItem } from '../data';
import { CELL_H, STRIP_REPEATS, dishOf } from '../engine';
import { Icon } from '../components/Icon';
import type { Store } from '../useSpinSupper';

type Tone = 'soon' | 'fresh' | 'buy';

export function Draw({ s, expiring }: { s: Store; expiring: PantryItem[] }) {
  const toneOf = (name: string): Tone => {
    const p = s.inPantry(name);
    return p ? (p.days <= 3 ? 'soon' : 'fresh') : 'buy';
  };
  const it = s.pickedItems;
  const style = (it && it[2].style) || 'bowl';
  const showResult = !!it && !s.spinning;

  return (
    <div className="draw">
      <section className="draw__left" aria-label="Reels">
        <div className="day-head">
          <div className="day-head__day">{new Date().toLocaleDateString('en-GB', { weekday: 'long' })}</div>
          <h2 className="day-head__title">what the pantry holds</h2>
          <div className="day-head__rule" />
        </div>

        <div className="reels">
          <div className="payline" />
          {s.catalog.map((list, k) => {
            const locked = s.locks[k];
            const toggle = () => s.toggleLock(k);
            return (
              <div key={k} className="reel" role="button" tabIndex={0} aria-pressed={locked}
                aria-label={`${LABELS[k]} reel`} title={locked ? 'Release this column' : 'Hold this column'}
                onClick={toggle}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}>
                <div className="reel__fade" />
                <div className="reel__strip" style={{ transform: `translateY(${-s.idx[k] * CELL_H}px)`, transitionDuration: s.dur[k] }}>
                  {Array.from({ length: STRIP_REPEATS }, (_, r) => list.map((item, i) => {
                    const p = s.inPantry(item.name);
                    return (
                      <div key={r + ':' + i} className="cell">
                        <div className="cell__name">{item.name}</div>
                        <div className={'note tone-' + toneOf(item.name)}>
                          {p ? (p.days > 30 ? 'stocked' : p.days === 1 ? 'today' : p.days + ' days') : 'to buy'}
                        </div>
                      </div>
                    );
                  }))}
                </div>
                <div className="reel__foot">{locked ? 'held' : LABELS[k]}</div>
              </div>
            );
          })}
        </div>

        <div className="draw__cta">
          <button type="button" className="btn draw__btn" onClick={s.spin}>Draw three</button>
          <div className="hint" aria-live="polite">
            <span>{s.spinning ? 'Turning over…' : it ? 'Click a column to hold it, then draw again.' : 'Draw three — or press'}</span>
            <kbd className="kbd">SPACE</kbd>
          </div>
        </div>
      </section>

      <section className="stack" style={{ gap: 18 }} aria-label="Tonight's dish">
        <div className="recipe">
          {!showResult ? (
            <div className="recipe__empty">
              <div className="loader" aria-hidden="true">
                {COOK_ICONS.map((d, i) => <Icon key={i} d={d} size={52} style={{ color: 'var(--green)', animationDelay: (i * 0.75).toFixed(2) + 's' }} />)}
              </div>
              <div className="recipe__question">what will we be cooking tonight?</div>
              <div className="progress" />
            </div>
          ) : (
            <>
              <div className="recipe__art">
                <div className="recipe__disc"><Icon d={DISH_ICON[style]} size={64} style={{ color: 'var(--green)' }} /></div>
                <div className="recipe__kind">{DISH_KIND[style]}</div>
              </div>
              <div className="recipe__body">
                <div className="kicker">This evening</div>
                <h3 className="recipe__dish">{dishOf(it[0], it[1], it[2])}</h3>
                <div className="chip-row">
                  {s.method && <span className="tag tone-green">Method · {s.method}</span>}
                  {it.map(i => {
                    const tone = toneOf(i.name);
                    return (
                      <span key={i.name} className={'tag tone-' + tone}>
                        {i.name}{tone === 'soon' ? ' · use it up' : tone === 'buy' ? ' · to buy' : ''}
                      </span>
                    );
                  })}
                </div>
                <div className="recipe__actions">
                  <button type="button" className="btn" onClick={s.cookIt}>Into the pot</button>
                  <button type="button" className="btn btn--outline" onClick={s.spin}>Again</button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="soon-list">
          <div className="kicker">Use these first</div>
          <div className="chip-row">
            {expiring.map(p => (
              <span key={p.name} className="soon-chip">{p.name} · {p.days === 1 ? 'today' : p.days + ' days'}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
