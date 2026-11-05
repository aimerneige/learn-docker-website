export interface LineDiff {
  /** Indexes (in `next`) of lines that are new. */
  added: Set<number>;
  /** Indexes (in `next`) of lines that have at least one deleted line right before them. */
  removedBefore: Set<number>;
  /** True when lines were deleted at the very end. */
  removedAtEnd: boolean;
  changed: number;
}

/** Line-level LCS diff; inputs are small (< 200 lines) so O(n·m) is fine. */
export function diffLines(prev: string[], next: string[]): LineDiff {
  const n = prev.length;
  const m = next.length;
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = prev[i] === next[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const added = new Set<number>();
  const removedBefore = new Set<number>();
  let removed = 0;
  let pending = false;
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (prev[i] === next[j]) {
      if (pending) removedBefore.add(j);
      pending = false;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      pending = true;
      removed++;
      i++;
    } else {
      if (pending) removedBefore.add(j);
      pending = false;
      added.add(j++);
    }
  }
  while (j < m) {
    if (pending) removedBefore.add(j);
    pending = false;
    added.add(j++);
  }
  const removedAtEnd = pending || i < n;
  removed += n - i;
  return { added, removedBefore, removedAtEnd, changed: Math.max(added.size, removed) };
}
