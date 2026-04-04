/**
 * Segment-by-segment semver comparison.
 * Returns true if `current` is strictly lower than `minimum`.
 */
export function isVersionLower(current: string, minimum: string): boolean {
  const cur = current.split('.').map(Number);
  const min = minimum.split('.').map(Number);
  for (let i = 0; i < Math.max(cur.length, min.length); i++) {
    const c = cur[i] || 0;
    const m = min[i] || 0;
    if (c < m) return true;
    if (c > m) return false;
  }
  return false;
}
