import { describe, expect, it } from "vitest";

import { isWithinSuggestionImageLimit } from "./study.validation";

describe("suggestion image limit", () => {
  it("accepts the requested maximum of 20 images", () => {
    expect(isWithinSuggestionImageLimit(20)).toBe(true);
  });

  it("rejects more than 20 images", () => {
    expect(isWithinSuggestionImageLimit(21)).toBe(false);
  });
});