import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { buildInstagramUrl, buildWhatsAppUrl } from '@/lib/server/publicidad'
import type { PublicidadDisplay } from '@/lib/publicidad-display'

type PublicidadRow = {
  id: string
  title: string | null
  description: string | null
  category: string | null
  images: unknown
  phone_number: string | null
  instagram: string | null
  created_at: string
  end_at: string | null
}

function rowToDisplay(r: PublicidadRow): PublicidadDisplay | null {
  if (r.end_at) {
    const end = new Date(r.end_at)
    if (Number.isFinite(end.getTime()) && end.getTime() <= Date.now()) return null
  }

  const imgs = Array.isArray(r.images) ? r.images.filter((x): x is string => typeof x === 'string') : []
  const imageUrl = imgs.length ? imgs[0]! : undefined

  return {
    id: r.id,
    title: r.title ?? '',
    description: r.description ?? '',
    category: r.category ?? '',
    createdAt: new Date(r.created_at),
    imageUrl,
    images: imgs.length ? imgs : undefined,
    whatsappUrl: r.phone_number ? buildWhatsAppUrl(String(r.phone_number)) ?? undefined : undefined,
    instagramUrl: r.instagram ? buildInstagramUrl(String(r.instagram)) ?? undefined : undefined,
  }
}

async function fetchActiveRowById(client: ReturnType<typeof createClient>, trimmed: string) {
  return client
    .from('publicidad_requests')
    .select('id,title,description,category,images,phone_number,instagram,created_at,end_at')
    .eq('status', 'active')
    .eq('id', trimmed)
    .maybeSingle()
}

/**
 * Una publicidad activa por id (permalink, API pública).
 * Usa el mismo cliente anónimo que `/api/publicidad/activos` (RLS), y opcionalmente service role.
 */
export async function getActivePublicidadDisplayById(id: string): Promise<PublicidadDisplay | null> {
  const trimmed = (id?.trim() ?? '').toLowerCase()
  if (!trimmed || trimmed.length > 64) return null

  const service = createServiceRoleClient()
  if (service) {
    const { data, error } = await fetchActiveRowById(service, trimmed)
    if (!error && data) {
      const mapped = rowToDisplay(data as PublicidadRow)
      if (mapped) return mapped
    }
    if (error) {
      console.error('[getActivePublicidadDisplayById] service role query failed, fallback anon:', error.message)
    }
  }

  const anon = createClient()
  const { data, error } = await fetchActiveRowById(anon, trimmed)
  if (error) {
    console.error('[getActivePublicidadDisplayById] anon query failed:', error.message)
    return null
  }
  if (!data) return null
  return rowToDisplay(data as PublicidadRow)
}
