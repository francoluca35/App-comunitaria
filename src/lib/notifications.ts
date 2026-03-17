/**
 * Utilidades para notificaciones del sistema (barra en móvil/PC).
 * Requiere que el usuario haya aceptado permisos y que la app esté instalada o en HTTPS.
 */

const NOTIFICATION_ICON_PATH = '/Assets/logocst.png'

/** URL absoluta del icono para que en móvil (barra de estado) se vea bien. */
function getNotificationIconUrl(customIcon?: string): string {
  if (typeof window === 'undefined') return customIcon ?? NOTIFICATION_ICON_PATH
  const base = window.location.origin
  const path = customIcon ?? NOTIFICATION_ICON_PATH
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied'
  return window.Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied'
  if (window.Notification.permission !== 'default') return window.Notification.permission
  return await window.Notification.requestPermission()
}

/**
 * Muestra una notificación en la barra del sistema (móvil/PC).
 * Usa icono en URL absoluta para que en Android aparezca en la barra de estado.
 */
export async function showSystemNotification(options: {
  title: string
  body?: string
  tag?: string
  url?: string
  icon?: string
}): Promise<void> {
  if (!isNotificationSupported() || window.Notification.permission !== 'granted') return
  const iconUrl = getNotificationIconUrl(options.icon)
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg?.showNotification) {
      reg.showNotification(options.title, {
        body: options.body,
        tag: options.tag ?? 'comunidad',
        data: { url: options.url ?? '/' },
        icon: iconUrl,
        badge: iconUrl,
        vibrate: [200, 100, 200],
        requireInteraction: false,
      })
    } else {
      const n = new window.Notification(options.title, {
        body: options.body,
        tag: options.tag,
        icon: iconUrl,
      })
      n.onclick = () => {
        n.close()
        if (options.url) {
          window.focus()
          window.location.href = options.url
        }
      }
    }
  } catch {
    // ignore
  }
}
