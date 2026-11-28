// The script every page loads before anything else. Its gzipped size is the cost the
// Lighthouse simulation charges to LCP and TBT, which is why it has a ceiling: 196 681 B
// were measured once the recipe and food catalogues left it (220 KB before), and a build
// that grows it past this fails instead of drifting back.
export const ENTRY_CHUNK_BUDGET_GZIP_BYTES = 160_000;

const ENTRY_SCRIPT = /<script type="module" src="([^"]+)"/;

export const entryScriptOf = (html: string): string | undefined => ENTRY_SCRIPT.exec(html)?.[1];

// A reference to a food inside a recipe's steps, such as "|leanBeef}": it is written nowhere
// but in the recipe catalogue, so finding it in the entry script means the catalogue is back.
const STEP_REFERENCE = /\|[A-Za-z]+\}/;

export const catalogueMarkerOf = (recipesJson: string): string | undefined =>
  STEP_REFERENCE.exec(recipesJson)?.[0];

export const entryChunkProblemsOf = (
  entry: { gzipBytes: number; source: string },
  recipesJson: string,
): string[] => {
  const marker = catalogueMarkerOf(recipesJson);
  const problems: string[] = [];

  if (entry.gzipBytes > ENTRY_CHUNK_BUDGET_GZIP_BYTES)
    problems.push(
      `the entry script weighs ${entry.gzipBytes} B gzipped, over ${ENTRY_CHUNK_BUDGET_GZIP_BYTES} B`,
    );
  if (marker === undefined) problems.push('recipes.json holds no step reference to look for');
  else if (entry.source.includes(marker))
    problems.push('the entry script carries the recipe catalogue again');

  return problems;
};
