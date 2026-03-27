import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildInstagramUrl, buildWhatsAppUrl } from '@/lib/server/publicidad'

/**
 * GET /api/publicidad/activos — todas las publicidades activas (vigentes)
 * GET /api/publicidad/activos?lateral=1 — solo las marcadas para barra lateral (promote_lateral)
 */
export async function GET(request: NextRequest) {
  try {
    const lateralOnly =
      request.nextUrl.searchParams.get('lateral') === '1' ||
      request.nextUrl.searchParams.get('lateral') === 'true'

    const supabase = createClient()
    let q = supabase
      .from('publicidad_requests')
      .select('id,title,description,category,images,phone_number,instagram,created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(lateralOnly ? 24 : 50)

    if (lateralOnly) {
      q = q.eq('promote_lateral', true)
    }

    const { data, error } = await q

    if (error) {
      console.error('GET /api/publicidad/activos error:', error)
      return NextResponse.json([])
    }

    const mapped = (data ?? []).map((r: any) => {
      const imgs = Array.isArray(r.images)
        ? (r.images.filter((x: unknown) => typeof x === 'string') as string[])
        : []
      const imageUrl = imgs.length ? imgs[0] : null

      const whatsappUrl = r.phone_number ? buildWhatsAppUrl(String(r.phone_number)) : null
      const instagramUrl = r.instagram ? buildInstagramUrl(String(r.instagram)) : null

      return {
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        createdAt: r.created_at,
        imageUrl: imageUrl ?? undefined,
        images: imgs.length ? imgs : undefined,
        whatsappUrl: whatsappUrl ?? undefined,
        instagramUrl: instagramUrl ?? undefined,
      }
    })

    return NextResponse.json(mapped)
  } catch (e) {
    console.error('GET /api/publicidad/activos exception:', e)
    return NextResponse.json([])
  }
}

