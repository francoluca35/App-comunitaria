'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
	ArrowLeft,
	ExternalLink,
	Loader2,
	Megaphone,
	MessageCircle,
	PenLine,
	Plus,
	Search,
	X,
} from 'lucide-react'
import { useApp, type AdminProfile } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import {
	messageChatInboxUrl,
	resolveMessageLink,
	type ChatNotificationRow,
} from '@/lib/chat-notification-ui'
import { isFullscreenMobileChatPath } from '@/lib/chat-route-utils'
import { useChatNotifications } from '@/contexts/ChatNotificationsContext'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { cn } from '@/app/components/ui/utils'
import { toast } from 'sonner'
import { WhatsAppMessageBubble } from '@/components/chat/WhatsAppMessageBubble'
import { WhatsAppComposer } from '@/components/chat/WhatsAppComposer'
import { sendChatVoiceMessage } from '@/lib/send-chat-voice-message'
import { sendChatImageMessage } from '@/lib/send-chat-image-message'
import { chatContentPreviewLine } from '@/lib/chat-message-payload'
import {
	loadChatInboxPreviews,
	sortByChatRecency,
	formatChatListTime,
	type PeerPreview,
} from '@/lib/chat-inbox-previews'
import { CST } from '@/lib/cst-theme'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'

const DESKTOP_MQ = '(min-width: 1024px)'

function normalize(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/\s+/g, ' ')
		.trim()
}

function matchProfile(profile: AdminProfile, query: string): boolean {
	if (!query.trim()) return true
	const q = normalize(query)
	const name = normalize(profile.name ?? '')
	const email = normalize(profile.email ?? '')
	const phone = (profile.phone ?? '').replace(/\D/g, '')
	const queryDigits = query.replace(/\D/g, '')
	return (
		name.includes(q) ||
		email.includes(q) ||
		(queryDigits.length >= 2 && phone.includes(queryDigits))
	)
}

interface ChatMsg {
	id: string
	sender_id: string
	receiver_id: string
	content: string
	created_at: string
}

