export const MAX_SUGGESTION_IMAGES = 20;
export const ANSWER_BATCH_SIZE = 8;

export function isWithinSuggestionImageLimit(count: number): boolean {
  return Number.isInteger(count) && count >= 0 && count <= MAX_SUGGESTION_IMAGES;
}

export function createQuestionBatches<T>(items: T[], batchSize = ANSWER_BATCH_SIZE): T[][] {
  if (!Number.isInteger(batchSize) || batchSize < 1) return [];
  const batches: T[][] = [];
  for (let offset = 0; offset < items.length; offset += batchSize) {
    batches.push(items.slice(offset, offset + batchSize));
  }
  return batches;
}

export function hasCompleteQuestionCoverage(expectedIds: string[], answerIds: string[]): boolean {
  if (expectedIds.length !== answerIds.length) return false;
  const expected = new Set(expectedIds);
  const answered = new Set(answerIds);
  return expected.size === expectedIds.length && answered.size === answerIds.length &&
    expectedIds.every((id) => answered.has(id));
}