import { DISH_ICON } from '../data';
import { Icon } from '../components/Icon';
import type { Store } from '../useSpinSupper';

export function Cooked({ s }: { s: Store }) {
  return (
    <div className="cooked">
      <div className="stack" style={{ gap: 12 }}>
        <div className="stat">
          <div className="stat__num">{s.plan.length}</div>
          <div className="stat__cap">dishes drawn this week</div>
        </div>
        <div className="stat stat--fresh">
          <div className="stat__num">{new Set(s.plan.map(p => p.dish)).size}</div>
          <div className="stat__cap">without a single repeat</div>
        </div>
      </div>
      <ol className="history">
        {s.plan.map((e, i) => (
          <li key={i} className={'hrow' + (i === 0 ? ' hrow--latest' : '')}>
            <div className="hrow__icon"><Icon d={DISH_ICON[e.style]} size={30} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="hrow__dish">{e.dish}</div>
              <div className="body-sm hrow__sub">{e.sub}</div>
            </div>
            <div className="hrow__day">{e.day}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
