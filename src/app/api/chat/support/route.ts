import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccessToken } from '@/lib/admin-auth'

/** GET: devuelve el perfil de soporte (chat de Mario). Usa RLS "Authenticated can read support profiles". */
export async function GET(request: NextRequest) {
  const token = getAccessToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const supabase = createClient(token)
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user?.id) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  // Regla pedida por el cliente:
  // - Solo usuarios NO admin/moderator (viewer) pueden hablar con Mario vía /chat.
  // - Cualquier admin/moderator distinto a Mario no debe poder usar este chat público.
  const marioEmails = ['mariostebler@gmail.com', 'steblermario@gmail.com']
  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('id', user.id)
    .maybeSingle()

  const requesterEmail = (requesterProfile?.email ?? '').toLowerCase()
  const requesterRole = requesterProfile?.role ?? ''
  const isPrivilegedRequester = requesterRole === 'admin' || requesterRole === 'moderator'
  const isMarioRequester = marioEmails.includes(requesterEmail)
  if (isPrivilegedRequester && !isMarioRequester) {
    return NextResponse.json(
      { error: 'Acceso restringido: usá el panel de mensajes del admin.' },
      { status: 403 }
    )
  }

  // Elegimos explícitamente el admin Mario por email.
  // Priorizamos role=admin (según pedido del cliente). Si no existe como admin,
  // caemos a moderador para no romper el chat si el perfil fue cargado con rol distinto.
  const { data: marioAdmin } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('email', marioEmails)
    .eq('role', 'admin')
    .maybeSingle()

  if (marioAdmin) return NextResponse.json(marioAdmin)

  const { data: marioModerator } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('email', marioEmails)
    .eq('role', 'moderator')
    .maybeSingle()

  if (!marioModerator) {
    return NextResponse.json({ error: 'No hay soporte (Mario) disponible' }, { status: 404 })
  }

  return NextResponse.json(marioModerator)
}
