import { NextRequest, NextResponse } from 'next/server'
import { cleanupExpiredChatMessages } from '@/lib/server/chat-message-cleanup'

function unauthorized() {
	return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

/**
 * GET /api/cron/cleanup-chat-messages
 * Borra mensajes de chat con más de 72 h (DB + Storage). Programar cada hora con CRON_SECRET.
 *
 * Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
	const secret = process.env.CRON_SECRET?.trim()
	if (!secret) {
		return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 503 })
	}

	const auth = request.headers.get('authorization')?.trim()
	if (auth !== `Bearer ${secret}`) return unauthorized()

	const result = await cleanupExpiredChatMessages()
	if (!result.ok) {
		return NextResponse.json(
			{ ok: false, error: result.error, deletedCount: result.deletedCount },
			{ status: 500 }
		)
	}

	return NextResponse.json({
		ok: true,
		deletedCount: result.deletedCount,
	})
}
