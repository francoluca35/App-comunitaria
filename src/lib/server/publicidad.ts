import { randomBytes } from 'crypto'

export function normalizePhoneForWhatsApp(phone: string): string | null {
  const raw = phone.trim()
  if (!raw) return null
  // Acepta formatos tipo "+54 9 11 1234-5678" y similares.
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return null
  return digits
}

export function buildWhatsAppUrl(phone: string): string | null {
  const digits = normalizePhoneForWhatsApp(phone)
  if (!digits) return null
  return `https://wa.me/${digits}`
}

export function normalizeInstagramHandle(instagram: string): string | null {
  const raw = instagram.trim()
  if (!raw) return null

  // Si trae URL (instagram.com/xxxx o https://.../xxxx)
  try {
    const maybeUrl = raw.startsWith('http://') || raw.startsWith('https://') ? new URL(raw) : null
    if (maybeUrl) {
      const parts = maybeUrl.pathname.split('/').filter(Boolean)
      const handle = parts[0]
      if (handle) return handle.replace('@', '')
    }
  } catch {
    // ignore
  }

  const handle = raw.replace('@', '')
  if (!handle) return null
  return handle
}

export function buildInstagramUrl(instagram: string): string | null {
  const handle = normalizeInstagramHandle(instagram)
  if (!handle) return null
  return `https://www.instagram.com/${encodeURIComponent(handle)}/`
}

export function generatePaymentToken(): string {
  return randomBytes(24).toString('hex')
}

export function getPaymentLinkBase(): string {
  // Si no existe, usamos un link interno hacia la página de pago.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const paymentBase = process.env.NEXT_PUBLIC_PAYMENT_LINK_BASE
  if (paymentBase && paymentBase.trim()) return paymentBase.trim()
  return appUrl ? `${appUrl.replace(/\/$/, '')}/pago-publicidad` : 'http://localhost:3000/pago-publicidad'
}

export function buildPaymentLink(requestId: string, token: string): string {
  const base = getPaymentLinkBase()
  return `${base}/${requestId}?token=${encodeURIComponent(token)}`
}

