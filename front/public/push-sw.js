// Imported into the generated service worker. Kept as plain JavaScript in
// public/ because Workbox concatenates it verbatim: nothing here goes through
// the bundler, so nothing here may use imports or TypeScript.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Menu', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Menu', {
      body: payload.body ?? '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: payload.url },
      // One order at a time: a second report replaces the first rather than
      // stacking up behind it.
      tag: 'grocery-report',
      renotify: true,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  if (!url) return;

  // Reuse a window that is already open on it rather than piling up tabs.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url === url);

      return existing ? existing.focus() : self.clients.openWindow(url);
    }),
  );
});
