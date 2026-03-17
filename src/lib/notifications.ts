/**
 * Utilidades para notificaciones del sistema (barra en móvil/PC).
 * Requiere que el usuario haya aceptado permisos y que la app esté instalada o en HTTPS.
 */

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
 * No hace nada si el usuario no dio permiso o no soporta Notification.
 */
export async function showSystemNotification(options: {
  title: string
  body?: string
  tag?: string
  url?: string
  icon?: string
}): Promise<void> {
  if (!isNotificationSupported() || window.Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg?.showNotification) {
      reg.showNotification(options.title, {
        body: options.body,
        tag: options.tag ?? 'comunidad',
        data: { url: options.url ?? '/' },
        icon: options.icon ?? '/Assets/logocst.png',
        badge: options.icon ?? '/Assets/logocst.png',
      })
    } else {
      const n = new window.Notification(options.title, {
        body: options.body,
        tag: options.tag,
        icon: options.icon ?? '/Assets/logocst.png',
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
