/**
 * Compute the character-level difference between two strings.
 * Returns the substrings that appear in `oldStr` but not in `newStr`
 * (i.e. what was removed). These are the candidates for a diff regex.
 *
 * Uses a simple longest common subsequence approach to find removed segments.
 */
export function computeCharDiff(oldStr: string, newStr: string): string[] {
  // Find common prefix
  let prefixLen = 0;
  while (prefixLen < oldStr.length && prefixLen < newStr.length && oldStr[prefixLen] === newStr[prefixLen]) {
    prefixLen++;
  }

  // Find common suffix (from what remains after prefix)
  let suffixLen = 0;
  while (
    suffixLen < oldStr.length - prefixLen &&
    suffixLen < newStr.length - prefixLen &&
    oldStr[oldStr.length - 1 - suffixLen] === newStr[newStr.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const oldMiddle = oldStr.slice(prefixLen, oldStr.length - suffixLen);
  const newMiddle = newStr.slice(prefixLen, newStr.length - suffixLen);

  // If only the old side has content in the middle, that's what was removed
  // If both have content, return both (the removed part is what matters for diff regex)
  const removed: string[] = [];
  if (oldMiddle) removed.push(oldMiddle);

  // Also check the new side — if something was added, include it too
  // (the user can decide which to use)
  return removed.length > 0 ? removed : (newMiddle ? [newMiddle] : []);
}

/**
 * Escape a string for use as a regex literal.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
