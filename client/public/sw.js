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
    // Group notifications per channel so a fresh message replaces the previous
    // one for the same channel instead of stacking a new toast each time.
    tag: payload.tag || undefined,
    renotify: Boolean(payload.tag),
    data: { url: payload.url || '/workspace' },
  };

  event.waitUntil(
    self.registration.showNotification(
      payload.title || 'Huddle',
      options,
    ),
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
