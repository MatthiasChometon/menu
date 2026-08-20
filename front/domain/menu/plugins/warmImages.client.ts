// Fills the photograph cache in the background, so a week already looked at is
// still illustrated in a shop with no signal — which is what the offline mode
// exists for.
//
// Deliberately NOT what the removed <link rel="prefetch"> did. Those fired
// during load, competing with the page's own HTML, CSS and script: the reader
// waited behind pictures nobody had asked to see. This starts only once the
// browser is idle, two at a time, and never blocks anything.
const CONCURRENCY = 2;

// Slow enough that the browser has finished the real work, short enough that a
// visit of a few seconds still warms the week.
const START_DELAY_MS = 1200;

type SaverConnection = { saveData?: boolean; effectiveType?: string };

const shouldHoldBack = (): boolean => {
  const connection = (navigator as Navigator & { connection?: SaverConnection }).connection;
  if (connection === undefined) return false;

  // Data saver on, or a connection that would take minutes: downloading eight
  // megabytes nobody asked for would be taking a decision that is not ours.
  return connection.saveData === true || ['slow-2g', '2g'].includes(connection.effectiveType ?? '');
};

const whenIdle = (run: () => void): void => {
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => void })
    .requestIdleCallback;

  if (idle === undefined) window.setTimeout(run, START_DELAY_MS);
  else idle((): void => window.setTimeout(run, START_DELAY_MS));
};

// An Image rather than fetch(): the service worker keeps photographs under a
// rule that matches requests whose destination is an image, and a bare fetch
// would be fetched and then not kept — the one thing this must not do.
const load = (url: string): Promise<void> =>
  new Promise((resolve): void => {
    const image = new Image();
    if (new URL(url, location.href).origin !== location.origin) image.crossOrigin = 'anonymous';
    image.onload = (): void => resolve();
    image.onerror = (): void => resolve();
    image.src = url;
  });

const warm = async (urls: string[]): Promise<void> => {
  const queue = [...urls];

  // A handful of workers rather than all at once: the point is to stay behind
  // whatever the reader does next, not to race it.
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async (): Promise<void> => {
      for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
        await load(next);
      }
    }),
  );
};

export default defineNuxtPlugin((): void => {
  if (shouldHoldBack()) return;

  const { everyImage, recipeImage, foodImage } = useImages();
  const { selectedMenu } = useSelectedWeek();

  whenIdle((): void => {
    const menu = selectedMenu.value;

    // This week's dishes first — they are the ones needed in the aisle. A visit
    // cut short then leaves the useful half cached rather than eight lunches
    // from a week nobody will cook.
    const thisWeek = [
      ...(menu?.recipes ?? []).map((recipe): string | undefined => recipeImage(recipe.id)),
      ...(menu?.shoppingList ?? []).map((line): string | undefined => foodImage(line.food.id)),
    ].filter((url): url is string => url !== undefined);

    const first = [...new Set(thisWeek)];
    const rest = everyImage().filter((url): boolean => !first.includes(url));

    void warm([...first, ...rest]);
  });
});
