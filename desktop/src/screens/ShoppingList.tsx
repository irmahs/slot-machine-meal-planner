import { useState } from 'react';
import type { Store } from '../useSpinSupper';

export function ShoppingList({ s }: { s: Store }) {
  const [draft, setDraft] = useState('');
  const add = () => { if (s.addGrocery(draft)) setDraft(''); };

  return (
    <div className="page-narrow">
      <p className="intro">Built from the dishes you said yes to, minus whatever's already in the pantry. Add anything else yourself.</p>
      <div className="add-row">
        <input aria-label="Add to the list" value={draft} placeholder="Add to the list…" onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" className="btn" onClick={add}>Add</button>
      </div>
      <ul className="rows">
        {s.grocery.map(g => (
          <li key={g.name} className={'lrow' + (g.got ? ' lrow--done' : '')}>
            <button type="button" className="lrow__main" role="checkbox" aria-checked={g.got} onClick={() => s.toggleGrocery(g.name)}>
              <span className={'tick' + (g.got ? ' tick--on' : '')}>{g.got ? '✓' : ''}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="lrow__name">{g.name}</span>
                <span className="lrow__why">{g.why}</span>
              </span>
            </button>
            <button type="button" className="stock-btn" onClick={() => s.stockGrocery(g.name)}>Into pantry</button>
            <button type="button" className="icon-x" aria-label={'Remove ' + g.name} onClick={() => s.removeGrocery(g.name)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
