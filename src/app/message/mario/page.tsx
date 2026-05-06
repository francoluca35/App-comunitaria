'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { showSystemNotification } from '@/lib/notifications'
import { isMarioAccountEmail } from '@/lib/mario-account'
import { WhatsAppMessageBubble } from '@/components/chat/WhatsAppMessageBubble'
import { WhatsAppComposer } from '@/components/chat/WhatsAppComposer'
import { sendChatVoiceMessage } from '@/lib/send-chat-voice-message'
import { cn } from '@/app/components/ui/utils'

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

/** URL canónica del chat exclusivo con Mario (CTA del inicio y «Hablar con Mario» en contactos). */
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
						currentUser?.notificationPreference === 'messages_only' ||
						currentUser?.notificationPreference === 'all'
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
			<DashboardLayout fillViewport contentClassName="max-w-[720px]">
				<div className="flex min-h-0 flex-1 items-center justify-center bg-white py-20 dark:bg-[#0B141A]">
					<p className="text-slate-600 dark:text-[#8696A0]">Cargando chat...</p>
				</div>
			</DashboardLayout>
		)
	}

	if (!mario) {
		return (
			<DashboardLayout fillViewport contentClassName="max-w-[720px]">
				<div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#0B141A]">
					<div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-[#f0f2f5] px-2 py-2 dark:border-[#2A3942] dark:bg-[#202C33]">
						<Button
							variant="ghost"
							size="icon"
							className="text-slate-600 hover:bg-slate-200/80 dark:text-[#AEBAC1] dark:hover:bg-white/10 dark:hover:text-white"
							onClick={() => router.push('/')}
						>
							<ArrowLeft className="h-5 w-5" />
						</Button>
					</div>
					<p className="p-4 text-slate-600 dark:text-[#8696A0]">No hay soporte disponible en este momento.</p>
				</div>
			</DashboardLayout>
		)
	}

	const handleSendText = async () => {
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

	const handleSendVoice = async (blob: Blob, durationSec: number) => {
		if (!myId || !otherId) return
		setSending(true)
		const r = await sendChatVoiceMessage(supabase, myId, otherId, blob, durationSec)
		setSending(false)
		if ('error' in r) {
			toast.error(r.error)
			return
		}
		stickToBottomRef.current = true
		setMessages((prev) => [...prev, r.message])
	}

	const displayName = mario.name ?? 'Mario'

	const isMarioUser = isMarioAccountEmail(currentUser.email)
	const subtitle = isMarioUser ? 'Chat con la comunidad (Mario)' : 'Chat con Mario'

	return (
		<DashboardLayout fillViewport contentClassName="max-w-[720px] flex min-h-0 flex-1 flex-col">
			<div
				className={cn(
					'flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-white sm:rounded-lg sm:border sm:border-slate-200 dark:bg-[#0B141A] dark:sm:border-[#2A3942]'
				)}
			>
				<div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-[#f0f2f5] px-1 py-1.5 pr-2 dark:border-[#2A3942] dark:bg-[#202C33]">
					<Button
						variant="ghost"
						size="icon"
						className="shrink-0 text-slate-600 hover:bg-slate-200/80 dark:text-[#AEBAC1] dark:hover:bg-white/10 dark:hover:text-white"
						onClick={() => router.push('/')}
						aria-label="Volver"
					>
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<Avatar className="h-9 w-9 shrink-0">
						<AvatarImage src={mario.avatar_url ?? undefined} />
						<AvatarFallback className="bg-slate-200 text-sm text-slate-700 dark:bg-[#313D43] dark:text-[#E9EDEF]">
							{displayName[0]?.toUpperCase() ?? 'M'}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<p className="truncate text-[17px] font-medium text-slate-900 dark:text-[#E9EDEF]">{displayName}</p>
						<p className="truncate text-xs text-slate-600 dark:text-[#8696A0]">{subtitle}</p>
					</div>
				</div>

				<div
					ref={messagesScrollRef}
					onScroll={updateStickToBottomFromScroll}
					className="chat-wa-wallpaper min-h-0 flex-1 overflow-y-auto"
				>
					{loading ? (
						<p className="py-4 text-center text-sm text-slate-600 dark:text-[#8696A0]">Cargando mensajes...</p>
					) : messages.length === 0 ? (
						<p className="px-4 py-8 text-center text-sm text-slate-600 dark:text-[#8696A0]">
							No hay mensajes todavía. Escribí o mandá un audio para iniciar la conversación con Mario.
						</p>
					) : (
						<div className="flex flex-col gap-0.5 py-2">
							{messages.map((msg) => (
								<WhatsAppMessageBubble
									key={msg.id}
									message={msg}
									isMine={msg.sender_id === myId}
								/>
							))}
						</div>
					)}
					<div ref={messagesEndRef} className="h-1 shrink-0" />
				</div>

				<WhatsAppComposer
					value={message}
					onChange={setMessage}
					onSubmitText={() => void handleSendText()}
					sending={sending}
					onSendVoice={(blob, dur) => handleSendVoice(blob, dur)}
				/>
			</div>
		</DashboardLayout>
	)
}
