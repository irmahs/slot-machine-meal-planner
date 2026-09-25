import { describe, expect, it } from "vitest";

import { whyLoadFailed } from "./vocab";

describe("whyLoadFailed", () => {
  it("reads a table missing from the schema cache as migrations not applied", () => {
    expect(
      whyLoadFailed({
        code: "PGRST205",
        message:
          "Could not find the table 'public.meal_planner_categories' in the schema cache",
      })
    ).toBe("missing");
    expect(
      whyLoadFailed({ code: "42P01", message: "relation does not exist" })
    ).toBe("missing");
  });

  it("reads a rejected key or a missing grant as refused", () => {
    expect(whyLoadFailed({ code: "", message: "Invalid API key" })).toBe(
      "refused"
    );
    expect(whyLoadFailed({ code: "PGRST301", message: "JWT expired" })).toBe(
      "refused"
    );
    expect(
      whyLoadFailed({
        code: "42501",
        message: "permission denied for table meal_planner_units",
      })
    ).toBe("refused");
  });

  it("reads anything else, a failed fetch included, as unreachable", () => {
    expect(
      whyLoadFailed({ code: "", message: "TypeError: Failed to fetch" })
    ).toBe("unreachable");
    expect(whyLoadFailed(new Error("Supabase is not configured"))).toBe(
      "unreachable"
    );
  });
});
