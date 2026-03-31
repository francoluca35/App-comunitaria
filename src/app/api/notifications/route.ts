import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type NotificationType =
  | 'message'
  | 'comment'
  | 'post_approved'
  | 'post_rejected'
  | 'post_deleted'
  | 'post_pending'
  | 'new_profile'
  | 'community_alert'

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

  const supabase = createClient(token)
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user?.id) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 50, 100)

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, link_url, related_id, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

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

  const supabase = createClient(token)
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user?.id) {
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
    .eq('user_id', user.id)

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
