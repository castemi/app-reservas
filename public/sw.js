self.addEventListener('push', (event) => {
  let data = { title: 'Nueva notificación', body: '' };
  try {
    data = event.data.json();
  } catch (e) {
    data.body = event.data?.text() || '';
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
