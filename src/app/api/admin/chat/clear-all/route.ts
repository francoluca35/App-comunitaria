import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { deleteAllChatMessagesWithStorage } from '@/lib/server/chat-message-cleanup'

/** POST: elimina todos los mensajes de todos los chats (DB + Storage). Solo admin / superadmin. */
export async function POST(request: NextRequest) {
	const auth = await requireAdmin(request)
	if (!auth.ok) return auth.response

	if (!auth.serviceClient) {
		return NextResponse.json({ error: 'Servidor sin permisos de storage' }, { status: 503 })
	}

	const result = await deleteAllChatMessagesWithStorage()
	if (!result.ok) {
		return NextResponse.json(
			{ ok: false, error: result.error, deletedCount: result.deletedCount },
			{ status: 500 }
		)
	}

	return NextResponse.json({ ok: true, deletedCount: result.deletedCount })
}
