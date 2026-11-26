// Everything a person (or a shop) wrote and that lands in an HTML mail goes
// through here: an email client renders the same HTML a browser does.
export const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
