// Word-level LCS diff. Splits on whitespace but preserves it as tokens
// so rendered output keeps original spacing.

export type DiffOp =
  | { type: "equal"; text: string }
  | { type: "del"; text: string }
  | { type: "ins"; text: string };

function tokenize(s: string): string[] {
  // Keep whitespace runs as their own tokens so rendering stays faithful.
  return s.match(/\s+|\S+/g) ?? [];
}

function isWord(tok: string): boolean {
  return /\S/.test(tok);
}

export function wordDiff(before: string, after: string): DiffOp[] {
  const a = tokenize(before);
  const b = tokenize(after);

  // LCS table on tokens
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  const push = (type: DiffOp["type"], text: string) => {
    const last = ops[ops.length - 1];
    if (last && last.type === type) last.text += text;
    else ops.push({ type, text });
  };

  while (i < m && j < n) {
    if (a[i] === b[j]) {
      push("equal", a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      // Skip whitespace-only tokens quietly to avoid ugly standalone space deletions
      if (isWord(a[i])) push("del", a[i]);
      else push("equal", a[i]);
      i++;
    } else {
      if (isWord(b[j])) push("ins", b[j]);
      else push("equal", b[j]);
      j++;
    }
  }
  while (i < m) {
    push(isWord(a[i]) ? "del" : "equal", a[i]);
    i++;
  }
  while (j < n) {
    push(isWord(b[j]) ? "ins" : "equal", b[j]);
    j++;
  }

  return ops;
}
