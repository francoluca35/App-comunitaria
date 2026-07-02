import type { SupabaseClient } from '@supabase/supabase-js'
import { NOTIFICATION_TYPES_HIDDEN_IN_BELL } from '@/lib/notification-display'
import type { ChatNotificationRow } from '@/lib/chat-notification-ui'

const HIDDEN_IN = `(${[...NOTIFICATION_TYPES_HIDDEN_IN_BELL].map((t) => `"${t}"`).join(',')})`

export async function fetchNotificationsFromSupabase(
	supabase: SupabaseClient,
	userId: string,
	opts?: { type?: 'message' | 'non-message'; limit?: number }
): Promise<ChatNotificationRow[]> {
	const limit = Math.min(opts?.limit ?? 50, 100)

	let query = supabase
		.from('notifications')
		.select('id, type, title, body, link_url, related_id, read_at, created_at')
		.eq('user_id', userId)
		.not('type', 'in', HIDDEN_IN)

	if (opts?.type === 'message') {
		query = query.eq('type', 'message')
	} else if (opts?.type === 'non-message') {
		query = query.neq('type', 'message')
	}

	const { data, error } = await query.order('created_at', { ascending: false }).limit(limit)
	if (error || !data) return []
	return data as ChatNotificationRow[]
}
