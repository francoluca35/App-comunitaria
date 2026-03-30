import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccessToken } from '@/lib/admin-auth'

const MARIO_EMAILS = ['mariostebler@gmail.com', 'steblermario@gmail.com']

/**
 * GET: Devuelve el perfil de Mario para el chat público (ruta `message`).
 * No aplica el "bloqueo por admin/moderador" porque esta pantalla está pensada para
 * que cualquiera hable SOLO con Mario sin pasar por el sistema de chat/admin.
 */
export async function GET(request: NextRequest) {
  const token = getAccessToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(token)

  // Priorizamos role=admin y si no, role=moderator (RLS: solo admin/moderator son leíbles).
  const { data: marioAdmin } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('email', MARIO_EMAILS)
    .eq('role', 'admin')
    .maybeSingle()

  if (marioAdmin) return NextResponse.json(marioAdmin)

  const { data: marioModerator } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('email', MARIO_EMAILS)
    .eq('role', 'moderator')
    .maybeSingle()

  if (!marioModerator) {
    return NextResponse.json({ error: 'No hay soporte (Mario) disponible' }, { status: 404 })
  }

  return NextResponse.json(marioModerator)
}

