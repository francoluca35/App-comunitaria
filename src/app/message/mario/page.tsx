'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ArrowLeft, Send } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { showSystemNotification } from '@/lib/notifications'
import { MARIO_EMAILS } from '@/hooks/useMarioAdmin'
import { MessageContent } from '@/components/MessageContent'

interface ChatMessage {
	id: string
	sender_id: string
	receiver_id: string
	content: string
	created_at: string
}

interface MarioProfile {
	id: string
	name: string | null
	avatar_url: string | null
}

/** URL canónica del chat exclusivo con Mario (CTA del inicio y “Hablar con Mario” en contactos). */
const MARIO_CHAT_URL = '/message/mario'

export default function MarioMessagePage() {
	const router = useRouter()
	const { currentUser } = useApp()
	const [mario, setMario] = useState<MarioProfile | null>(null)
	const [marioLoading, setMarioLoading] = useState(true)
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [loading, setLoading] = useState(true)
	const [message, setMessage] = useState('')
	const [sending, setSending] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const messagesScrollRef = useRef<HTMLDivElement>(null)
	const stickToBottomRef = useRef(true)

	const BOTTOM_SCROLL_THRESHOLD_PX = 80

	const updateStickToBottomFromScroll = () => {
		const el = messagesScrollRef.current
		if (!el) return
		const distance = el.scrollHeight - el.scrollTop - el.clientHeight
		stickToBottomRef.current = distance <= BOTTOM_SCROLL_THRESHOLD_PX
	}

	const supabase = useMemo(() => createClient(), [])

	const myId = currentUser?.id ?? ''
	const otherId = mario?.id ?? ''

	useEffect(() => {
		if (!currentUser) return
		let cancelled = false
		const loadMario = async () => {
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession()
				if (!session?.access_token) return
				const res = await fetch('/api/message/mario', {
					headers: { Authorization: `Bearer ${session.access_token}` },
				})
				if (!res.ok || cancelled) {
					return
				}
				const data = (await res.json()) as MarioProfile
				if (!cancelled) setMario(data)
			} catch {
				// ignore
			} finally {
				if (!cancelled) setMarioLoading(false)
			}
		}
		void loadMario()
		return () => {
			cancelled = true
		}
	}, [currentUser, supabase])

	const loadMessages = async () => {
		if (!myId || !otherId) return
		setLoading(true)
		const { data, error } = await supabase
			.from('chat_messages')
			.select('id, sender_id, receiver_id, content, created_at')
			.or(`and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`)
			.order('created_at', { ascending: true })
		setLoading(false)
		if (error) {
			toast.error('Error al cargar mensajes')
			return
		}
		setMessages((data as ChatMessage[]) ?? [])
	}

	useEffect(() => {
		if (!myId || !otherId) return
		stickToBottomRef.current = true
		void loadMessages()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [myId, otherId])

	useEffect(() => {
		if (!stickToBottomRef.current) return
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	useEffect(() => {
		if (!myId || !otherId) return
		const channel = supabase
			.channel(`chat:${myId}:${otherId}`)
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'chat_messages' },
				(payload) => {
					const row = payload.new as ChatMessage
					const isThisConversation =
						(row.sender_id === myId && row.receiver_id === otherId) ||
						(row.sender_id === otherId && row.receiver_id === myId)
					if (!isThisConversation) return
					setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]))

					const isIncoming = row.receiver_id === myId && row.sender_id !== myId
					const wantMessages =
						currentUser?.notificationPreference === 'messages_only' || currentUser?.notificationPreference === 'all'
					if (isIncoming && wantMessages && document.visibilityState !== 'visible') {
						showSystemNotification({
							title: 'Nuevo mensaje',
							body: `Mario te envió un mensaje`,
							tag: `chat-${myId}-${otherId}`,
							url: MARIO_CHAT_URL,
						})
					}
				}
			)
			.subscribe()

		return () => {
			supabase.removeChannel(channel)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [myId, otherId, supabase])

	const pollInterval = 2000
	useEffect(() => {
		if (!myId || !otherId) return
		const tick = () => {
			supabase
				.from('chat_messages')
				.select('id, sender_id, receiver_id, content, created_at')
				.or(`and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`)
				.order('created_at', { ascending: true })
				.then(({ data }) => {
					if (data?.length) setMessages(data as ChatMessage[])
				})
		}
		const id = setInterval(tick, pollInterval)
		return () => clearInterval(id)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [myId, otherId])

	if (!currentUser) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
				<Card className="w-full max-w-md">
					<CardContent className="p-6 text-center">
						<p className="mb-4 text-gray-600 dark:text-gray-400">Iniciá sesión para chatear con Mario.</p>
						<Button onClick={() => router.push('/login?next=/message/mario')}>Ir a iniciar sesión</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (marioLoading) {
		return (
			<DashboardLayout fillViewport>
				<div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 items-center justify-center py-20">
					<p className="text-slate-500 dark:text-slate-400">Cargando chat...</p>
				</div>
			</DashboardLayout>
		)
	}

	if (!mario) {
		return (
			<DashboardLayout fillViewport>
				<div className="mx-auto w-full max-w-2xl flex-1 p-4">
					<Button variant="ghost" size="icon" onClick={() => router.push('/')}>
						<ArrowLeft className="w-5 h-5" />
					</Button>
					<p className="mt-4 text-slate-500 dark:text-slate-400">No hay soporte disponible en este momento.</p>
				</div>
			</DashboardLayout>
		)
	}

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault()
		const text = message.trim()
		if (!text || !myId || !otherId) return
		setSending(true)
		const { data: newMsg, error } = await supabase
			.from('chat_messages')
			.insert({ sender_id: myId, receiver_id: otherId, content: text })
			.select('id, sender_id, receiver_id, content, created_at')
			.single()
		setSending(false)
		if (error) {
			toast.error(error.message ?? 'Error al enviar')
			return
		}
		if (newMsg) {
			stickToBottomRef.current = true
			setMessages((prev) => [...prev, newMsg as ChatMessage])
		}
		setMessage('')
	}

	const displayName = mario.name ?? 'Mario'

	const isMarioUser = MARIO_EMAILS.includes((currentUser.email ?? '').trim().toLowerCase())
	const headerText = isMarioUser ? 'Chat con la comunidad (Mario)' : 'Chat con Mario'

	return (
		<DashboardLayout fillViewport>
			<div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
				<div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
					<Button variant="ghost" size="icon" onClick={() => router.push('/')}>
						<ArrowLeft className="w-5 h-5" />
					</Button>
					<Avatar className="h-10 w-10">
						<AvatarImage src={mario.avatar_url ?? undefined} />
						<AvatarFallback className="text-sm">{displayName[0]?.toUpperCase() ?? 'M'}</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<p className="truncate font-medium text-slate-900 dark:text-white">{displayName}</p>
						<p className="text-xs text-slate-500 dark:text-slate-400">{headerText}</p>
					</div>
				</div>

				<div
					ref={messagesScrollRef}
					onScroll={updateStickToBottomFromScroll}
					className="flex-1 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-800/30"
				>
					{loading ? (
						<p className="py-4 text-center text-slate-500 dark:text-slate-400">Cargando mensajes...</p>
					) : messages.length === 0 ? (
						<p className="py-4 text-center text-slate-500 dark:text-slate-400">
							No hay mensajes todavía. Escribí algo para iniciar la conversación con Mario.
						</p>
					) : (
						<div className="flex flex-col gap-3">
							{messages.map((msg) => {
								const isMine = msg.sender_id === myId
								return (
									<div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
										<div
											className={`max-w-[80%] rounded-2xl px-4 py-2 ${
												isMine
													? 'rounded-br-md bg-[#8B0015] text-white'
													: 'rounded-bl-md border border-slate-200 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
											}`}
										>
											<MessageContent content={msg.content} variant={isMine ? 'light' : 'dark'} />
											<p className={`mt-1 text-xs ${isMine ? 'text-[#F3C9D0]' : 'text-slate-500 dark:text-slate-400'}`}>
												{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: es })}
											</p>
										</div>
									</div>
								)
							})}
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>

				<form
					onSubmit={handleSend}
					className="shrink-0 border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
				>
					<div className="flex gap-2">
						<Input
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder="Escribí tu mensaje..."
							className="flex-1"
							disabled={sending}
						/>
						<Button type="submit" size="icon" disabled={sending || !message.trim()}>
							<Send className="h-4 w-4" />
						</Button>
					</div>
				</form>
			</div>
		</DashboardLayout>
	)
}
