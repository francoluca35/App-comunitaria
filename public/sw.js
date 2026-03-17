// Service worker para PWA y notificaciones push
const CACHE_NAME = 'comunidad-v1'
const ICON_PATH = '/Assets/logocst.png'

function getFullIconUrl(path) {
  if (!path || path.startsWith('http')) return path || ICON_PATH
  const base = self.registration?.scope?.replace(/\/$/, '') || self.location?.origin || ''
  return base ? base + (path.startsWith('/') ? path : '/' + path) : path
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload = { title: 'Comunidad', body: '', tag: 'comunidad', icon: ICON_PATH }
  try {
    const data = event.data.json()
    payload = {
      title: data.title ?? payload.title,
      body: data.body ?? data.text ?? payload.body,
      tag: data.tag ?? payload.tag,
      url: data.url,
      icon: data.icon ?? ICON_PATH,
    }
  } catch {
    payload.body = event.data.text()
  }
  const iconUrl = getFullIconUrl(payload.icon)
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      data: { url: payload.url || '/' },
      icon: iconUrl,
      badge: iconUrl,
      vibrate: [200, 100, 200],
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
