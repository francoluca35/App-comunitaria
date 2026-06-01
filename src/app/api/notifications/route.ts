import { NextRequest, NextResponse } from 'next/server'
import { NOTIFICATION_TYPES_HIDDEN_IN_BELL } from '@/lib/notification-display'
import { resolveUserIdFromBearerToken } from '@/lib/supabase/server'

export type NotificationType =
  | 'message'
  | 'comment'
  | 'post_approved'
  | 'post_rejected'
  | 'post_deleted'
  | 'post_pending'
  | 'new_profile'
  | 'community_alert'
  | 'community_alert_critical'
  | 'community_notice'
  | 'publicidad_pending'
  | 'publicidad_payment_link'
  | 'publicidad_rejected'
  | 'publicidad_active'
  | 'publicidad_comment'
  | 'comment_report'

export interface NotificationRow {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  link_url: string | null
  related_id: string | null
  read_at: string | null
  created_at: string
}

/** GET: listar notificaciones del usuario (más recientes primero) */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { userId, supabase } = await resolveUserIdFromBearerToken(token)
  if (!userId) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 50, 100)
  const typeFilter = request.nextUrl.searchParams.get('type')

  const hiddenTypes = [...NOTIFICATION_TYPES_HIDDEN_IN_BELL]
  let query = supabase
    .from('notifications')
    .select('id, type, title, body, link_url, related_id, read_at, created_at')
    .eq('user_id', userId)
  if (hiddenTypes.length) {
    const inList = `(${hiddenTypes.map((t) => `"${t}"`).join(',')})`
    query = query.not('type', 'in', inList)
  }
  if (typeFilter === 'message') {
    query = query.eq('type', 'message')
  } else if (typeFilter === 'non-message') {
    query = query.neq('type', 'message')
  }
  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit)

  if (error) {
    console.error('GET notifications error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data as Omit<NotificationRow, 'user_id'>[])
}

/** PATCH: marcar notificaciones como leídas (body: { ids?: string[] } o marcar todas) */
export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { userId, supabase } = await resolveUserIdFromBearerToken(token)
  if (!userId) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  let body: { ids?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const ids = body.ids
  const query = supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (ids?.length) {
    query.in('id', ids)
  }

  const { error } = await query

  if (error) {
    console.error('PATCH notifications error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

/** DELETE: eliminar notificaciones (body: { ids?: string[] } o vaciar todas del usuario) */
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { userId, supabase } = await resolveUserIdFromBearerToken(token)
  if (!userId) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  let body: { ids?: string[] } = {}
  try {
    const raw = await request.text()
    if (raw.trim()) {
      body = JSON.parse(raw) as { ids?: string[] }
    }
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const ids = body.ids?.filter((id) => typeof id === 'string' && id.length > 0 && !id.startsWith('opt-'))

  let query = supabase.from('notifications').delete({ count: 'exact' }).eq('user_id', userId)
  if (ids?.length) {
    query = query.in('id', ids)
  }

  const { error, count } = await query

  if (error) {
    console.error('DELETE notifications error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, deleted: count ?? 0 })
}
