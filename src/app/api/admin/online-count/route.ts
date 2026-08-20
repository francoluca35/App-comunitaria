import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { ONLINE_PRESENCE_WINDOW_MS } from '@/lib/online-presence'

/** Conteo global de usuarios con heartbeat reciente. */
export async function GET(request: NextRequest) {
	const auth = await requireAdmin(request)
	if (!auth.ok) return auth.response

	const svc = auth.serviceClient
	if (!svc) {
		return NextResponse.json({ error: 'Service role no disponible' }, { status: 503 })
	}

	const since = new Date(Date.now() - ONLINE_PRESENCE_WINDOW_MS).toISOString()
	const { count, error } = await svc
		.from('user_presence')
		.select('user_id', { count: 'exact', head: true })
		.gte('last_seen_at', since)

	if (error) {
		console.error('admin/online-count:', error)
		return NextResponse.json({ error: 'No se pudo contar conectados' }, { status: 500 })
	}

	return NextResponse.json({ count: count ?? 0 })
}
