'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useApp } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { DashboardLayout } from '@/components/DashboardLayout'
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/app/components/ui/dialog'
import { ArrowLeft, Calendar, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { showSystemNotification } from '@/lib/notifications'
import { WhatsAppMessageBubble } from '@/components/chat/WhatsAppMessageBubble'
import { WhatsAppComposer } from '@/components/chat/WhatsAppComposer'
import { sendChatVoiceMessage } from '@/lib/send-chat-voice-message'
import { sendChatImageMessage } from '@/lib/send-chat-image-message'
import { notifyReceiverPushAfterSend } from '@/lib/dispatch-message-push'
import { cn } from '@/app/components/ui/utils'

export interface ChatMessage {
	id: string
	sender_id: string
	receiver_id: string
	content: string
	created_at: string
}

export default function AdminChatPage() {
	const router = useRouter()
	const params = useParams()
	const userId = params?.userId as string | undefined
	const { currentUser, adminProfiles } = useApp()
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [loading, setLoading] = useState(true)
	const [message, setMessage] = useState('')
	const [sending, setSending] = useState(false)
	const [showClearAllDialog, setShowClearAllDialog] = useState(false)
	const [showClearByDateDialog, setShowClearByDateDialog] = useState(false)
	const [showProfileDialog, setShowProfileDialog] = useState(false)
	const [clearFrom, setClearFrom] = useState('')
	const [clearTo, setClearTo] = useState('')
	const [clearing, setClearing] = useState(false)
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

	const profile = userId ? adminProfiles.find((p) => p.id === userId) : null
	const myId = currentUser?.id ?? ''
	const otherId = userId ?? ''

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
		loadMessages()
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
					if (isThisConversation) {
						setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]))
						const isIncoming = row.receiver_id === myId && row.sender_id === otherId
						if (isIncoming && profile?.name) {
							showSystemNotification({
								title: 'Nuevo mensaje',
								body: `${profile.name} te respondió el mensaje`,
								tag: `chat-${otherId}-${myId}`,
								url: `/admin/messages/chat/${otherId}`,
							})
						}
					}
				}
			)
			.subscribe()
		return () => {
			supabase.removeChannel(channel)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [myId, otherId, profile?.name])

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

	if (!currentUser?.isAdmin) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
				<Card className="w-full max-w-md">
					<CardContent className="p-6 text-center">
						<p className="mb-4 text-gray-600 dark:text-gray-400">No tienes permisos de administrador</p>
						<Button onClick={() => router.push('/')}>Volver al inicio</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (!userId || !profile) {
		return (
			<DashboardLayout fillViewport contentClassName="max-w-[720px]">
				<div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#0B141A]">
					<div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-[#f0f2f5] px-2 py-2 dark:border-[#2A3942] dark:bg-[#202C33]">
						<Button
							variant="ghost"
							size="icon"
							className="text-slate-600 hover:bg-slate-200/80 dark:text-[#AEBAC1] dark:hover:bg-white/10 dark:hover:text-white"
							onClick={() => router.push('/admin/messages')}
							aria-label="Volver a la lista"
						>
							<ArrowLeft className="h-5 w-5" />
						</Button>
					</div>
					<p className="p-4 text-slate-600 dark:text-[#8696A0]">Usuario no encontrado. Volvé a la lista de mensajes.</p>
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
			void notifyReceiverPushAfterSend(supabase, otherId, newMsg.id)
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

	const clearAllChat = async () => {
		const {
			data: { session },
		} = await supabase.auth.getSession()
		if (!session?.access_token) {
			toast.error('Sesión expirada')
			return
		}
		setClearing(true)
		const res = await fetch('/api/admin/chat/clear', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
			body: JSON.stringify({ userId: otherId }),
		})
		setClearing(false)
		setShowClearAllDialog(false)
		if (!res.ok) {
			const err = await res.json().catch(() => ({}))
			toast.error(err.error ?? 'Error al vaciar el chat')
			return
		}
		setMessages([])
		toast.success('Chat vaciado. Los mensajes se eliminaron para ambos.')
	}

	const clearChatByDate = async () => {
		if (!clearFrom && !clearTo) {
			toast.error('Indicá al menos una fecha (desde o hasta)')
			return
		}
		const {
			data: { session },
		} = await supabase.auth.getSession()
		if (!session?.access_token) {
			toast.error('Sesión expirada')
			return
		}
		setClearing(true)
		const body: { userId: string; from?: string; to?: string } = { userId: otherId }
		if (clearFrom) body.from = new Date(clearFrom).toISOString()
		if (clearTo) body.to = new Date(clearTo).toISOString()
		const res = await fetch('/api/admin/chat/clear', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
			body: JSON.stringify(body),
		})
		setClearing(false)
		setShowClearByDateDialog(false)
		setClearFrom('')
		setClearTo('')
		if (!res.ok) {
			const err = await res.json().catch(() => ({}))
			toast.error(err.error ?? 'Error al eliminar mensajes')
			return
		}
		await loadMessages()
		toast.success('Mensajes del rango eliminados para ambos.')
	}

	const displayName = profile.name ?? profile.email

	return (
		<DashboardLayout fillViewport contentClassName="max-w-[720px] flex min-h-0 flex-1 flex-col">
			<div
				className={cn(
					'flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-white sm:rounded-lg sm:border sm:border-slate-200 dark:bg-[#0B141A] dark:sm:border-[#2A3942]'
				)}
			>
				<div className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-[#f0f2f5] px-1 py-1.5 pr-1 dark:border-[#2A3942] dark:bg-[#202C33]">
					<Button
						variant="ghost"
						size="icon"
						className="shrink-0 text-slate-600 hover:bg-slate-200/80 dark:text-[#AEBAC1] dark:hover:bg-white/10 dark:hover:text-white"
						onClick={() => router.push('/admin/messages')}
						aria-label="Volver a la lista"
					>
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<button
						type="button"
						onClick={() => setShowProfileDialog(true)}
						className="shrink-0 rounded-full outline-none ring-offset-2 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00A884] focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#202C33]"
						aria-label="Ver datos y foto del usuario"
					>
						<Avatar className="h-9 w-9">
							<AvatarImage src={profile.avatar_url ?? undefined} alt="" />
							<AvatarFallback className="bg-slate-200 text-sm text-slate-700 dark:bg-[#313D43] dark:text-[#E9EDEF]">
								{displayName[0]?.toUpperCase() ?? '?'}
							</AvatarFallback>
						</Avatar>
					</button>
					<div className="min-w-0 flex-1">
						<p className="truncate text-[17px] font-medium text-slate-900 dark:text-[#E9EDEF]">{displayName}</p>
						<p className="truncate text-xs text-slate-600 dark:text-[#8696A0]">{profile.email}</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-9 w-9 shrink-0 text-slate-600 hover:bg-slate-200/80 dark:text-[#AEBAC1] dark:hover:bg-white/10 dark:hover:text-white"
						onClick={() => setShowClearByDateDialog(true)}
						disabled={clearing}
						aria-label="Vaciar mensajes por rango de fechas"
					>
						<Calendar className="h-5 w-5" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-9 w-9 shrink-0 text-red-600 hover:bg-slate-200/80 dark:text-red-400 dark:hover:bg-white/10 dark:hover:text-red-300"
						onClick={() => setShowClearAllDialog(true)}
						disabled={clearing}
						aria-label="Vaciar todo el chat"
					>
						<Trash2 className="h-5 w-5" />
					</Button>
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
							No hay mensajes todavía. Escribí o mandá un audio para iniciar la conversación.
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

			<AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Vaciar todo el chat</AlertDialogTitle>
						<AlertDialogDescription>
							Se eliminarán todos los mensajes de esta conversación de forma permanente, para vos y para el usuario. Esta
							acción no se puede deshacer.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={clearing}>Cancelar</AlertDialogCancel>
						<Button
							variant="destructive"
							disabled={clearing}
							onClick={(e) => {
								e.preventDefault()
								void clearAllChat()
							}}
						>
							{clearing ? 'Eliminando…' : 'Vaciar chat'}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
				<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Datos del usuario</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col items-center gap-4 py-2">
						<Avatar className="h-28 w-28 border-2 border-slate-200 dark:border-slate-600">
							<AvatarImage src={profile.avatar_url ?? undefined} className="object-cover" alt={displayName} />
							<AvatarFallback className="text-3xl">{displayName[0]?.toUpperCase() ?? '?'}</AvatarFallback>
						</Avatar>
						<dl className="w-full space-y-2 text-sm">
							<div>
								<dt className="text-slate-500 dark:text-slate-400">Nombre</dt>
								<dd className="font-medium text-slate-900 dark:text-white">{profile.name?.trim() || '—'}</dd>
							</div>
							<div>
								<dt className="text-slate-500 dark:text-slate-400">Email</dt>
								<dd className="break-all text-slate-900 dark:text-white">{profile.email}</dd>
							</div>
							{profile.phone ? (
								<div>
									<dt className="text-slate-500 dark:text-slate-400">Teléfono</dt>
									<dd className="text-slate-900 dark:text-white">{profile.phone}</dd>
								</div>
							) : null}
							{profile.locality || profile.province ? (
								<div>
									<dt className="text-slate-500 dark:text-slate-400">Ubicación</dt>
									<dd className="text-slate-900 dark:text-white">
										{[profile.locality, profile.province].filter(Boolean).join(' · ') || '—'}
									</dd>
								</div>
							) : null}
							{profile.birth_date ? (
								<div>
									<dt className="text-slate-500 dark:text-slate-400">Fecha de nacimiento</dt>
									<dd className="text-slate-900 dark:text-white">
										{new Date(profile.birth_date).toLocaleDateString('es-AR', {
											day: 'numeric',
											month: 'long',
											year: 'numeric',
										})}
									</dd>
								</div>
							) : null}
							<div>
								<dt className="text-slate-500 dark:text-slate-400">Rol</dt>
								<dd className="text-slate-900 dark:text-white">{profile.role}</dd>
							</div>
							<div>
								<dt className="text-slate-500 dark:text-slate-400">Estado</dt>
								<dd className="text-slate-900 dark:text-white">{profile.status}</dd>
							</div>
							{profile.suspended_until ? (
								<div>
									<dt className="text-slate-500 dark:text-slate-400">Suspendido hasta</dt>
									<dd className="text-slate-900 dark:text-white">
										{new Date(profile.suspended_until).toLocaleString('es-AR')}
									</dd>
								</div>
							) : null}
							<div>
								<dt className="text-slate-500 dark:text-slate-400">Registro</dt>
								<dd className="text-slate-900 dark:text-white">
									{new Date(profile.created_at).toLocaleString('es-AR')}
								</dd>
							</div>
						</dl>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setShowProfileDialog(false)}>
							Cerrar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={showClearByDateDialog} onOpenChange={setShowClearByDateDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Vaciar chat por rango de fechas</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-slate-500 dark:text-slate-400">
						Indicá desde y/o hasta qué fecha eliminar mensajes. Se borrarán para ambos.
					</p>
					<div className="grid gap-2">
						<label className="text-sm font-medium">Desde</label>
						<Input
							type="datetime-local"
							value={clearFrom}
							onChange={(e) => setClearFrom(e.target.value)}
							disabled={clearing}
						/>
						<label className="text-sm font-medium">Hasta</label>
						<Input
							type="datetime-local"
							value={clearTo}
							onChange={(e) => setClearTo(e.target.value)}
							disabled={clearing}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowClearByDateDialog(false)} disabled={clearing}>
							Cancelar
						</Button>
						<Button onClick={clearChatByDate} disabled={clearing}>
							{clearing ? 'Eliminando…' : 'Eliminar mensajes del rango'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</DashboardLayout>
	)
}
