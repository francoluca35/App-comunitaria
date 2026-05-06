import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccessToken } from '@/lib/admin-auth'
import { fetchCanonicalMarioProfile } from '@/lib/mario-account'

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
  const mario = await fetchCanonicalMarioProfile(supabase)

  if (!mario) {
    return NextResponse.json({ error: 'No hay soporte (Mario) disponible' }, { status: 404 })
  }

  return NextResponse.json(mario)
}

