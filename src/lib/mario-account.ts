import type { SupabaseClient } from '@supabase/supabase-js'

/** Cuentas reconocidas como Mario / referente oficial (misma lista en API y UI). */
export const MARIO_EMAILS = ['mariostebler@gmail.com', 'steblermario@gmail.com'] as const

export function isMarioAccountEmail(email: string | null | undefined): boolean {
	const e = (email ?? '').trim().toLowerCase()
	return (MARIO_EMAILS as readonly string[]).includes(e)
}

function marioRoleRank(role: string): number {
	if (role === 'admin') return 0
	if (role === 'admin_master') return 1
	if (role === 'moderator') return 2
	return 3
}

/**
 * Resuelve la fila de perfil del referente cuando hay varias cuentas con los emails de Mario.
 * Prioridad: admin → admin_master → moderator → resto.
 */
export async function fetchCanonicalMarioProfile(
	db: SupabaseClient
): Promise<{ id: string; name: string | null; avatar_url: string | null } | null> {
	const { data, error } = await db
		.from('profiles')
		.select('id, name, avatar_url, role')
		.in('email', [...MARIO_EMAILS])

	if (error || !data?.length) return null

	const sorted = [...data].sort((a, b) => marioRoleRank(a.role) - marioRoleRank(b.role))
	const row = sorted[0]!
	return { id: row.id, name: row.name, avatar_url: row.avatar_url }
}
