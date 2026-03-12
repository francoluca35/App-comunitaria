import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccessToken } from '@/lib/admin-auth'

/** GET: devuelve el perfil de soporte (primer admin o moderador). Usa RLS "Authenticated can read support profiles". */
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

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('role', ['admin', 'moderator'])
    .order('role', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'No hay soporte disponible' }, { status: 404 })
  }
  return NextResponse.json(data)
}
