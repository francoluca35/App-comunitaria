/**
 * Origen público de la app (compartir, enlaces absolutos).
 * Prioriza `NEXT_PUBLIC_APP_URL`; si no hay, usa el deploy en Vercel.
 */
export function getAppPublicOrigin(): string {
  const raw = typeof process.env.NEXT_PUBLIC_APP_URL === 'string' ? process.env.NEXT_PUBLIC_APP_URL.trim() : ''
  if (raw) return raw.replace(/\/$/, '')
  return 'https://app-comunitaria.vercel.app'
}

export function publicidadPermalink(id: string): string {
  return `${getAppPublicOrigin()}/cartelera/${encodeURIComponent(id)}`
}

export function postPermalink(postId: string): string {
  return `${getAppPublicOrigin()}/post/${encodeURIComponent(postId)}`
}
