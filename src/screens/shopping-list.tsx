import { useState } from "react";
import type { Dispatch } from "react";

import { formatQuantity } from "../data/vocab";
import { ingredientOf } from "../engine/reel";
import type { Action, PlannerState } from "../state/planner";

interface Props {
  state: PlannerState;
  dispatch: Dispatch<Action>;
}

export function ShoppingList({ state, dispatch }: Props) {
  const v = state.vocab;
  const [chosen, setChosen] = useState("");

  const addable = state.catalogue
    .filter((i) => !state.grocery.some((g) => g.name === i.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const add = () => {
    if (!chosen) {
      return;
    }
    dispatch({ name: chosen, type: "grocery/add" });
    setChosen("");
  };

  return (
    <div className="page-narrow">
      <p className="intro">
        What to pick up. <strong>Into pantry</strong> moves something across,
        and only what is in the pantry can be drawn.
      </p>
      <div className="add-row">
        <select
          aria-label="Add to the list"
          className="unit-select"
          style={{ flex: 1, minWidth: 0 }}
          value={chosen}
          onChange={(e) => setChosen(e.target.value)}
        >
          <option value="">
            {addable.length ? "Add to the list…" : "Everything is on the list"}
          </option>
          {v.categories.map((c) => {
            const items = addable.filter((i) => i.category === c.code);
            return items.length ? (
              <optgroup key={c.code} label={c.label}>
                {items.map((i) => (
                  <option key={i.name} value={i.name}>
                    {i.name}
                  </option>
                ))}
              </optgroup>
            ) : null;
          })}
        </select>
        <button
          type="button"
          className={`btn${chosen ? "" : " btn--muted"}`}
          onClick={add}
          aria-disabled={!chosen}
        >
          Add
        </button>
      </div>
      {state.grocery.length === 0 && (
        <p className="intro">Nothing to buy. The pantry has it covered.</p>
      )}
      <ul className="rows">
        {state.grocery.map((g) => (
          <li key={g.name} className={`lrow${g.acquired ? " lrow--done" : ""}`}>
            <button
              type="button"
              className="lrow__main"
              role="checkbox"
              aria-checked={g.acquired}
              onClick={() => dispatch({ name: g.name, type: "grocery/toggle" })}
            >
              <span className={`tick${g.acquired ? " tick--on" : ""}`}>
                {g.acquired ? "✓" : ""}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="lrow__name">{g.name}</span>
                <span className="lrow__why">
                  {g.note}
                  {ingredientOf(state.catalogue, g.name)
                    ? ""
                    : " · no longer in your ingredients"}
                  {" · "}
                  {formatQuantity(v, g.qty, g.unit)}
                </span>
              </span>
            </button>
            <button
              type="button"
              className="stock-btn"
              onClick={() => dispatch({ name: g.name, type: "grocery/stock" })}
            >
              Into pantry
            </button>
            <button
              type="button"
              className="icon-x"
              aria-label={`Remove ${g.name}`}
              onClick={() => dispatch({ name: g.name, type: "grocery/remove" })}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
