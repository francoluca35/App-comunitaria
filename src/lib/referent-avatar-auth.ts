import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccessToken } from '@/lib/admin-auth'
import { isMarioAccountEmail } from '@/lib/mario-account'

/**
 * Quien puede cambiar la foto del referente en el banner: rol admin_master o cuenta Mario.
 */
export async function requireReferentAvatarManager(
	request: NextRequest
): Promise<
	| { ok: true; token: string }
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
	const { data: profile } = await supabase
		.from('profiles')
		.select('role, email')
		.eq('id', user.id)
		.maybeSingle()

	if (!profile) {
		return { ok: false, response: NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 }) }
	}
	const allowed = profile.role === 'admin_master' || isMarioAccountEmail(profile.email)
	if (!allowed) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: 'Solo el referente o un administrador master pueden cambiar esta foto.' },
				{ status: 403 }
			),
		}
	}
	return { ok: true, token }
}
