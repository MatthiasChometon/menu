import { browser } from '#imports';

// Pairing is automatic on the menu site now, so the popup asks for nothing. It
// just says whether this browser is wired up, and offers the one useful action:
// open the menu, where everything is set up and the basket is filled.
const MENU_URL = 'https://menu.mtxlab.xyz/courses-auto';

const statusLine = document.querySelector<HTMLParagraphElement>('#status');

const render = async (): Promise<void> => {
  const saved = await browser.storage.local.get('deviceToken');
  const paired = typeof saved.deviceToken === 'string';

  if (statusLine !== null) {
    statusLine.textContent = paired
      ? 'Ce navigateur est branché : le panier se remplit depuis Le Menu.'
      : 'Pas encore branché. Ouvre Le Menu, va sur « Courses » : ça se configure tout seul.';
    statusLine.dataset.paired = String(paired);
  }
};

document.querySelector('#open')?.addEventListener('click', (event: Event): void => {
  event.preventDefault();
  void browser.tabs.create({ url: MENU_URL });
  window.close();
});

void render();
