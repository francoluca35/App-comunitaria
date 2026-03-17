// Service worker para PWA y notificaciones push
const CACHE_NAME = 'comunidad-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload = { title: 'Comunidad', body: '', tag: 'comunidad' }
  try {
    const data = event.data.json()
    payload = {
      title: data.title ?? payload.title,
      body: data.body ?? data.text ?? payload.body,
      tag: data.tag ?? payload.tag,
      url: data.url,
      icon: data.icon ?? '/Assets/logocst.png',
    }
  } catch {
    payload.body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      data: { url: payload.url },
      icon: payload.icon,
      badge: payload.icon ?? '/Assets/logocst.png',
      requireInteraction: false,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        const client = clientList[0]
        client.navigate(url)
        client.focus()
      } else if (self.clients.openWindow) {
        self.clients.openWindow(url)
      }
    })
  )
})
