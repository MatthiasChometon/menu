import { api } from '../browser';

// The one API this extension talks to. Filled in for the reader, so pairing is
// pasting a token at most — never typing a URL nobody has memorised.
const DEFAULT_ENDPOINT = 'https://api.menu.mtxlab.xyz/graphql';

const field = (id: string): HTMLInputElement | null =>
  document.querySelector<HTMLInputElement>(`#${id}`);

const statusLine = document.querySelector<HTMLParagraphElement>('#status');

const load = async (): Promise<void> => {
  const saved = await api.storage.local.get(['endpoint', 'deviceToken']);
  const endpoint = field('endpoint');
  if (endpoint !== null) {
    endpoint.value = typeof saved.endpoint === 'string' ? saved.endpoint : DEFAULT_ENDPOINT;
  }

  // The token is never read back into the form: it is shown once, at pairing.
  if (statusLine !== null && typeof saved.deviceToken === 'string') {
    statusLine.textContent = 'Ce navigateur est appairé.';
  }
};

document.querySelector('#save')?.addEventListener('click', (): void => {
  const endpoint = field('endpoint')?.value.trim();
  const token = field('token')?.value.trim();

  if (endpoint === undefined || endpoint === '') {
    if (statusLine !== null) {
      statusLine.textContent = "Il manque l'adresse de l'API.";
    }
    return;
  }

  const stored: Record<string, string> = { endpoint };
  if (token !== undefined && token !== '') {
    stored.deviceToken = token;
  }

  void api.storage.local.set(stored).then((): void => {
    if (statusLine !== null) {
      statusLine.textContent = 'Enregistré.';
    }
    const tokenField = field('token');
    if (tokenField !== null) {
      tokenField.value = '';
    }
  });
});

void load();
