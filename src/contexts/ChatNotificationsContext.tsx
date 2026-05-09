'use client'

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react'
import { useApp } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import { showSystemNotification } from '@/lib/notifications'
import {
	groupMessageThreads,
	messageChatInboxUrl,
	type ChatNotificationRow,
	type MessageThreadGroup,
} from '@/lib/chat-notification-ui'

type ChatNotificationsContextValue = {
	threads: MessageThreadGroup[]
	unreadMessageCount: number
	unreadThreadCount: number
	marioProfileId: string | null
	markNotificationIdsRead: (ids: string[]) => Promise<void>
	fetchMessageRows: () => Promise<void>
}

const ChatNotificationsContext = createContext<ChatNotificationsContextValue | null>(null)

export function ChatNotificationsProvider({ children }: { children: ReactNode }) {
	const { currentUser } = useApp()
	const supabase = useMemo(() => createClient(), [])
	const [rows, setRows] = useState<ChatNotificationRow[]>([])
	const [marioProfileId, setMarioProfileId] = useState<string | null>(null)

	useEffect(() => {
		if (!currentUser?.id) {
			setRows([])
			setMarioProfileId(null)
		}
	}, [currentUser?.id])

	useEffect(() => {
		if (!currentUser?.id) {
			setMarioProfileId(null)
			return
		}
		if (currentUser.isAdmin || currentUser.isModerator) {
			setMarioProfileId(null)
			return
		}
		let cancelled = false
		;(async () => {
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession()
				if (!session?.access_token) return
				const res = await fetch('/api/message/mario', {
					headers: { Authorization: `Bearer ${session.access_token}` },
				})
				if (!res.ok || cancelled) return
				const j = (await res.json()) as { id?: string }
				if (j?.id && !cancelled) setMarioProfileId(j.id)
			} catch {
				/* fetch puede fallar si no hay red o el servidor no responde */
			}
		})()
		return () => {
			cancelled = true
		}
	}, [currentUser?.id, currentUser?.isAdmin, currentUser?.isModerator, supabase.auth])

	const fetchMessageRows = useCallback(async () => {
		if (!currentUser?.id) return
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession()
			if (!session?.access_token) return
			const res = await fetch('/api/notifications', {
				headers: { Authorization: `Bearer ${session.access_token}` },
			})
			const data: unknown = await res.json().catch(() => null)
			if (!res.ok || !Array.isArray(data)) return
			const only = (data as ChatNotificationRow[]).filter((r) => r.type === 'message')
			only.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
			setRows(only)
		} catch (e) {
			if (process.env.NODE_ENV === 'development') {
				console.warn('[ChatNotifications] fetchMessageRows:', e)
			}
		}
	}, [currentUser?.id, supabase.auth])

	useEffect(() => {
		void fetchMessageRows()
	}, [fetchMessageRows])

	useEffect(() => {
		if (!currentUser?.id) return
		const schedule = () => {
			if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
			setTimeout(() => void fetchMessageRows(), 400)
		}
		document.addEventListener('visibilitychange', schedule)
		window.addEventListener('focus', schedule)
		return () => {
			document.removeEventListener('visibilitychange', schedule)
			window.removeEventListener('focus', schedule)
		}
	}, [currentUser?.id, fetchMessageRows])

	useEffect(() => {
		if (!currentUser?.id) return
		const channel = supabase
			.channel(`floating-chat-notif-${currentUser.id}`)
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
				(payload) => {
					const row = payload.new as ChatNotificationRow
					if (row.type !== 'message') return
					setRows((prev) => {
						const optIndex = prev.findIndex((n) => n.id.startsWith('opt-') && n.related_id === row.related_id)
						if (optIndex >= 0) {
							const next = [...prev]
							next.splice(optIndex, 1, row)
							return next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
						}
						return [row, ...prev.filter((n) => n.id !== row.id)].sort(
							(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
						)
					})
				}
			)
			.subscribe((status) => {
				if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') void fetchMessageRows()
			})
		return () => {
			supabase.removeChannel(channel)
		}
	}, [currentUser?.id, supabase, fetchMessageRows])

	useEffect(() => {
		if (!currentUser?.id) return
		const channel = supabase
			.channel(`floating-chat-msg-${currentUser.id}`)
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `receiver_id=eq.${currentUser.id}` },
				(payload) => {
					const row = payload.new as {
						id: string
						sender_id: string
						content: string
						system_generated?: boolean | null
					}
					if (row.system_generated) return
					const optimistic: ChatNotificationRow = {
						id: `opt-${row.id}`,
						type: 'message',
						title: 'Nuevo mensaje',
						body:
							(row.content ?? '').slice(0, 80) + (row.content && row.content.length > 80 ? '…' : ''),
						link_url: messageChatInboxUrl(row.sender_id, currentUser, marioProfileId),
						related_id: row.sender_id,
						read_at: null,
						created_at: new Date().toISOString(),
					}
					setRows((prev) => [optimistic, ...prev])
					void showSystemNotification({
						title: 'Nuevo mensaje',
						body: optimistic.body ?? 'Te enviaron un mensaje',
						tag: `chat-msg-${row.sender_id}`,
						url: messageChatInboxUrl(row.sender_id, currentUser, marioProfileId),
					})
				}
			)
			.subscribe()
		return () => {
			supabase.removeChannel(channel)
		}
	}, [currentUser?.id, currentUser?.isAdmin, currentUser?.isModerator, supabase, marioProfileId])

	const threads = useMemo(() => groupMessageThreads(rows), [rows])

	const unreadThreadCount = useMemo(
		() => threads.filter((t) => t.items.some((x) => !x.read_at)).length,
		[threads]
	)

	const unreadMessageCount = useMemo(
		() => threads.reduce((n, t) => n + t.items.filter((x) => !x.read_at).length, 0),
		[threads]
	)

	const markNotificationIdsRead = useCallback(async (ids: string[]) => {
		const realIds = ids.filter((id) => !id.startsWith('opt-'))
		setRows((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n)))
		if (!realIds.length) return
		const {
			data: { session },
		} = await supabase.auth.getSession()
		if (!session?.access_token) return
		try {
			await fetch('/api/notifications', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
				body: JSON.stringify({ ids: realIds }),
			})
		} catch {
			/* igual que GET: fallos de red no deben romper la UI */
		}
	}, [supabase.auth])

	const value = useMemo(
		() =>
			({
				threads,
				unreadMessageCount,
				unreadThreadCount,
				marioProfileId,
				markNotificationIdsRead,
				fetchMessageRows,
			}) satisfies ChatNotificationsContextValue,
		[
			threads,
			unreadMessageCount,
			unreadThreadCount,
			marioProfileId,
			markNotificationIdsRead,
			fetchMessageRows,
		]
	)

	return <ChatNotificationsContext.Provider value={value}>{children}</ChatNotificationsContext.Provider>
}

export function useChatNotifications(): ChatNotificationsContextValue {
	const ctx = useContext(ChatNotificationsContext)
	if (!ctx) {
		throw new Error('useChatNotifications debe usarse dentro de ChatNotificationsProvider')
	}
	return ctx
}
