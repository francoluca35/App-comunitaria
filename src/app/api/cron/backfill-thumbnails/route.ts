import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { backfillMissingStorageThumbnails } from '@/lib/server/storage-thumbnail-backfill'

function unauthorized() {
	return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

/**
 * GET /api/cron/backfill-thumbnails?limit=25&offset=0
 * Genera `_thumb.webp` faltantes en bucket publicaciones.
 *
 * Authorization: Bearer <CRON_SECRET>
 * Repetir con offset creciente hasta remaining=0.
 */
export async function GET(request: NextRequest) {
	const secret = process.env.CRON_SECRET?.trim()
	if (!secret) {
		return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 503 })
	}

	const auth = request.headers.get('authorization')?.trim()
	if (auth !== `Bearer ${secret}`) return unauthorized()

	const storage = createServiceRoleClient()
	if (!storage) {
		return NextResponse.json(
			{ error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor' },
			{ status: 503 }
		)
	}

	const limitParam = request.nextUrl.searchParams.get('limit')
	const offsetParam = request.nextUrl.searchParams.get('offset')
	const limit = limitParam ? parseInt(limitParam, 10) : 25
	const offset = offsetParam ? parseInt(offsetParam, 10) : 0

	try {
		const result = await backfillMissingStorageThumbnails(storage, { limit, offset })
		return NextResponse.json(result, { status: result.ok ? 200 : 500 })
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Error al generar miniaturas'
		return NextResponse.json({ ok: false, error: message }, { status: 500 })
	}
}
