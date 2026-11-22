export const MAX_SUGGESTION_IMAGES = 20;

export function isWithinSuggestionImageLimit(count: number): boolean {
  return Number.isInteger(count) && count >= 0 && count <= MAX_SUGGESTION_IMAGES;
}