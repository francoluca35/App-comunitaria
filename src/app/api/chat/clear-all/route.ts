import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/admin-auth'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { deleteAllChatMessagesWithStorage } from '@/lib/server/chat-message-cleanup'

/** POST: elimina todos los mensajes de todos los chats (DB + Storage). Usuario autenticado. */
export async function POST(request: NextRequest) {
	const token = getAccessToken(request)
	if (!token) {
		return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
	}

	const supabase = createClient(token)
	const {
		data: { user },
	} = await supabase.auth.getUser(token)
	if (!user?.id) {
		return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
	}

	if (!createServiceRoleClient()) {
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
