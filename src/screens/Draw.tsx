import { useMemo, type Dispatch } from 'react';
import { Icon } from '../components/Icon';
import {
  CATEGORIES,
  COOK_ICONS,
  DISH_ICON,
  DISH_KIND,
  labelOfCategory,
  type CategoryCode,
} from '../data/reference';
import type { Ingredient } from '../data/model';
import {
  CELL_H,
  STRIP_REPEATS,
  canSpin,
  daysLeft,
  dishName,
  emptyReels,
  ingredientOf,
  methodOf,
  reelsFrom,
  styleOf,
  type Triple,
} from '../engine/reel';
import type { Action, PlannerState } from '../state/planner';

interface DrawProps {
  state: PlannerState;
  dispatch: Dispatch<Action>;
  onSpin: () => void;
}

const listOf = (words: string[]) =>
  words.length === 1 ? words[0] : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;

export function Draw({ state, dispatch, onSpin }: DrawProps) {
  const reels = useMemo(
    () => reelsFrom(state.pantry, state.catalogue),
    [state.pantry, state.catalogue],
  );
  const ready = canSpin(reels);
  const settled = state.picked !== null && !state.spinning;

  const picks = (state.picked ?? [null, null, null]).map((name) =>
    name ? ingredientOf(state.catalogue, name) : undefined,
  ) as Triple<Ingredient | undefined>;
  const style = styleOf(picks[2]);
  const method = methodOf(state.method);

  const expiring = [...state.pantry]
    .filter((p) => daysLeft(p) <= 3)
    .sort((a, b) => daysLeft(a) - daysLeft(b));

  const missing = emptyReels(reels).map((c) => labelOfCategory(c).toLowerCase());
  const hint = !ready
    ? `Stock ${listOf(missing)} to draw.`
    : state.spinning
      ? 'Turning over…'
      : settled
        ? 'Click a column to hold it, then draw again.'
        : 'Draw three — or press';

  const toneOf = (name: string) => {
    const stocked = state.pantry.find((p) => p.name === name);
    return !stocked ? 'buy' : daysLeft(stocked) <= 3 ? 'soon' : 'fresh';
  };

  return (
    <div className="draw">
      <section className="draw__left" aria-label="Reels">
        <div className="day-head">
          <div className="day-head__day">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long' })}
          </div>
          <h2 className="day-head__title">what the pantry holds</h2>
          <div className="day-head__rule" />
        </div>

        <div className="reels">
          <div className="payline" />
          {reels.map((list, k) => {
            const label = CATEGORIES[k].label;
            const locked = state.locks[k];
            const empty = list.length === 0;
            const toggle = () => !empty && dispatch({ type: 'reel/toggleLock', reel: k });
            return (
              <div
                key={CATEGORIES[k].code}
                className="reel"
                role="button"
                tabIndex={empty ? -1 : 0}
                aria-pressed={locked}
                aria-label={empty ? `${label} reel, empty` : `${label} reel`}
                title={empty ? 'Nothing stocked' : locked ? 'Release this column' : 'Hold this column'}
                onClick={toggle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                  }
                }}
              >
                <div className="reel__fade" />
                {empty ? (
                  <div className="cell" style={{ height: '100%' }}>
                    <div className="cell__name">nothing stocked</div>
                    <div className="note tone-buy">add {label.toLowerCase()}</div>
                  </div>
                ) : (
                  <div
                    className="reel__strip"
                    style={{
                      transform: `translateY(${-state.idx[k] * CELL_H}px)`,
                      transitionDuration: state.dur[k],
                    }}
                  >
                    {Array.from({ length: STRIP_REPEATS }, (_, r) =>
                      list.map((item, i) => {
                        const left = daysLeft(item);
                        return (
                          <div key={`${r}:${i}`} className="cell">
                            <div className="cell__name">{item.name}</div>
                            <div className={'note tone-' + (left <= 3 ? 'soon' : 'fresh')}>
                              {left > 30 ? 'stocked' : left < 0 ? 'overdue' : left === 0 ? 'today' : left === 1 ? '1 day' : `${left} days`}
                            </div>
                          </div>
                        );
                      }),
                    )}
                  </div>
                )}
                <div className="reel__foot">{locked ? 'held' : label}</div>
              </div>
            );
          })}
        </div>

        <div className="draw__cta">
          <button
            type="button"
            className={'btn draw__btn' + (ready ? '' : ' btn--muted')}
            onClick={onSpin}
            aria-disabled={!ready}
            disabled={state.spinning || !ready}
          >
            Draw three
          </button>
          <div className="hint" aria-live="polite">
            <span>{hint}</span>
            {ready && !state.spinning && !settled && <kbd className="kbd">SPACE</kbd>}
          </div>
        </div>
      </section>

      <section className="stack" style={{ gap: 18 }} aria-label="Tonight's dish">
        <div className="recipe">
          {!settled ? (
            <div className="recipe__empty">
              <div className="loader" aria-hidden="true">
                {COOK_ICONS.map((d, i) => (
                  <Icon
                    key={i}
                    d={d}
                    size={52}
                    style={{ color: 'var(--green)', animationDelay: `${(i * 0.75).toFixed(2)}s` }}
                  />
                ))}
              </div>
              <div className="recipe__question">what will we be cooking tonight?</div>
              <div className="progress" />
            </div>
          ) : (
            <>
              <div className="recipe__art">
                <div className="recipe__disc">
                  <Icon d={DISH_ICON[style]} size={64} style={{ color: 'var(--green)' }} />
                </div>
                <div className="recipe__kind">{DISH_KIND[style]}</div>
              </div>
              <div className="recipe__body">
                <div className="kicker">This evening</div>
                <h3 className="recipe__dish">{dishName(picks, state.method)}</h3>
                <div className="chip-row">
                  {method && <span className="tag tone-green">Method · {method.label}</span>}
                  {picks.map((i, k) =>
                    i ? (
                      <span key={i.name} className={'tag tone-' + toneOf(i.name)}>
                        {i.name}
                        {toneOf(i.name) === 'soon' ? ' · use it up' : ''}
                      </span>
                    ) : (
                      <span key={k} className="tag tone-buy">
                        no {labelOfCategory(CATEGORIES[k].code as CategoryCode).toLowerCase()}
                      </span>
                    ),
                  )}
                </div>
                <div className="recipe__actions">
                  <button type="button" className="btn" onClick={() => dispatch({ type: 'dish/cook' })}>
                    Into the pot
                  </button>
                  <button type="button" className="btn btn--outline" onClick={onSpin}>
                    Again
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {expiring.length > 0 && (
          <div className="soon-list">
            <div className="kicker">Use these first</div>
            <div className="chip-row">
              {expiring.map((p) => {
                const left = daysLeft(p);
                return (
                  <span key={p.name} className="soon-chip">
                    {p.name} · {left <= 0 ? 'today' : left === 1 ? 'tomorrow' : `${left} days`}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
