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

/** Patrón de vibración para alertas (se usa también en opciones de notificación del SW). */
export const URGENT_ALERT_VIBRATE_PATTERN = [280, 100, 280, 100, 400] as const

/**
 * Sonido corto + vibración en el dispositivo (alertas importantes).
 * Corre aunque no haya permiso de notificaciones del sistema (pestaña abierta).
 */
export function playUrgentAlertFeedback(): void {
  if (typeof window === 'undefined') return
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate([...URGENT_ALERT_VIBRATE_PATTERN])
    } catch {
      // ignore
    }
  }
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
    osc.onended = () => {
      void ctx.close()
    }
  } catch {
    // ignore
  }
}

/**
 * Muestra una notificación en la barra del sistema (móvil/PC).
 * Usa icono en URL absoluta para que en Android aparezca en la barra de estado.
 * `urgent`: vibración + tono en el cliente y notificación más llamativa cuando hay permiso.
 */
export async function showSystemNotification(options: {
  title: string
  body?: string
  tag?: string
  url?: string
  icon?: string
  urgent?: boolean
}): Promise<void> {
  if (options.urgent) {
    playUrgentAlertFeedback()
  }

  if (!isNotificationSupported() || window.Notification.permission !== 'granted') return

  const iconUrl = getNotificationIconUrl(options.icon)
  const urgentOpts = options.urgent
    ? {
        vibrate: [...URGENT_ALERT_VIBRATE_PATTERN],
        requireInteraction: true,
      }
    : { requireInteraction: false }

  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg?.showNotification) {
      reg.showNotification(options.title, {
        body: options.body,
        tag: options.tag ?? 'comunidad',
        data: { url: options.url ?? '/' },
        icon: iconUrl,
        badge: iconUrl,
        ...urgentOpts,
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

/** Evita mostrar varias veces el aviso de prueba al cambiar preferencias en el mismo dispositivo. */
export const PUSH_DEVICE_PREVIEW_STORAGE_KEY = 'comunidad_push_device_preview_v1'

/**
 * Aviso nativo del sistema tras activar Web Push: mismo canal que las alertas reales (segundo plano / app cerrada).
 */
export async function showPushEnrollmentPreviewNotification(): Promise<void> {
  await showSystemNotification({
    title: 'Notificaciones del dispositivo activadas',
    body: 'Te avisaremos con alertas importantes aunque cierres la app o esté en segundo plano.',
    tag: 'comunidad-push-enrolled',
    url: '/',
  })
}

/** Muestra el aviso nativo de confirmación solo la primera vez en este navegador. */
export async function showPushEnrollmentPreviewFirstTime(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(PUSH_DEVICE_PREVIEW_STORAGE_KEY) === '1') return
  } catch {
    return
  }
  await showPushEnrollmentPreviewNotification()
  try {
    window.localStorage.setItem(PUSH_DEVICE_PREVIEW_STORAGE_KEY, '1')
  } catch {
    // ignore
  }
}
