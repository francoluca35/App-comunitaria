import { NextRequest, NextResponse } from 'next/server'
import { cleanupExpiredChatMessages } from '@/lib/server/chat-message-cleanup'
import { cleanupExpiredPublicidades } from '@/lib/server/publicidad-expiration'

function unauthorized() {
	return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

/**
 * GET /api/cron/maintenance
 * Limpieza horaria unificada (chat 72h + publicidades vencidas). Ideal para Vercel Hobby (1 cron).
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

	const [chat, publicidad] = await Promise.all([
		cleanupExpiredChatMessages(),
		cleanupExpiredPublicidades(),
	])

	if (!chat.ok || !publicidad.ok) {
		return NextResponse.json(
			{
				ok: false,
				chat,
				publicidad,
			},
			{ status: 500 }
		)
	}

	return NextResponse.json({
		ok: true,
		chatDeletedCount: chat.deletedCount,
		publicidadDeletedCount: publicidad.deletedCount,
	})
}
