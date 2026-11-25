// Solving every allowed swap for a whole week is thousands of buildDay/solve
// calls; run on the spot in one go, they freeze the tab for seconds and the
// button reads as if it had crashed. Handing the frame back between passes lets
// the grid repaint and the spinner turn, so the wait is visible progress
// instead of a dead page.
export const yieldToBrowser = (): Promise<void> =>
  new Promise((resolve): void => {
    setTimeout(resolve);
  });
