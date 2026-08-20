import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, getUserIdFromToken } from '@/lib/supabase/server'

/** Registra/actualiza que el usuario autenticado está activo en la app. */
export async function POST(request: NextRequest) {
	const authHeader = request.headers.get('authorization')
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
	if (!token) {
		return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
	}

	const userId = getUserIdFromToken(token)
	if (!userId) {
		return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
	}

	const svc = createServiceRoleClient()
	if (!svc) {
		return NextResponse.json({ error: 'Service role no disponible' }, { status: 503 })
	}

	const now = new Date().toISOString()
	const { error } = await svc.from('user_presence').upsert(
		{ user_id: userId, last_seen_at: now },
		{ onConflict: 'user_id' }
	)

	if (error) {
		console.error('presence/heartbeat:', error)
		return NextResponse.json({ error: 'No se pudo registrar presencia' }, { status: 500 })
	}

	return NextResponse.json({ ok: true, at: now })
}