export function FloatingChatHub() {
	const { currentUser, adminProfiles, adminProfilesLoading, loadAdminProfiles } = useApp()
	const router = useRouter()
	const pathname = usePathname()
	const supabase = useMemo(() => createClient(), [])

	const [dockOpen, setDockOpen] = useState(false)
	const [peerId, setPeerId] = useState<string | null>(null)
	const [messages, setMessages] = useState<ChatMsg[]>([])
	const [threadLoading, setThreadLoading] = useState(false)
	const [draft, setDraft] = useState('')
	const [sending, setSending] = useState(false)
	const [isDesktop, setIsDesktop] = useState(false)
	/** Solo admin (desktop): al abrir el dock, primero la lista de todos los contactos. */
	const [adminShowContactList, setAdminShowContactList] = useState(false)
	const [adminContactSearch, setAdminContactSearch] = useState('')
	const [adminLastByPeer, setAdminLastByPeer] = useState<Record<string, PeerPreview>>({})
	/** Menú de acciones rápidas: colapsado deja un solo botón al borde para no tapar formularios ni el enviar del chat. */
	const [quickActionsOpen, setQuickActionsOpen] = useState(false)

	const messagesScrollRef = useRef<HTMLDivElement>(null)
	const stickToBottomRef = useRef(true)
	const BOTTOM_SCROLL_THRESHOLD_PX = 80

	const myId = currentUser?.id ?? ''

	const {
		threads,
		unreadMessageCount,
		unreadThreadCount,
		marioProfileId,
		markNotificationIdsRead: markIdsRead,
	} = useChatNotifications()

	const updateStickToBottomFromScroll = () => {
		const el = messagesScrollRef.current
		if (!el) return
		const distance = el.scrollHeight - el.scrollTop - el.clientHeight
		stickToBottomRef.current = distance <= BOTTOM_SCROLL_THRESHOLD_PX
	}

	useEffect(() => {
		const mq = window.matchMedia(DESKTOP_MQ)
		const apply = () => setIsDesktop(mq.matches)
		apply()
		mq.addEventListener('change', apply)
		return () => mq.removeEventListener('change', apply)
	}, [])

	const filteredAdminContacts = useMemo(() => {
		const base = adminProfiles
			.filter((p) => p.id !== myId)
			.filter((p) => matchProfile(p, adminContactSearch))
		return sortByChatRecency(base, adminLastByPeer)
	}, [adminProfiles, myId, adminContactSearch, adminLastByPeer])

	useEffect(() => {
		if (!dockOpen || !isDesktop || !currentUser?.isAdmin || !adminShowContactList || !myId) return
		let cancelled = false
		void (async () => {
			const map = await loadChatInboxPreviews(supabase, myId)
			if (!cancelled) setAdminLastByPeer(map)
		})()
		return () => {
			cancelled = true
		}
	}, [dockOpen, isDesktop, currentUser?.isAdmin, adminShowContactList, myId, supabase])

	useEffect(() => {
		if (!dockOpen || !isDesktop || !currentUser?.isAdmin || !adminShowContactList || !myId) return
		const merge = (raw: { sender_id: string; receiver_id: string; content: string; created_at: string }) => {
			const peer = raw.sender_id === myId ? raw.receiver_id : raw.sender_id
			setAdminLastByPeer((prev) => {
				const next: PeerPreview = {
					preview: chatContentPreviewLine(raw.content),
					createdAt: raw.created_at,
				}
				const cur = prev[peer]
				if (cur && new Date(cur.createdAt).getTime() > new Date(next.createdAt).getTime()) return prev
				return { ...prev, [peer]: next }
			})
		}
		const ch = supabase
			.channel(`floating-admin-inbox-${myId}`)
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `sender_id=eq.${myId}` },
				(payload) => merge(payload.new as { sender_id: string; receiver_id: string; content: string; created_at: string })
			)
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `receiver_id=eq.${myId}` },
				(payload) => merge(payload.new as { sender_id: string; receiver_id: string; content: string; created_at: string })
			)
			.subscribe()
		return () => {
			supabase.removeChannel(ch)
		}
	}, [dockOpen, isDesktop, currentUser?.isAdmin, adminShowContactList, myId, supabase])

	const peerLabel = useCallback(
		(pid: string) => {
			const p = adminProfiles.find((x) => x.id === pid)
			if (p?.name?.trim()) return p.name.trim()
			if (p?.email) return p.email
			const th = threads.find((t) => t.peerId === pid)
			return th?.items[0]?.title?.trim() || 'Chat'
		},
		[adminProfiles, threads]
	)

	const loadThread = useCallback(
		async (otherId: string) => {
			if (!myId || !otherId) return
			stickToBottomRef.current = true
			setThreadLoading(true)
			const { data, error } = await supabase
				.from('chat_messages')
				.select('id, sender_id, receiver_id, content, created_at')
				.or(`and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`)
				.order('created_at', { ascending: true })
			setThreadLoading(false)
			if (error) {
				toast.error('No se pudieron cargar los mensajes')
				setMessages([])
				return
			}
			setMessages((data as ChatMsg[]) ?? [])
		},
		[myId, supabase]
	)

	useEffect(() => {
		if (!dockOpen || !isDesktop || !peerId) return
		void loadThread(peerId)
		const th = threads.find((t) => t.peerId === peerId)
		if (th?.items.some((x) => !x.read_at)) {
			void markIdsRead(th.items.map((x) => x.id))
		}
	}, [dockOpen, isDesktop, peerId, loadThread, threads])

	useEffect(() => {
		if (!stickToBottomRef.current || !dockOpen) return
		const t = requestAnimationFrame(() => {
			const el = messagesScrollRef.current
			if (el) el.scrollTop = el.scrollHeight
		})
		return () => cancelAnimationFrame(t)
	}, [messages, dockOpen])

	useEffect(() => {
		if (!dockOpen || !isDesktop || !peerId || !myId) return
		const ch = supabase
			.channel(`floating-dock-msg-${peerId}-${myId}`)
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'chat_messages' },
				(payload) => {
					const row = payload.new as ChatMsg
					const ok =
						(row.sender_id === myId && row.receiver_id === peerId) ||
						(row.sender_id === peerId && row.receiver_id === myId)
					if (!ok) return
					setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]))
				}
			)
			.subscribe()
		return () => {
			supabase.removeChannel(ch)
		}
	}, [dockOpen, isDesktop, peerId, myId, supabase])

	const closeDock = () => {
		setDockOpen(false)
		setPeerId(null)
		setMessages([])
		setAdminShowContactList(false)
		setAdminContactSearch('')
		setAdminLastByPeer({})
	}

	useEffect(() => {
		if (!quickActionsOpen) return
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setQuickActionsOpen(false)
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [quickActionsOpen])

	useEffect(() => {
		setQuickActionsOpen(false)
	}, [pathname])

	const goFullInbox = () => {
		router.push(currentUser?.isAdmin || currentUser?.isModerator ? '/admin/messages' : '/message/contactos')
		closeDock()
	}

	const openDock = () => {
		setQuickActionsOpen(false)
		if (!isDesktop) {
			if (threads.length === 0) {
				goFullInbox()
				return
			}
			const latest = threads[0]!.items[0]!
			const unread = threads[0]!.items.filter((x) => !x.read_at).map((x) => x.id)
			if (unread.length) void markIdsRead(unread)
			router.push(resolveMessageLink(latest, currentUser))
			return
		}
		if (currentUser?.isAdmin) {
			setDockOpen(true)
			setAdminShowContactList(true)
			setAdminContactSearch('')
			setPeerId(null)
			setMessages([])
			void loadAdminProfiles()
			return
		}
		setDockOpen(true)
		if (threads.length > 0) setPeerId(threads[0]!.peerId)
		else setPeerId(null)
	}

	const openFullChat = () => {
		if (!peerId) {
			goFullInbox()
			return
		}
		const fake: ChatNotificationRow = {
			id: '',
			type: 'message',
			title: '',
			body: null,
			link_url: messageChatInboxUrl(peerId, currentUser, marioProfileId),
			related_id: peerId,
			read_at: null,
			created_at: '',
		}
		router.push(resolveMessageLink(fake, currentUser))
		closeDock()
	}

	const handleSendText = async () => {
		const t = draft.trim()
		if (!t || !myId || !peerId) return
		setSending(true)
		const { data: newMsg, error } = await supabase
			.from('chat_messages')
			.insert({ sender_id: myId, receiver_id: peerId, content: t })
			.select('id, sender_id, receiver_id, content, created_at')
			.single()
		setSending(false)
		if (error) {
			toast.error(error.message ?? 'Error al enviar')
			return
		}
		if (newMsg) {
			stickToBottomRef.current = true
			setMessages((prev) => [...prev, newMsg as ChatMsg])
		}
		setDraft('')
	}

	const handleSendVoice = async (blob: Blob, durationSec: number) => {
		if (!myId || !peerId) return
		setSending(true)
		const r = await sendChatVoiceMessage(supabase, myId, peerId, blob, durationSec)
		setSending(false)
		if ('error' in r) {
			toast.error(r.error)
			return
		}
		stickToBottomRef.current = true
		setMessages((prev) => [...prev, r.message as ChatMsg])
	}

	const handleSendImage = async (file: File) => {
		if (!myId || !peerId) return
		setSending(true)
		const r = await sendChatImageMessage(supabase, myId, peerId, file)
		setSending(false)
		if ('error' in r) {
			toast.error(r.error)
			return
		}
		stickToBottomRef.current = true
		setMessages((prev) => [...prev, r.message as ChatMsg])
	}

	const onSelectPeer = (pid: string) => {
		setPeerId(pid)
		setAdminShowContactList(false)
		stickToBottomRef.current = true
		const th = threads.find((t) => t.peerId === pid)
		if (th?.items.some((x) => !x.read_at)) void markIdsRead(th.items.map((x) => x.id))
	}

	const backToAdminContactList = () => {
		setAdminShowContactList(true)
		setPeerId(null)
		setMessages([])
	}

	const backToContactsFromChat = () => {
		if (currentUser?.isAdmin) {
			backToAdminContactList()
			return
		}
		goFullInbox()
	}

	/** Móvil/tablet colapsado (<lg): más arriba y pegado al borde para no tapar “Enviar” ni botones inferiores. Abierto o escritorio: FAB clásico (lg: con media query evita parpadeo al hidratar). */
	const fabPositionClass = cn(
		'transition-[bottom,right,padding] duration-200 ease-out',
		quickActionsOpen
			? 'bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(0.35rem,env(safe-area-inset-right,0px))] sm:right-[max(0.5rem,env(safe-area-inset-right,0px))] lg:right-[max(0.75rem,env(safe-area-inset-right,0px))] pr-0'
			: 'max-lg:bottom-[max(5.75rem,calc(env(safe-area-inset-bottom,0px)+5rem))] max-lg:right-0 max-lg:pr-0 lg:bottom-[max(1rem,env(safe-area-inset-bottom,0px))] lg:right-[max(0.75rem,env(safe-area-inset-right,0px))] lg:pr-0'
	)

	const fabToggleClass = cn(
		'relative pointer-events-auto border-0 text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#5A000E] active:scale-95',
		quickActionsOpen
			? 'flex h-14 w-14 items-center justify-center rounded-full'
			: 'max-lg:flex max-lg:h-12 max-lg:min-w-[3rem] max-lg:items-center max-lg:justify-center max-lg:rounded-l-full max-lg:rounded-r-none max-lg:border-r-0 max-lg:pl-2.5 max-lg:pr-[max(0.35rem,env(safe-area-inset-right,0px))] lg:flex lg:h-14 lg:w-14 lg:items-center lg:justify-center lg:rounded-full'
	)

	const hideMobileChatFab = !isDesktop && isFullscreenMobileChatPath(pathname)

	return (
		<>
			{!hideMobileChatFab && quickActionsOpen ? (
				<button
					type="button"
					aria-label="Cerrar acciones rápidas"
					className="pointer-events-auto fixed inset-0 z-[28] bg-black/20 dark:bg-black/35 lg:bg-black/15"
					onClick={() => setQuickActionsOpen(false)}
				/>
			) : null}

			{!hideMobileChatFab ? (
			<div
				className={cn(
					'pointer-events-none fixed z-30 flex flex-col items-end gap-3',
					fabPositionClass
				)}
			>
				{quickActionsOpen && currentUser ? (
					<button
						type="button"
						onClick={() => void openDock()}
						className="pointer-events-auto relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[#5A6268] text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#4a5156] active:scale-95 dark:border-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500"
						aria-label={isDesktop ? 'Abrir mensajes' : 'Ir al chat'}
					>
						<MessageCircle className="h-5 w-5" strokeWidth={2} />
						{unreadThreadCount > 0 && (
							<span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#8B0015] px-1 text-[10px] font-bold text-white">
								{unreadThreadCount > 9 ? '9+' : unreadThreadCount}
							</span>
						)}
					</button>
				) : null}
				{quickActionsOpen ? (
					<Link
						href="/cartelera"
						onClick={() => setQuickActionsOpen(false)}
						className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#634942] active:scale-95"
						style={{ backgroundColor: CST.acento }}
						aria-label="Publicidades"
					>
						<Megaphone className="h-5 w-5" />
					</Link>
				) : null}
				{quickActionsOpen ? (
					<Link
						href="/create"
						onClick={() => setQuickActionsOpen(false)}
						className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#5A000E] active:scale-95"
						style={{ backgroundColor: CST.bordo }}
						aria-label="Crear publicación"
					>
						<PenLine className="h-5 w-5" />
					</Link>
				) : null}
				<button
					type="button"
					onClick={() => setQuickActionsOpen((o) => !o)}
					className={fabToggleClass}
					style={{ backgroundColor: CST.bordo }}
					aria-expanded={quickActionsOpen}
					aria-label={
						quickActionsOpen
							? 'Cerrar menú de acciones'
							: unreadMessageCount > 0 && currentUser
								? `Abrir menú: chat, publicidad y publicar (${unreadMessageCount} mensajes sin leer)`
								: 'Abrir menú: chat, publicidad y publicar'
					}
				>
					{!quickActionsOpen && currentUser && unreadMessageCount > 0 ? (
						<span
							className="pointer-events-none absolute left-0 top-0 z-10 flex -translate-x-[10%] -translate-y-[18%] items-center gap-0.5 rounded-full border border-black/15 bg-[#00CFC4] px-1 py-0.5 pl-1 pr-1.5 shadow-md ring-1 ring-[#00FFF0]/90"
							aria-hidden
						>
							<span className="h-2 w-2 shrink-0 rounded-full bg-[#00FFF0] shadow-[0_0_8px_2px_rgba(0,255,240,0.85)]" />
							<span className="min-w-[0.65rem] text-center text-[10px] font-bold tabular-nums leading-none text-[#042a28]">
								{unreadMessageCount > 99 ? '99+' : unreadMessageCount}
							</span>
						</span>
					) : null}
					{quickActionsOpen ? (
						<X className="h-6 w-6" strokeWidth={2.25} />
					) : (
						<Plus className="h-5 w-5 lg:h-6 lg:w-6" strokeWidth={2.25} />
					)}
				</button>
			</div>
			) : null}

			{currentUser && dockOpen && isDesktop && (
				<div
					className={cn(
						'pointer-events-auto fixed z-[55] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-[#2A3942] dark:bg-[#0B141A]',
						/* Alineado con la columna FAB (borde + h-14 + gap) */
						'left-auto top-auto',
						'bottom-[max(1rem,env(safe-area-inset-bottom,0px))]',
						'right-[calc(env(safe-area-inset-right,0px)+0.35rem+3.5rem+0.75rem)] sm:right-[calc(env(safe-area-inset-right,0px)+0.5rem+3.5rem+0.75rem)] lg:right-[calc(env(safe-area-inset-right,0px)+0.75rem+3.5rem+0.75rem)]',
						'h-[min(560px,calc(100dvh-6rem))] max-h-[min(560px,calc(100dvh-6rem))]',
						'w-[min(400px,calc(100dvw-6.5rem))]'
					)}
					role="dialog"
					aria-label={
						adminShowContactList
							? 'Contactos'
							: peerId
								? `Chat con ${peerLabel(peerId)}`
								: 'Mensajes'
					}
				>
					<div className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-[#f0f2f5] px-2 py-2 pr-1 dark:border-[#2A3942] dark:bg-[#202C33] sm:gap-2 sm:px-3">
						{peerId && !adminShowContactList ? (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-8 w-8 shrink-0 text-slate-600 hover:bg-slate-200/80 dark:text-[#AEBAC1] dark:hover:bg-white/10 dark:hover:text-white"
								onClick={backToContactsFromChat}
								aria-label={
									currentUser?.isAdmin ? 'Volver a la lista de contactos' : 'Ir a todos los contactos'
								}
							>
								<ArrowLeft className="h-4 w-4" />
							</Button>
						) : null}
						<h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-[#E9EDEF]">
							{adminShowContactList ? 'Contactos' : peerId ? peerLabel(peerId) : 'Mensajes'}
						</h2>
						{threads.length > 1 && peerId && !adminShowContactList && (
							<select
								value={peerId}
								onChange={(e) => onSelectPeer(e.target.value)}
								className="max-w-[10rem] truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-[#2A3942] dark:bg-[#2A3942] dark:text-[#E9EDEF]"
							>
								{threads.map((t) => (
									<option key={t.peerId} value={t.peerId}>
										{peerLabel(t.peerId)}
									</option>
								))}
							</select>
						)}
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-8 w-8 shrink-0 text-slate-600 hover:bg-slate-200/80 dark:text-[#AEBAC1] dark:hover:bg-white/10 dark:hover:text-white"
							onClick={openFullChat}
							aria-label="Abrir chat completo"
						>
							<ExternalLink className="h-4 w-4" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-8 w-8 shrink-0 text-slate-600 hover:bg-slate-200/80 dark:text-[#AEBAC1] dark:hover:bg-white/10 dark:hover:text-white"
							onClick={closeDock}
							aria-label="Cerrar"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>

					{currentUser?.isAdmin && adminShowContactList ? (
						<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden bg-slate-50 px-3 pb-3 pt-2 dark:bg-[#111B21]">
							<div className="relative shrink-0">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-[#8696A0]" />
								<Input
									value={adminContactSearch}
									onChange={(e) => setAdminContactSearch(e.target.value)}
									placeholder="Nombre, email o teléfono…"
									className="border border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-500 dark:border-0 dark:bg-[#202C33] dark:text-[#E9EDEF] dark:placeholder:text-[#8696A0]"
									aria-label="Buscar contacto"
								/>
							</div>
							<div className="min-h-0 flex-1 overflow-y-auto -mx-1 px-1">
								{adminProfilesLoading ? (
									<div className="flex justify-center py-8">
										<Loader2 className="h-6 w-6 animate-spin text-slate-400 dark:text-[#8696A0]" />
									</div>
								) : filteredAdminContacts.length === 0 ? (
									<p className="px-2 py-6 text-center text-xs text-slate-600 dark:text-[#8696A0]">
										{adminProfiles.filter((p) => p.id !== myId).length === 0
											? 'No hay otros usuarios.'
											: 'Ningún usuario coincide con la búsqueda.'}
									</p>
								) : (
									<ul className="flex flex-col gap-0.5">
										{filteredAdminContacts.map((profile) => {
											const last = adminLastByPeer[profile.id]
											const subtitle = last?.preview?.trim() ? last.preview : 'Sin mensajes aún'
											const timeLabel = last?.createdAt ? formatChatListTime(last.createdAt) : ''
											const title = profile.name?.trim() || profile.email || 'Usuario'
											return (
												<li key={profile.id}>
													<button
														type="button"
														onClick={() => onSelectPeer(profile.id)}
														className="flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-left text-sm transition hover:bg-slate-200/80 dark:hover:bg-[#2A3942]/80"
													>
														<Avatar className="h-10 w-10 shrink-0">
															<AvatarImage src={profile.avatar_url ?? undefined} />
															<AvatarFallback className="bg-slate-200 text-xs text-slate-700 dark:bg-[#313D43] dark:text-[#E9EDEF]">
																{title[0]?.toUpperCase() ?? '?'}
															</AvatarFallback>
														</Avatar>
														<div className="min-w-0 flex-1">
															<div className="flex items-baseline justify-between gap-2">
																<p className="truncate font-medium text-slate-900 dark:text-[#E9EDEF]">
																	{title}
																</p>
																{timeLabel ? (
																	<span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-[#8696A0]">
																		{timeLabel}
																	</span>
																) : null}
															</div>
															<p className="truncate text-xs text-slate-600 dark:text-[#8696A0]">{subtitle}</p>
														</div>
													</button>
												</li>
											)
										})}
									</ul>
								)}
							</div>
						</div>
					) : threads.length === 0 && !currentUser?.isAdmin ? (
						<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600 dark:bg-[#111B21] dark:text-[#8696A0]">
							<p>No tenés mensajes sin leer recientes.</p>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="border-slate-200 bg-white text-slate-900 hover:bg-slate-100 dark:border-[#2A3942] dark:bg-[#202C33] dark:text-[#E9EDEF] dark:hover:bg-[#2A3942]"
								onClick={() => goFullInbox()}
							>
								Ir al chat
							</Button>
						</div>
					) : peerId ? (
						<>
							<div
								ref={messagesScrollRef}
								onScroll={updateStickToBottomFromScroll}
								className="chat-wa-wallpaper min-h-0 flex-1 overflow-y-auto px-1 py-2"
							>
								{threadLoading ? (
									<div className="flex justify-center py-8">
										<Loader2 className="h-6 w-6 animate-spin text-slate-400 dark:text-[#8696A0]" />
									</div>
								) : messages.length === 0 ? (
									<p className="py-6 text-center text-xs text-slate-600 dark:text-[#8696A0]">Sin mensajes en este hilo.</p>
								) : (
									<div className="flex flex-col gap-0.5">
										{messages.map((msg) => (
											<WhatsAppMessageBubble
												key={msg.id}
												message={msg}
												isMine={msg.sender_id === myId}
											/>
										))}
									</div>
								)}
							</div>
							<WhatsAppComposer
								value={draft}
								onChange={setDraft}
								onSubmitText={() => void handleSendText()}
								sending={sending}
								onSendVoice={(blob, dur) => handleSendVoice(blob, dur)}
								onSendImage={(file) => handleSendImage(file)}
							/>
						</>
					) : (
						<div className="flex min-h-0 flex-1 items-center justify-center px-4 py-8 text-sm text-slate-500 dark:text-gray-400">
							Elegí una conversación en el menú superior.
						</div>
					)}
				</div>
			)}
		</>
	)
}
