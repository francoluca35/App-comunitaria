import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccessToken } from '@/lib/admin-auth'
import { fetchCanonicalMarioProfile, MARIO_EMAILS } from '@/lib/mario-account'

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
  // - Cualquier admin/moderator/admin_master distinto a Mario no debe poder usar este chat público.
  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('id', user.id)
    .maybeSingle()

  const requesterEmail = (requesterProfile?.email ?? '').toLowerCase()
  const requesterRole = requesterProfile?.role ?? ''
  const isPrivilegedRequester =
    requesterRole === 'admin' || requesterRole === 'moderator' || requesterRole === 'admin_master'
  const isMarioRequester = (MARIO_EMAILS as readonly string[]).includes(requesterEmail)
  if (isPrivilegedRequester && !isMarioRequester) {
    return NextResponse.json(
      { error: 'Acceso restringido: usá el panel de mensajes del admin.' },
      { status: 403 }
    )
  }

  const mario = await fetchCanonicalMarioProfile(supabase)

  if (!mario) {
    return NextResponse.json({ error: 'No hay soporte (Mario) disponible' }, { status: 404 })
  }

  return NextResponse.json(mario)
}
