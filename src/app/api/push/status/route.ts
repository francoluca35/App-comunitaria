import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, getUserIdFromToken } from '@/lib/supabase/server'

/** Estado de suscripciones Web Push del usuario en el servidor. */
export async function GET(request: NextRequest) {
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

	const { count, error } = await svc
		.from('push_subscriptions')
		.select('id', { count: 'exact', head: true })
		.eq('user_id', userId)

	if (error) {
		console.error('push/status count:', error)
		return NextResponse.json({ error: 'No se pudo leer el estado' }, { status: 500 })
	}

	const deviceCount = count ?? 0
	return NextResponse.json({
		registered: deviceCount > 0,
		deviceCount,
	})
}
