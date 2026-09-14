// Service worker for web push notifications.
// Registered from src/lib/notifications.js. Served at /sw.js.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: 'Huddle', body: event.data.text() };
    }
  }

  const options = {
    body: payload.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: payload.url || '/workspace' },
  };

  event.waitUntil(
    (async () => {
      // Skip the OS notification when a Huddle tab is already focused — the
      // user is looking at the app, so a system popup would be redundant.
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      if (clients.some((client) => client.focused)) {
        return;
      }

      return self.registration.showNotification(
        payload.title || 'Huddle',
        options,
      );
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url =
    (event.notification.data && event.notification.data.url) || '/workspace';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});
