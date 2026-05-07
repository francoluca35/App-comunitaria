'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useApp } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { showSystemNotification } from '@/lib/notifications'
import { WhatsAppMessageBubble } from '@/components/chat/WhatsAppMessageBubble'
import { WhatsAppComposer } from '@/components/chat/WhatsAppComposer'
import { sendChatVoiceMessage } from '@/lib/send-chat-voice-message'
import { sendChatImageMessage } from '@/lib/send-chat-image-message'
import { cn } from '@/app/components/ui/utils'

interface ChatMessage {
	id: string
	sender_id: string
	receiver_id: string
	content: string
	created_at: string
}

interface PeerProfile {
	id: string
	name: string | null
	avatar_url: string | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default function MessageWithPeerPage() {
	const router = useRouter()
	const params = useParams()
	const peerIdParam = params?.peerId
	const peerId = Array.isArray(peerIdParam) ? peerIdParam[0] : peerIdParam
	const { currentUser } = useApp()
	const [peer, setPeer] = useState<PeerProfile | null>(null)
	const [peerLoading, setPeerLoading] = useState(true)
	const [peerError, setPeerError] = useState<string | null>(null)
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
	const otherId = peer?.id ?? ''
	const backToTeamList =
		currentUser?.isAdmin || currentUser?.isModerator ? '/admin/messages' : '/message/contactos'

	useEffect(() => {
		if (!currentUser || !peerId || !UUID_RE.test(peerId)) return
		let cancelled = false
		const run = async () => {
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession()
				if (!session?.access_token) return
				const marioRes = await fetch('/api/message/mario', {
					headers: { Authorization: `Bearer ${session.access_token}` },
				})
				if (marioRes.ok) {
					const mario = (await marioRes.json()) as { id: string }
					if (mario?.id === peerId) {
						router.replace('/message/mario')
						return
					}
				}
				const res = await fetch(`/api/message/peer/${peerId}`, {
					headers: { Authorization: `Bearer ${session.access_token}` },
				})
				if (!res.ok) {
					const j = await res.json().catch(() => ({}))
					if (!cancelled) {
						setPeerError((j as { error?: string }).error ?? 'No se pudo abrir el chat')
						setPeer(null)
					}
					return
				}
				const data = (await res.json()) as PeerProfile
				if (!cancelled) {
					setPeer(data)
					setPeerError(null)
				}
			} catch {
				if (!cancelled) {
					setPeerError('Error al cargar el perfil')
					setPeer(null)
				}
			} finally {
				if (!cancelled) setPeerLoading(false)
			}
		}
		void run()
		return () => {
			cancelled = true
		}
	}, [currentUser, peerId, router, supabase.auth])

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
							body: `${peer?.name?.trim() || 'Alguien'} te envió un mensaje`,
							tag: `chat-${myId}-${otherId}`,
							url: `/message/${otherId}`,
						})
					}
				}
			)
			.subscribe()
		return () => {
			supabase.removeChannel(channel)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [myId, otherId, supabase, peer?.name, currentUser?.notificationPreference])

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
						<p className="mb-4 text-gray-600 dark:text-gray-400">Iniciá sesión para chatear.</p>
						<Button onClick={() => router.push('/login')}>Ir a iniciar sesión</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (!peerId || !UUID_RE.test(peerId)) {
		return (
			<DashboardLayout fillViewport contentClassName="max-w-[720px]">
				<div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#0B141A]">
					<div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-[#f0f2f5] px-2 py-2 dark:border-[#2A3942] dark:bg-[#202C33]">
						<Button
							variant="ghost"
							size="icon"
							className="text-slate-600 hover:bg-slate-200/80 dark:text-[#AEBAC1] dark:hover:bg-white/10 dark:hover:text-white"
							onClick={() => router.push(backToTeamList)}
						>
							<ArrowLeft className="h-5 w-5" />
						</Button>
					</div>
					<p className="p-4 text-slate-600 dark:text-[#8696A0]">Enlace de chat inválido.</p>
				</div>
			</DashboardLayout>
		)
	}

	if (peerLoading) {
		return (
			<DashboardLayout fillViewport contentClassName="max-w-[720px]">
				<div className="flex min-h-0 flex-1 items-center justify-center bg-white py-20 dark:bg-[#0B141A]">
					<p className="text-slate-600 dark:text-[#8696A0]">Cargando chat...</p>
				</div>
			</DashboardLayout>
		)
	}

	if (peerError || !peer) {
		return (
			<DashboardLayout fillViewport contentClassName="max-w-[720px]">
				<div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#0B141A]">
					<div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-[#f0f2f5] px-2 py-2 dark:border-[#2A3942] dark:bg-[#202C33]">
						<Button
							variant="ghost"
							size="icon"
							className="text-slate-600 hover:bg-slate-200/80 dark:text-[#AEBAC1] dark:hover:bg-white/10 dark:hover:text-white"
							onClick={() => router.push(backToTeamList)}
						>
							<ArrowLeft className="h-5 w-5" />
						</Button>
					</div>
					<p className="p-4 text-slate-600 dark:text-[#8696A0]">{peerError ?? 'No se pudo abrir esta conversación.'}</p>
				</div>
			</DashboardLayout>
		)
	}

	const displayName = peer.name ?? 'Equipo'

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

	const handleSendImage = async (file: File) => {
		if (!myId || !otherId) return
		setSending(true)
		const r = await sendChatImageMessage(supabase, myId, otherId, file)
		setSending(false)
		if ('error' in r) {
			toast.error(r.error)
			return
		}
		stickToBottomRef.current = true
		setMessages((prev) => [...prev, r.message])
	}

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
						onClick={() => router.push(backToTeamList)}
						aria-label="Volver"
					>
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<Avatar className="h-9 w-9 shrink-0">
						<AvatarImage src={peer.avatar_url ?? undefined} />
						<AvatarFallback className="bg-slate-200 text-sm text-slate-700 dark:bg-[#313D43] dark:text-[#E9EDEF]">
							{displayName[0]?.toUpperCase() ?? '?'}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<p className="truncate text-[17px] font-medium text-slate-900 dark:text-[#E9EDEF]">{displayName}</p>
						<p className="truncate text-xs text-slate-600 dark:text-[#8696A0]">en línea</p>
					</div>
				</div>

				<div
					ref={messagesScrollRef}
					onScroll={updateStickToBottomFromScroll}
					className="chat-wa-wallpaper min-h-0 flex-1 overflow-y-auto"
				>
					{loading ? (
						<p className="py-8 text-center text-sm text-slate-600 dark:text-[#8696A0]">Cargando mensajes...</p>
					) : messages.length === 0 ? (
						<p className="px-4 py-8 text-center text-sm text-slate-600 dark:text-[#8696A0]">
							No hay mensajes todavía. Escribí o mandá un audio para iniciar.
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
					onSendImage={(file) => handleSendImage(file)}
				/>
			</div>
		</DashboardLayout>
	)
}
