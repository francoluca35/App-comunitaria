import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

/** Obtiene el token Bearer del request. */
export function getAccessToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
}

/**
 * Verifica que el usuario actual sea admin.
 * Usa el token del usuario para leer su perfil (RLS permite leer el propio). No requiere service role para GET.
 * serviceClient puede ser null si no está SUPABASE_SERVICE_ROLE_KEY (solo necesario para DELETE usuario en Auth).
 */
export async function requireAdmin(request: NextRequest): Promise<
  | { ok: true; supabase: ReturnType<typeof createClient>; serviceClient: ReturnType<typeof createServiceRoleClient> | null }
  | { ok: false; response: NextResponse }
> {
  const token = getAccessToken(request)
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }
  const supabase = createClient(token)
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user?.id) {
    return { ok: false, response: NextResponse.json({ error: 'Sesión inválida' }, { status: 401 }) }
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'admin') {
    return { ok: false, response: NextResponse.json({ error: 'Se requieren permisos de administrador' }, { status: 403 }) }
  }
  const serviceClient = createServiceRoleClient()
  return { ok: true, supabase, serviceClient }
}

/** Admin o moderador (moderación de publicaciones y categorías propuestas). */
export async function requireStaff(request: NextRequest): Promise<
  | {
      ok: true
      supabase: ReturnType<typeof createClient>
      serviceClient: ReturnType<typeof createServiceRoleClient> | null
      role: 'admin' | 'moderator'
    }
  | { ok: false; response: NextResponse }
> {
  const token = getAccessToken(request)
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }
  const supabase = createClient(token)
  const {
    data: { user },
  } = await supabase.auth.getUser(token)
  if (!user?.id) {
    return { ok: false, response: NextResponse.json({ error: 'Sesión inválida' }, { status: 401 }) }
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = profile?.role
  if (role !== 'admin' && role !== 'moderator') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Se requieren permisos de moderación' }, { status: 403 }),
    }
  }
  const serviceClient = createServiceRoleClient()
  return { ok: true, supabase, serviceClient, role }
}
