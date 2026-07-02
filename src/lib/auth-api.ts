'use client'

import type { Session } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ProfileFromApi {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: string
  status: string
  phone?: string | null
  province?: string | null
  locality?: string | null
  /** Preferencia de notificaciones: 'all' | 'custom' | 'messages_only'. Null = aún no eligió. */
  notification_preference?: string | null
}

function isAbortError(e: unknown): boolean {
  if (e instanceof Error && e.name === 'AbortError') return true
  if (e && typeof e === 'object' && 'name' in e && (e as { name: string }).name === 'AbortError') return true
  return false
}

const RETRY_DELAY_MS = 450
const MAX_SESSION_RETRIES = 4

/**
 * getSession con reintentos ante AbortError (lock de Supabase entre pestañas/requests).
 */
export async function getSessionSafe(
  supabase: SupabaseClient
): Promise<{ data: { session: Session | null } }> {
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_SESSION_RETRIES; attempt++) {
    try {
      return await supabase.auth.getSession()
    } catch (e) {
      lastError = e
      if (!isAbortError(e)) throw e
      if (attempt < MAX_SESSION_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
      }
    }
  }
  return { data: { session: null } }
}

/**
 * Obtiene el perfil del usuario desde Supabase (RLS: lectura del propio perfil).
 * Evita una invocación de función en Vercel por cada carga de sesión.
 */
export async function fetchProfileFromSupabase(
	supabase: SupabaseClient,
	userId: string
): Promise<ProfileFromApi | null> {
	try {
		const selectCols =
			'id, email, name, avatar_url, role, status, suspended_until, phone, province, locality, notification_preference'
		const { data, error } = await supabase.from('profiles').select(selectCols).eq('id', userId).single()
		if (error) {
			if (error.code === 'PGRST116') return null
			return null
		}
		return data as ProfileFromApi
	} catch {
		return null
	}
}

/**
 * @deprecated Usar fetchProfileFromSupabase. Reservado para fallback vía API si hiciera falta.
 */
export async function fetchProfileFromApi(accessToken: string): Promise<ProfileFromApi | null> {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'same-origin',
    })
    if (!res.ok) return null
    const profile = (await res.json()) as ProfileFromApi
    return profile
  } catch {
    return null
  }
}
