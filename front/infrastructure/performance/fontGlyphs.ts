// The glyphs a site displays: every character, within the Latin blocks the self-hosted fonts
// cover, that appears in the pages, scripts and payloads it ships (fr and en text included). A
// character typed by a reader that is not among them is drawn by the fallback font, as it
// already is for anything outside the font's Latin range.
const isLatinGlyph = (codePoint: number): boolean =>
  (codePoint >= 0x20 && codePoint <= 0x2ff) ||
  (codePoint >= 0x2000 && codePoint <= 0x206f) ||
  codePoint === 0x20ac ||
  codePoint === 0x2122 ||
  codePoint === 0x2212 ||
  (codePoint >= 0x2190 && codePoint <= 0x2193);

export const glyphsOf = (sources: string[]): string => {
  const glyphs = new Set<string>();
  for (const source of sources)
    for (const glyph of source) if (isLatinGlyph(glyph.codePointAt(0) ?? 0)) glyphs.add(glyph);

  return [...glyphs].sort().join('');
};
