/** Dígitos nacionales sin el prefijo 54 (lo que el usuario escribe después de +54 fijo). */
export function phoneDigitsFromStored(phone: string | null | undefined): string {
  if (!phone) return ''
  const d = phone.replace(/\D/g, '')
  if (d.startsWith('54')) return d.slice(2)
  return d
}

/** Guardar como +54 + dígitos; null si vacío. */
export function phoneStoredFromDigits(digits: string): string | null {
  const d = digits.replace(/\D/g, '')
  if (!d) return null
  return `+54${d}`
}

/** Handle sin @ (para el input con prefijo fijo). */
export function instagramLocalFromStored(raw: string | null | undefined): string {
  if (!raw) return ''
  const t = raw.trim()
  try {
    if (t.startsWith('http://') || t.startsWith('https://')) {
      const u = new URL(t)
      const parts = u.pathname.split('/').filter(Boolean)
      const h = parts[0] ?? ''
      return h.replace(/^@/, '')
    }
  } catch {
    // ignore
  }
  return t.replace(/^@+/, '').trim()
}

/** Valor a persistir: @handle o null. */
export function instagramStoredFromLocal(local: string): string | null {
  const h = local.trim().replace(/^@+/, '').trim()
  if (!h) return null
  return `@${h}`
}
