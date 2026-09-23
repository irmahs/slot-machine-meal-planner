import { DIETS, REPEAT_OPTIONS } from '../data';
import { Switch } from '../components/Switch';
import type { Store } from '../useSpinSupper';

export function ReelRules({ s }: { s: Store }) {
  return (
    <div className="rules">
      <div className="rcard">
        <div className="kicker">What stays off the reels</div>
        <div className="chip-row">
          {DIETS.map(d => (
            <button key={d} type="button" className="diet-chip" aria-pressed={s.diets.includes(d)} onClick={() => s.toggleDiet(d)}>{d}</button>
          ))}
        </div>
      </div>
      <div className="rcard" style={{ gap: 16 }}>
        <div className="repeat-head">
          <div className="kicker">Don't repeat a dish for</div>
          <div className="repeat-val">{s.repeatDays} days</div>
        </div>
        <div className="seg">
          {REPEAT_OPTIONS.map(d => (
            <button key={d} type="button" aria-pressed={s.repeatDays === d} onClick={() => s.setRepeatDays(d)}>{d} days</button>
          ))}
        </div>
      </div>
      <button type="button" className="weight-card" role="switch" aria-checked={s.weighting} onClick={s.toggleWeighting}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="weight-card__title">Weight the reels by expiry</span>
          <span className="weight-card__body">Anything with two days left comes up about four times as often.</span>
        </span>
        <Switch on={s.weighting} large />
      </button>
      <p className="footnote">Rules apply to the next draw. A held column is never overridden.</p>
    </div>
  );
}
