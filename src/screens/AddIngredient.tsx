import type { Dispatch } from 'react';
import { Icon } from '../components/Icon';
import { Switch } from '../components/Switch';
import {
  CATEGORIES,
  CATEGORY_ICON,
  DATE_PRESETS,
  UNITS,
  type CategoryCode,
  type UnitCode,
} from '../data/reference';
import { addDaysISO, daysUntil, todayISO } from '../lib/dates';
import { kindOfDraft, kindsFor, type Action, type PlannerState } from '../state/planner';

interface Props {
  state: PlannerState;
  dispatch: Dispatch<Action>;
}

/**
 * Describing a new ingredient: its name, which reel it spins on, and what kind
 * it is. The kind is what a dish name and the diet filters read, which is why
 * it is asked for once here rather than guessed later.
 */
export function AddIngredient({ state, dispatch }: Props) {
  const d = state.draft;
  const patch = (p: Partial<typeof d>) => dispatch({ type: 'draft/patch', patch: p });
  const kinds = kindsFor(d.category);
  const current = kindOfDraft(d);
  const hint = kinds.find((k) => k.code === current)?.examples;

  const pickKind = (code: string) =>
    patch(
      d.category === 'protein'
        ? { proteinKind: code }
        : d.category === 'vegetable'
          ? { vegetableKind: code }
          : { starchKind: code },
    );

  const dateSub =
    d.days === 0
      ? 'Use it today.'
      : `${new Date(`${addDaysISO(d.days)}T12:00:00`).toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })} · ${d.days} ${d.days === 1 ? 'day' : 'days'} from now`;

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        dispatch({ type: 'draft/submit' });
      }}
    >
      <div className="field">
        <label htmlFor="ing-name" className="kicker">Ingredient</label>
        <input
          id="ing-name"
          className="text-input text-input--name"
          value={d.name}
          placeholder="e.g. Halloumi"
          onChange={(e) => patch({ name: e.target.value })}
        />
      </div>

      <div className="field">
        <label htmlFor="ing-short" className="kicker">Short name</label>
        <input
          id="ing-short"
          className="text-input"
          value={d.shortName}
          placeholder={d.name.trim() || 'optional'}
          onChange={(e) => patch({ shortName: e.target.value })}
        />
        <div className="body-sm">
          What a dish name calls it. “Chicken Thighs” cooks as “Chicken”. Leave it empty to use the
          full name.
        </div>
      </div>

      <div className="field" role="group" aria-labelledby="which-reel">
        <div id="which-reel" className="kicker">Which reel?</div>
        <div className="cat-cards">
          {CATEGORIES.map((c) => (
            <button
              key={c.code}
              type="button"
              className="cat-card"
              aria-pressed={d.category === c.code}
              onClick={() => patch({ category: c.code as CategoryCode })}
            >
              <Icon d={CATEGORY_ICON[c.code]} size={32} />
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field" role="group" aria-labelledby="kind-label">
        <div id="kind-label" className="kicker">
          {d.category === 'protein' ? 'What kind' : 'What type'}
        </div>
        <div className="chip-row">
          {kinds.map((k) => (
            <button
              key={k.code}
              type="button"
              className="chip"
              title={k.examples}
              aria-pressed={current === k.code}
              onClick={() => pickKind(k.code)}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="body-sm">{hint}</div>
        {d.category === 'starch' && (
          <button
            type="button"
            className="gf-toggle"
            role="switch"
            aria-checked={d.glutenFree}
            onClick={() => patch({ glutenFree: !d.glutenFree })}
          >
            <Switch on={d.glutenFree} />
            Gluten-free
          </button>
        )}
      </div>

      <button
        type="button"
        className="check-card"
        role="checkbox"
        aria-checked={d.have}
        onClick={() => patch({ have: !d.have })}
      >
        <span className={'tick' + (d.have ? ' tick--on' : '')}>{d.have ? '✓' : ''}</span>
        <span style={{ flex: 1 }}>
          <span className="check-card__title">It’s in my pantry now</span>
          <span className="body-sm check-card__sub">
            {d.have
              ? 'Goes into the pantry, starts counting down, and can be drawn.'
              : 'Goes on the shopping list. Only what is in the pantry ever spins.'}
          </span>
        </span>
      </button>

      {d.have && (
        <>
          <div className="field">
            <label htmlFor="ing-date" className="kicker">Use by</label>
            <div className="date-row">
              <input
                id="ing-date"
                type="date"
                className="text-input text-input--date"
                value={addDaysISO(d.days)}
                min={todayISO()}
                onChange={(e) => {
                  if (e.target.value) patch({ days: Math.max(0, daysUntil(e.target.value)) });
                }}
              />
              {DATE_PRESETS.map(([n, label]) => (
                <button
                  key={n}
                  type="button"
                  className="chip"
                  aria-pressed={d.days === n}
                  onClick={() => patch({ days: n })}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="body-sm">{dateSub}</div>
          </div>

          <div className="field">
            <label htmlFor="ing-qty" className="kicker">How much</label>
            <div className="qty-row">
              <input
                id="ing-qty"
                className="text-input"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                placeholder="250"
                value={d.qty}
                onChange={(e) => patch({ qty: e.target.value })}
              />
              <select
                aria-label="Unit"
                className="unit-select"
                value={d.unit}
                onChange={(e) => patch({ unit: e.target.value as UnitCode })}
              >
                {UNITS.map((u) => (
                  <option key={u.code} value={u.code}>{u.code}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      <button
        type="submit"
        className={'btn submit' + (d.name.trim() ? '' : ' btn--muted')}
        aria-disabled={!d.name.trim()}
      >
        Add to the {CATEGORIES.find((c) => c.code === d.category)?.label.toLowerCase()} reel
      </button>
      {state.flash && <div className="flash" role="status">{state.flash}</div>}
    </form>
  );
}
