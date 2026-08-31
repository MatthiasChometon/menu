// Break `text` into lines no wider than `limit`, measuring each candidate with
// the given function (the canvas' own text metrics at render time). A word longer
// than the limit still gets its own line rather than being dropped.
export const wrap = (text: string, limit: number, measure: (line: string) => number): string[] => {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = `${current} ${word}`.trim();
    if (current !== '' && measure(candidate) > limit) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current !== '') lines.push(current);
  return lines;
};
