import { useState } from 'react';
import { Switch } from '../components/Switch';
import type { Store } from '../useSpinSupper';

export function CookingMethods({ s }: { s: Store }) {
  const [draft, setDraft] = useState('');
  const add = () => { if (s.addMethod(draft)) setDraft(''); };

  return (
    <div className="page-narrow">
      <p className="intro">Each draw picks one of the methods switched on here. Switch off anything you don't feel like doing this week.</p>
      <div className="add-row">
        <input aria-label="Add a cooking method" value={draft} placeholder="Add a cooking method…" onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" className="btn" onClick={add}>Add</button>
      </div>
      <ul className="rows">
        {s.methods.map(m => (
          <li key={m.name} className={'lrow' + (m.on ? '' : ' lrow--done')}>
            <span className="lrow__name" style={{ flex: 1, minWidth: 0 }}>{m.name}</span>
            <button type="button" className="method-toggle" role="switch" aria-checked={m.on} aria-label={m.name} onClick={() => s.toggleMethod(m.name)}>
              {m.on ? 'On' : 'Off'}
              <Switch on={m.on} />
            </button>
            <button type="button" className="icon-x" aria-label={'Remove ' + m.name} onClick={() => s.removeMethod(m.name)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
