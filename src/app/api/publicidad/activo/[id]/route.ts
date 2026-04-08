import { NextResponse, type NextRequest } from 'next/server'
import { getActivePublicidadDisplayById } from '@/lib/server/active-publicidad-by-id'

export const dynamic = 'force-dynamic'

/** GET /api/publicidad/activo/[id] — una publicidad activa (para compartir / clientes). */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const p = await getActivePublicidadDisplayById(id)
  if (!p) {
    return NextResponse.json({ error: 'Publicidad no encontrada o inactiva' }, { status: 404 })
  }
  return NextResponse.json({
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category,
    createdAt: p.createdAt.toISOString(),
    imageUrl: p.imageUrl,
    images: p.images,
    whatsappUrl: p.whatsappUrl,
    instagramUrl: p.instagramUrl,
  })
}
