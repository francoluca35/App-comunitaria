import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/** Decodifica el payload del JWT; base64url con padding si hace falta. */
function decodeJwtPayload(token: string): { sub?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    let payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = payloadB64.length % 4
    if (pad) payloadB64 += '='.repeat(4 - pad)
    const decoded = Buffer.from(payloadB64, 'base64').toString('utf8')
    return JSON.parse(decoded) as { sub?: string }
  } catch {
    return null
  }
}

/**
 * Crea cliente Supabase para uso en API routes.
 * Si se pasa token (Bearer), el cliente usa ese token en las requests.
 */
export function createClient(accessToken?: string) {
  const options = accessToken
    ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    : undefined
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, options)
}

/** Cliente con service role (bypasea RLS). Solo si existe SUPABASE_SERVICE_ROLE_KEY. */
export function createServiceRoleClient() {
  if (!supabaseServiceKey) return null
  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

/**
 * Devuelve el user id (sub) del JWT para usar en queries.
 * Usar solo con tokens que enviará el cliente; la verificación real la hace Supabase al usar el token.
 */
export function getUserIdFromToken(accessToken: string): string | null {
  const payload = decodeJwtPayload(accessToken)
  return payload?.sub ?? null
}

/** Resuelve user id desde Bearer: getUser de Supabase y, si falla, sub del JWT (mismo criterio que /api/auth/me). */
export async function resolveUserIdFromBearerToken(accessToken: string): Promise<{
	userId: string | null
	supabase: ReturnType<typeof createClient>
}> {
	const supabase = createClient(accessToken)
	const {
		data: { user },
	} = await supabase.auth.getUser(accessToken)
	if (user?.id) {
		return { userId: user.id, supabase }
	}
	return { userId: getUserIdFromToken(accessToken), supabase }
}
