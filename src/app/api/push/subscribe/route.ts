import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient, getUserIdFromToken } from '@/lib/supabase/server'

type Body = {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const userId = getUserIdFromToken(token)
  if (!userId) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  const supabase = createClient(token)
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user?.id || user.id !== userId) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : ''
  const p256dh = typeof body.keys?.p256dh === 'string' ? body.keys.p256dh : ''
  const authSecret = typeof body.keys?.auth === 'string' ? body.keys.auth : ''
  if (!endpoint || !p256dh || !authSecret) {
    return NextResponse.json({ error: 'Faltan endpoint o keys' }, { status: 400 })
  }

  const svc = createServiceRoleClient()
  if (!svc) {
    return NextResponse.json({ error: 'Servidor sin service role' }, { status: 503 })
  }

  const { error } = await svc.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint,
      p256dh,
      auth: authSecret,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  )

  if (error) {
    console.error('push_subscriptions upsert:', error)
    return NextResponse.json({ error: 'No se pudo guardar la suscripción' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
