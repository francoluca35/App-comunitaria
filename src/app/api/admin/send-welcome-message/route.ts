import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAccessToken } from '@/lib/supabase/server'

const WELCOME_MESSAGE = `¡Hola! Bienvenido/a a la comunidad. 🎉

Para que todos podamos convivir mejor, te pedimos que tengas en cuenta estas reglas:

• Publicá contenido respetuoso y verdadero.
• No se permite contenido ofensivo, falso o ilegal.
• Las publicaciones pasan por moderación antes de publicarse.
• Respetá a los demás miembros de la comunidad.

Si tenés dudas, podés escribirnos por este chat. ¡Gracias por sumarte!`

/** POST: enviar mensaje de bienvenida y reglas al usuario (solo admin o moderador) */
export async function POST(request: NextRequest) {
  const token = getAccessToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const supabase = createClient(token)
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user?.id) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }
  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin' && myProfile?.role !== 'moderator') {
    return NextResponse.json({ error: 'Se requieren permisos de admin o moderador' }, { status: 403 })
  }

  let body: { userId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  const { userId } = body
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'Falta userId' }, { status: 400 })
  }

  const supportId = user.id
  const { error } = await supabase.from('chat_messages').insert({
    sender_id: supportId,
    receiver_id: userId,
    content: WELCOME_MESSAGE,
  })

  if (error) {
    console.error('send-welcome-message error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
