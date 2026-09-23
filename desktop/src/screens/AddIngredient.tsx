import { CAT_ICON, DATE_PRESETS, LABELS, PROTEIN_KINDS, STARCH_KINDS, UNITS, VEG_KINDS } from '../data';
import { daysTo, isoIn } from '../engine';
import { Icon } from '../components/Icon';
import { Switch } from '../components/Switch';
import type { Store } from '../useSpinSupper';

export function AddIngredient({ s }: { s: Store }) {
  const d = s.draft;
  const kinds: readonly (readonly [string, string, string, ...unknown[]])[] =
    d.cat === 0 ? PROTEIN_KINDS : d.cat === 1 ? VEG_KINDS : STARCH_KINDS;
  const current = d.cat === 0 ? d.kind : d.cat === 1 ? d.veg : d.starch;
  const pickKind = (key: string) =>
    d.cat === 0 ? s.patchDraft({ kind: key }) : d.cat === 1 ? s.patchDraft({ veg: key }) : s.pickStarch(key);
  const hint = kinds.find(k => k[0] === current)?.[2];

  const dateSub = d.days === 0
    ? 'Use it today.'
    : new Date(isoIn(d.days) + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) +
      ' · ' + d.days + (d.days === 1 ? ' day' : ' days') + ' from now';

  return (
    <form className="form" onSubmit={e => { e.preventDefault(); s.submitAdd(); }}>
      <div className="field">
        <label htmlFor="ing-name" className="kicker">Ingredient</label>
        <input id="ing-name" className="text-input text-input--name" value={d.name} placeholder="e.g. Halloumi"
          onChange={e => s.patchDraft({ name: e.target.value })} />
      </div>

      <div className="field" role="group" aria-labelledby="which-reel">
        <div id="which-reel" className="kicker">Which reel?</div>
        <div className="cat-cards">
          {LABELS.map((label, k) => (
            <button key={k} type="button" className="cat-card" aria-pressed={d.cat === k} onClick={() => s.patchDraft({ cat: k })}>
              <Icon d={CAT_ICON[k]} size={32} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field" role="group" aria-labelledby="kind-label">
        <div id="kind-label" className="kicker">{d.cat === 0 ? 'What kind' : 'What type'}</div>
        <div className="chip-row">
          {kinds.map(([key, label, examples]) => (
            <button key={key} type="button" className="chip" title={examples} aria-pressed={current === key} onClick={() => pickKind(key)}>{label}</button>
          ))}
        </div>
        <div className="body-sm">{hint}</div>
        {d.cat === 2 && (
          <button type="button" className="gf-toggle" role="switch" aria-checked={d.gf} onClick={() => s.patchDraft({ gf: !d.gf })}>
            <Switch on={d.gf} />Gluten-free
          </button>
        )}
      </div>

      <div className="field">
        <label htmlFor="ing-date" className="kicker">Use by</label>
        <div className="date-row">
          <input id="ing-date" type="date" className="text-input text-input--date" value={isoIn(d.days)} min={isoIn(0)}
            onChange={e => { if (e.target.value) s.patchDraft({ days: Math.max(0, daysTo(e.target.value)) }); }} />
          {DATE_PRESETS.map(([n, label]) => (
            <button key={n} type="button" className="chip" aria-pressed={d.days === n} onClick={() => s.patchDraft({ days: n })}>{label}</button>
          ))}
        </div>
        <div className="body-sm">{dateSub}</div>
      </div>

      <div className="field">
        <label htmlFor="ing-qty" className="kicker">How much</label>
        <div className="qty-row">
          <input id="ing-qty" className="text-input" type="number" min={0} step="any" inputMode="decimal" placeholder="250"
            value={d.qty} onChange={e => s.patchDraft({ qty: e.target.value })} />
          <select aria-label="Unit" className="unit-select" value={d.unit} onChange={e => s.patchDraft({ unit: e.target.value })}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <button type="button" className="check-card" role="checkbox" aria-checked={d.have} onClick={() => s.patchDraft({ have: !d.have })}>
        <span className={'tick' + (d.have ? ' tick--on' : '')}>{d.have ? '✓' : ''}</span>
        <span style={{ flex: 1 }}>
          <span className="check-card__title">It's in my pantry now</span>
          <span className="body-sm check-card__sub">{d.have ? 'Goes into the pantry and starts counting down.' : 'Goes on the shopping list instead.'}</span>
        </span>
      </button>

      <button type="submit" className={'btn submit' + (d.name.trim() ? '' : ' btn--muted')} aria-disabled={!d.name.trim()}>
        Add to the {LABELS[d.cat].toLowerCase()} reel
      </button>
      {s.flash && <div className="flash" role="status">{s.flash}</div>}
    </form>
  );
}
