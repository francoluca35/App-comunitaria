/**
 * Dispara Web Push al destinatario justo después de enviar un mensaje (sin esperar solo al webhook de Supabase).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export function dispatchMessagePushFireAndForget(
	accessToken: string,
	receiverId: string,
	messageId: string
): void {
	if (typeof window === 'undefined' || !accessToken?.trim() || !receiverId || !messageId) return
	void fetch('/api/push/dispatch-message', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify({ receiverId, messageId }),
		keepalive: true,
	}).catch(() => {})
}

/** Obtiene sesión y dispara push al receptor (usar tras INSERT en chat_messages). */
export async function notifyReceiverPushAfterSend(
	supabase: SupabaseClient,
	receiverId: string,
	messageId: string
): Promise<void> {
	if (typeof window === 'undefined') return
	const {
		data: { session },
	} = await supabase.auth.getSession()
	if (session?.access_token) {
		dispatchMessagePushFireAndForget(session.access_token, receiverId, messageId)
	}
}
