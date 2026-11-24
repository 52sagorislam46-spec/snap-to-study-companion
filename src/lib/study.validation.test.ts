import { describe, expect, it } from "vitest";

import {
  ANSWER_BATCH_SIZE,
  createQuestionBatches,
  hasCompleteQuestionCoverage,
  isWithinSuggestionImageLimit,
} from "./study.validation";

describe("suggestion image limit", () => {
  it("accepts the requested maximum of 20 images", () => {
    expect(isWithinSuggestionImageLimit(20)).toBe(true);
  });

  it("rejects more than 20 images", () => {
    expect(isWithinSuggestionImageLimit(21)).toBe(false);
  });
});

describe("complete suggestion answer batches", () => {
  it("keeps all 1,000 suggestion items across bounded answer batches", () => {
    const questions = Array.from({ length: 1_000 }, (_, index) => `question-${index + 1}`);
    const batches = createQuestionBatches(questions);

    expect(batches.every((batch) => batch.length <= ANSWER_BATCH_SIZE)).toBe(true);
    expect(batches.flat()).toEqual(questions);
    expect(batches.flat()).toHaveLength(1_000);
  });

  it("rejects an answer response that omits or duplicates an item", () => {
    expect(hasCompleteQuestionCoverage(["q1", "q2"], ["q1", "q2"])).toBe(true);
    expect(hasCompleteQuestionCoverage(["q1", "q2"], ["q1"])).toBe(false);
    expect(hasCompleteQuestionCoverage(["q1", "q2"], ["q1", "q1"])).toBe(false);
  });
});