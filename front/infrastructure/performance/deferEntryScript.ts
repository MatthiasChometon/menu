// The entry script is 169 KB gzipped and the pages are prerendered: the first paint needs the
// HTML, the stylesheet and the hero photograph, not the script. Left as a module script in the
// head it is requested before the photograph has arrived and shares the bandwidth with it, so
// the photograph (and the LCP the Lighthouse simulation charges for it) waits on a script that
// does nothing for what is painted. This puts the script after the page has loaded, or after
// four seconds on a page that is slow to finish loading, so hydration is never held up for long.
const MODULE_SCRIPT = /<script type="module" src="([^"]+)"( crossorigin)?><\/script>/;

export const FALLBACK_DELAY_MS = 4000;

const loaderFor = (source: string): string =>
  `<script data-entry="${source}">(()=>{const source=document.currentScript.dataset.entry;let started=false;const start=()=>{if(started)return;started=true;` +
  `const script=document.createElement("script");script.type="module";script.crossOrigin="";` +
  `script.src=source;document.head.append(script)};` +
  `if(document.readyState==="complete")start();else addEventListener("load",start,{once:true});` +
  `setTimeout(start,${FALLBACK_DELAY_MS})})()</script>`;

export const deferEntryScript = (html: string): string => {
  const entry = MODULE_SCRIPT.exec(html);
  if (entry === null) return html;

  return html.replace(MODULE_SCRIPT, (): string => loaderFor(entry[1] ?? ''));
};
