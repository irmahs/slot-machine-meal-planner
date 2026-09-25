/**
 * Features that are built but switched off.
 *
 * `history` — the Cooked screen and everything behind it. The two tables it
 * needs are deliberately absent from the schema, so turning this on means a new
 * migration adding meal_planner_history and a link table alongside it. With it
 * off, "Into the pot" still pushes the drawn ingredients' use-by dates back;
 * nothing is recorded.
 */
export const FEATURES = {
  history: false,
} as const;
