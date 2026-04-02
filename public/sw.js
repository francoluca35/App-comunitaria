// Service worker para PWA y notificaciones push
const CACHE_NAME = 'comunidad-v1'
/** Icono para notificaciones push (Android / escritorio); mismo estilo que el launcher 192. */
const ICON_PATH = '/Assets/logo-mobil-192.png'

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

const URGENT_VIBRATE = [280, 100, 280, 100, 400]

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload = {
    title: 'Comunidad',
    body: '',
    tag: 'comunidad',
    icon: ICON_PATH,
    url: '/',
    urgent: false,
  }
  try {
    const data = event.data.json()
    payload = {
      title: data.title ?? payload.title,
      body: data.body ?? data.text ?? payload.body,
      tag: data.tag ?? payload.tag,
      url: data.url ?? '/',
      icon: data.icon ?? ICON_PATH,
      urgent: Boolean(data.urgent),
    }
  } catch {
    payload.body = event.data.text()
  }
  const iconUrl = getFullIconUrl(payload.icon)
  const urgent = payload.urgent
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      data: { url: payload.url || '/' },
      icon: iconUrl,
      badge: iconUrl,
      vibrate: urgent ? [...URGENT_VIBRATE] : [200, 100, 200],
      requireInteraction: urgent,
      // false = el SO puede sonar según el canal de notificaciones (lo que el usuario configuró en Ajustes)
      silent: false,
      // Android: volver a avisar aunque haya otra con el mismo tag reciente
      renotify: urgent,
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
