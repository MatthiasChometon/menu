declare module 'subset-font' {
  const subsetFont: (
    font: Uint8Array,
    text: string,
    options: { targetFormat: 'woff2' | 'woff' | 'sfnt' },
  ) => Promise<Uint8Array>;
  export default subsetFont;
}
