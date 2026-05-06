import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { fetchCanonicalMarioProfile } from '@/lib/mario-account'

/**
 * GET: perfil público del referente (foto y nombre para el banner).
 * Sin autenticación; lectura vía service role.
 */
export async function GET() {
	const storage = createServiceRoleClient()
	if (!storage) {
		return NextResponse.json(
			{ error: 'Servidor sin configuración de base de datos.' },
			{ status: 503 }
		)
	}

	const mario = await fetchCanonicalMarioProfile(storage)
	if (!mario) {
		return NextResponse.json({ error: 'Referente no configurado' }, { status: 404 })
	}

	return NextResponse.json({
		id: mario.id,
		name: mario.name,
		avatar_url: mario.avatar_url,
	})
}
