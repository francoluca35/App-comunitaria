// Service worker para PWA y notificaciones push
const CACHE_NAME = 'comunidad-v4'
/** Icono para notificaciones push (Android / escritorio); mismo estilo que el launcher 192. */
const ICON_PATH = '/Assets/logo-mobil-launcher-192.png'

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

/**
 * Requisito de instalación PWA (Chrome / Edge): el SW debe interceptar navegación.
 * Passthrough a red — sin cache offline extra.
 */
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
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
    critical: false,
    kind: 'community_alert',
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
      critical: Boolean(data.critical),
      kind: data.kind === 'message' ? 'message' : 'community_alert',
    }
  } catch {
    payload.body = event.data.text()
  }
  const iconUrl = getFullIconUrl(payload.icon)
  const urgent = payload.urgent
  const critical = payload.critical
  const isChat = payload.kind === 'message'
  event.waitUntil(
    (async () => {
      if (critical && 'setAppBadge' in navigator && typeof navigator.setAppBadge === 'function') {
        try {
          await navigator.setAppBadge(1)
        } catch {
          /* ignore */
        }
      }
      await self.registration.showNotification(payload.title, {
        body: payload.body,
        tag: payload.tag,
        data: { url: payload.url || '/', critical, kind: payload.kind },
        icon: iconUrl,
        badge: iconUrl,
        vibrate: urgent ? [...URGENT_VIBRATE] : [200, 100, 200],
        requireInteraction: urgent && !isChat,
        silent: false,
        renotify: urgent || critical,
      })
    })()
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  const clearBadge =
    'clearAppBadge' in navigator && typeof navigator.clearAppBadge === 'function'
      ? navigator.clearAppBadge().catch(() => {})
      : Promise.resolve()
  event.waitUntil(
    clearBadge.then(() =>
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
  )
})
