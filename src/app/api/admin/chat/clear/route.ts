import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAccessToken } from '@/lib/admin-auth'

/** POST: vaciar mensajes de la conversación entre el admin y userId. Body: { userId: string, from?: string, to?: string } (from/to en ISO). */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  const { supabase } = auth
  const token = getAccessToken(request)
  const { data: { user } } = await supabase.auth.getUser(token ?? '')
  const adminId = user?.id
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: { userId?: string; from?: string; to?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  const userId = body.userId
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
  }

  let query = supabase
    .from('chat_messages')
    .delete()
    .or(`and(sender_id.eq.${adminId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${adminId})`)

  if (body.from || body.to) {
    if (body.from) {
      const fromDate = new Date(body.from)
      if (Number.isNaN(fromDate.getTime())) {
        return NextResponse.json({ error: 'Fecha "from" inválida' }, { status: 400 })
      }
      query = query.gte('created_at', fromDate.toISOString())
    }
    if (body.to) {
      const toDate = new Date(body.to)
      if (Number.isNaN(toDate.getTime())) {
        return NextResponse.json({ error: 'Fecha "to" inválida' }, { status: 400 })
      }
      query = query.lte('created_at', toDate.toISOString())
    }
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
