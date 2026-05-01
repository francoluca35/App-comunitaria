'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExternalLink, Loader2, Megaphone, MessageCircle, PenLine, Search, Send, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useApp, type AdminProfile } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import { showSystemNotification } from '@/lib/notifications'
import {
	groupMessageThreads,
	messageChatInboxUrl,
	resolveMessageLink,
	type ChatNotificationRow,
} from '@/lib/chat-notification-ui'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { cn } from '@/app/components/ui/utils'
import { toast } from 'sonner'
import { MessageContent } from '@/components/MessageContent'
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
	const supabase = useMemo(() => createClient(), [])

	const [rows, setRows] = useState<ChatNotificationRow[]>([])
	const [dockOpen, setDockOpen] = useState(false)
	const [peerId, setPeerId] = useState<string | null>(null)
	const [messages, setMessages] = useState<ChatMsg[]>([])
	const [threadLoading, setThreadLoading] = useState(false)
	const [draft, setDraft] = useState('')
	const [sending, setSending] = useState(false)
	const [isDesktop, setIsDesktop] = useState(false)
	/** Id del perfil Mario (solo vecinos); para armar `/message/mario` vs `/message/{id}` en optimistas. */
	const [marioProfileId, setMarioProfileId] = useState<string | null>(null)
	/** Solo admin (desktop): al abrir el dock, primero la lista de todos los contactos. */
	const [adminShowContactList, setAdminShowContactList] = useState(false)
	const [adminContactSearch, setAdminContactSearch] = useState('')

	const messagesScrollRef = useRef<HTMLDivElement>(null)
	const stickToBottomRef = useRef(true)
	const BOTTOM_SCROLL_THRESHOLD_PX = 80

	const myId = currentUser?.id ?? ''

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
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.access_token) return
			const res = await fetch('/api/message/mario', {
				headers: { Authorization: `Bearer ${session.access_token}` },
			})
			if (!res.ok || cancelled) return
			const j = (await res.json()) as { id?: string }
			if (j?.id && !cancelled) setMarioProfileId(j.id)
		})()
		return () => {
			cancelled = true
		}
	}, [currentUser?.id, currentUser?.isAdmin, currentUser?.isModerator, supabase.auth])

	const fetchMessageRows = useCallback(async () => {
		if (!currentUser?.id) return
		try {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.access_token) return
			const res = await fetch('/api/notifications', {
				headers: { Authorization: `Bearer ${session.access_token}` },
			})
			const data: unknown = await res.json().catch(() => null)
			if (!res.ok || !Array.isArray(data)) return
			const only = (data as ChatNotificationRow[]).filter((r) => r.type === 'message')
			only.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
			setRows(only)
		} finally {
			/* noop */
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
						const optIndex = prev.findIndex(
							(n) => n.id.startsWith('opt-') && n.related_id === row.related_id
						)
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
	const filteredAdminContacts = useMemo(() => {
		return adminProfiles
			.filter((p) => p.id !== myId)
			.filter((p) => matchProfile(p, adminContactSearch))
			.sort((a, b) => (a.name ?? a.email ?? '').localeCompare(b.name ?? b.email ?? '', 'es'))
	}, [adminProfiles, myId, adminContactSearch])
	const unreadThreadCount = useMemo(
		() => threads.filter((t) => t.items.some((x) => !x.read_at)).length,
		[threads]
	)

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

	const markIdsRead = async (ids: string[]) => {
		const realIds = ids.filter((id) => !id.startsWith('opt-'))
		setRows((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n)))
		if (!realIds.length) return
		const { data: { session } } = await supabase.auth.getSession()
		if (!session?.access_token) return
		await fetch('/api/notifications', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
			body: JSON.stringify({ ids: realIds }),
		})
	}

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
	}

	const goFullInbox = () => {
		router.push(currentUser?.isAdmin || currentUser?.isModerator ? '/admin/messages' : '/message/contactos')
		closeDock()
	}

	const openDock = () => {
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

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault()
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

	return (
		<>
			<div className="pointer-events-none fixed bottom-6 right-4 z-30 flex flex-col items-end gap-3 sm:right-6 lg:right-8">
				{currentUser && (
					<button
						type="button"
						onClick={openDock}
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
				)}
				<Link
					href="/cartelera"
					className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#634942] active:scale-95"
					style={{ backgroundColor: CST.acento }}
					aria-label="Publicidades"
				>
					<Megaphone className="h-5 w-5" />
				</Link>
				<Link
					href="/create"
					className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#5A000E] active:scale-95"
					style={{ backgroundColor: CST.bordo }}
					aria-label="Crear publicación"
				>
					<PenLine className="h-6 w-6" />
				</Link>
			</div>

			{currentUser && dockOpen && isDesktop && (
				<div
					className={cn(
						'pointer-events-auto fixed z-[55] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-slate-900',
						/* Misma base vertical que los FAB (bottom-6); a la izquierda de la columna de botones, no encima */
						'left-auto top-auto',
						'bottom-6',
						/* right-4/6/8 + ancho máx. FAB (h-14 = 3.5rem) + separación */
						'right-[calc(1rem+3.5rem+0.75rem)] sm:right-[calc(1.5rem+3.5rem+0.75rem)] lg:right-[calc(2rem+3.5rem+0.75rem)]',
						'h-[min(560px,calc(100dvh-6rem))] max-h-[min(560px,calc(100dvh-6rem))]',
						'w-[min(400px,calc(100dvw-6.5rem))]'
					)}
					role="dialog"
					aria-label={currentUser?.isAdmin && adminShowContactList ? 'Contactos' : 'Mensajes'}
				>
					<div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-gray-700">
						<h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
							{currentUser?.isAdmin && adminShowContactList ? 'Contactos' : 'Mensajes'}
						</h2>
						{currentUser?.isAdmin && peerId && !adminShowContactList && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-8 shrink-0 px-2 text-xs"
								onClick={backToAdminContactList}
							>
								Contactos
							</Button>
						)}
						{threads.length > 1 && peerId && !adminShowContactList && (
							<select
								value={peerId}
								onChange={(e) => onSelectPeer(e.target.value)}
								className="max-w-[10rem] truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-slate-800 dark:text-white"
							>
								{threads.map((t) => (
									<option key={t.peerId} value={t.peerId}>
										{peerLabel(t.peerId)}
									</option>
								))}
							</select>
						)}
						<Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={openFullChat} aria-label="Abrir chat completo">
							<ExternalLink className="h-4 w-4" />
						</Button>
						<Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={closeDock} aria-label="Cerrar">
							<X className="h-4 w-4" />
						</Button>
					</div>

					{currentUser?.isAdmin && adminShowContactList ? (
						<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3 pb-3 pt-2">
							<div className="relative shrink-0">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<Input
									value={adminContactSearch}
									onChange={(e) => setAdminContactSearch(e.target.value)}
									placeholder="Nombre, email o teléfono…"
									className="pl-9 text-sm"
									aria-label="Buscar contacto"
								/>
							</div>
							<div className="min-h-0 flex-1 overflow-y-auto -mx-1 px-1">
								{adminProfilesLoading ? (
									<div className="flex justify-center py-8">
										<Loader2 className="h-6 w-6 animate-spin text-slate-400" />
									</div>
								) : filteredAdminContacts.length === 0 ? (
									<p className="px-2 py-6 text-center text-xs text-slate-500 dark:text-gray-400">
										{adminProfiles.filter((p) => p.id !== myId).length === 0
											? 'No hay otros usuarios.'
											: 'Ningún usuario coincide con la búsqueda.'}
									</p>
								) : (
									<ul className="flex flex-col gap-0.5">
										{filteredAdminContacts.map((profile) => (
											<li key={profile.id}>
												<button
													type="button"
													onClick={() => onSelectPeer(profile.id)}
													className="flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800"
												>
													<Avatar className="h-10 w-10 shrink-0">
														<AvatarImage src={profile.avatar_url ?? undefined} />
														<AvatarFallback className="text-xs">
															{(profile.name ?? profile.email)?.[0]?.toUpperCase() ?? '?'}
														</AvatarFallback>
													</Avatar>
													<div className="min-w-0 flex-1">
														<p className="truncate font-medium text-slate-900 dark:text-white">
															{profile.name?.trim() || profile.email}
														</p>
														<p className="truncate text-xs text-slate-500 dark:text-slate-400">{profile.email}</p>
													</div>
												</button>
											</li>
										))}
									</ul>
								)}
							</div>
						</div>
					) : threads.length === 0 && !currentUser?.isAdmin ? (
						<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-center text-sm text-slate-500 dark:text-gray-400">
							<p>No tenés mensajes sin leer recientes.</p>
							<Button type="button" variant="outline" size="sm" onClick={() => goFullInbox()}>
								Ir al chat
							</Button>
						</div>
					) : peerId ? (
						<>
							{threads.length === 1 && (
								<div className="shrink-0 truncate border-b border-slate-100 px-3 py-2 text-xs font-medium text-slate-700 dark:border-gray-800 dark:text-gray-200">
									{peerLabel(peerId)}
								</div>
							)}
							<div
								ref={messagesScrollRef}
								onScroll={updateStickToBottomFromScroll}
								className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-3 dark:bg-slate-800/40"
							>
								{threadLoading ? (
									<div className="flex justify-center py-8">
										<Loader2 className="h-6 w-6 animate-spin text-slate-400" />
									</div>
								) : messages.length === 0 ? (
									<p className="py-6 text-center text-xs text-slate-500">Sin mensajes en este hilo.</p>
								) : (
									<div className="flex flex-col gap-2">
										{messages.map((msg) => {
											const mine = msg.sender_id === myId
											return (
												<div key={msg.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
													<div
														className={cn(
															'max-w-[90%] rounded-2xl px-3 py-1.5 text-sm',
															mine
																? 'bg-[#8B0015] text-white'
																: 'border border-slate-200 bg-white text-slate-900 dark:border-gray-600 dark:bg-slate-700 dark:text-white'
														)}
													>
														<MessageContent content={msg.content} variant={mine ? 'light' : 'dark'} />
														<p className={cn('mt-0.5 text-[10px]', mine ? 'text-[#F3C9D0]' : 'text-slate-500 dark:text-gray-400')}>
															{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: es })}
														</p>
													</div>
												</div>
											)
										})}
									</div>
								)}
							</div>
							<form onSubmit={handleSend} className="flex shrink-0 gap-2 border-t border-slate-200 p-2 dark:border-gray-700">
								<Input
									value={draft}
									onChange={(e) => setDraft(e.target.value)}
									placeholder="Escribí un mensaje…"
									className="flex-1 text-sm"
									disabled={sending}
								/>
								<Button type="submit" size="icon" disabled={sending || !draft.trim()} aria-label="Enviar">
									<Send className="h-4 w-4" />
								</Button>
							</form>
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
