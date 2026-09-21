/**
 * AutoLink service worker — notifications only.
 *
 * It caches nothing and intercepts no requests: its whole job is to show the
 * owner that someone wrote about their car, and to open the dashboard when
 * they tap it.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || 'AutoLink';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      // PNG, not SVG: Chrome on Android and Windows shows no SVG notification icon.
      // The badge is a one-colour silhouette, as Android draws it in the status bar.
      icon: '/brand/icon-192.png',
      badge: '/brand/badge-96.png',
      // One car, one notification: a second message replaces the first rather
      // than burying the phone.
      tag: 'autolink-message',
      renotify: true,
      data: { url: payload.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Reuse a tab that is already open on the site instead of stacking new ones.
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
