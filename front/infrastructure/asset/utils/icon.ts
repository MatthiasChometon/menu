// The plate motif shared by the PWA icons and the link-preview cards: a white
// plate on a lime gradient with three wedges for protein / carbs / fat. Pure
// geometry and palette; the canvas rendering lives in the runners.

export const PLATE_PALETTE = {
  top: '#84cc16',
  bottom: '#3f6212',
  plate: '#ffffff',
  wedges: ['#ecfccb', '#bef264', '#65a30d'],
};

const deg = (value: number): number => (value * Math.PI) / 180;

// Three equal wedges starting from the top, in radians.
export const plateWedges = (): { start: number; end: number }[] =>
  PLATE_PALETTE.wedges.map((_, index): { start: number; end: number } => ({
    start: deg(-90 + index * 120),
    end: deg(-90 + (index + 1) * 120),
  }));

export const FAVICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" stop-color="#84cc16"/><stop offset="1" stop-color="#3f6212"/>' +
  '</linearGradient></defs>' +
  '<rect width="64" height="64" rx="14" fill="url(#g)"/>' +
  '<circle cx="32" cy="32" r="21" fill="#fff"/>' +
  '<path d="M32 15a17 17 0 0 1 14.7 8.5L32 32Z" fill="#ecfccb"/>' +
  '<path d="M46.7 23.5a17 17 0 0 1 0 17L32 32Z" fill="#bef264"/>' +
  '<path d="M46.7 40.5A17 17 0 0 1 17.3 40.5L32 32Z" fill="#65a30d"/>' +
  '<circle cx="32" cy="32" r="7" fill="#fff"/>' +
  '</svg>\n';
