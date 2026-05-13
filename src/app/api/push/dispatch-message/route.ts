import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient, getUserIdFromToken } from '@/lib/supabase/server'
import { dispatchMessagePushForChatMessage } from '@/lib/web-push-dispatch'

type Body = {
	receiverId?: string
	messageId?: string
}

/**
 * Push inmediato al enviar chat (el remitente autenticado llama tras INSERT en chat_messages).
 * El webhook de Supabase sigue como respaldo para alertas y por si falla esta ruta.
 */
export async function POST(request: NextRequest) {
	const authHeader = request.headers.get('authorization')
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
	if (!token) {
		return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
	}

	const senderId = getUserIdFromToken(token)
	if (!senderId) {
		return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
	}

	const supabase = createClient(token)
	const {
		data: { user },
	} = await supabase.auth.getUser(token)
	if (!user?.id || user.id !== senderId) {
		return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
	}

	let body: Body
	try {
		body = (await request.json()) as Body
	} catch {
		return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
	}

	const receiverId = typeof body.receiverId === 'string' ? body.receiverId.trim() : ''
	const messageId = typeof body.messageId === 'string' ? body.messageId.trim() : ''
	if (!receiverId || !messageId) {
		return NextResponse.json({ error: 'Faltan receiverId o messageId' }, { status: 400 })
	}

	const svc = createServiceRoleClient()
	if (!svc) {
		return NextResponse.json({ error: 'Service role no disponible' }, { status: 503 })
	}

	const { sent, errors } = await dispatchMessagePushForChatMessage(svc, senderId, receiverId, messageId)

	return NextResponse.json({
		ok: true,
		sent,
		...(errors.length ? { partial_errors: errors.slice(0, 3) } : {}),
		...(sent === 0 && !errors.length ? { reason: 'no_subscriptions' } : {}),
	})
}
