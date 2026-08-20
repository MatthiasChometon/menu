const field = (id: string): HTMLInputElement | null =>
  document.querySelector<HTMLInputElement>(`#${id}`);

const statusLine = document.querySelector<HTMLParagraphElement>('#status');

const load = async (): Promise<void> => {
  const saved = await chrome.storage.local.get(['endpoint', 'deviceToken']);
  const endpoint = field('endpoint');
  if (endpoint !== null && typeof saved.endpoint === 'string') {
    endpoint.value = saved.endpoint;
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

  void chrome.storage.local.set(stored).then((): void => {
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
