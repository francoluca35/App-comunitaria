import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_PREFERENCES = ['all', 'custom', 'messages_only'] as const

/** PATCH: actualizar preferencia de notificaciones del usuario autenticado */
export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(token)
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user?.id) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  let body: { notification_preference?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const preference = body.notification_preference
  if (preference !== null && preference !== undefined) {
    if (typeof preference !== 'string' || !VALID_PREFERENCES.includes(preference as (typeof VALID_PREFERENCES)[number])) {
      return NextResponse.json(
        { error: 'notification_preference debe ser: all, custom o messages_only' },
        { status: 400 }
      )
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      notification_preference: preference === undefined ? null : preference,
    })
    .eq('id', user.id)

  if (error) {
    console.error('PATCH profile notifications error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
