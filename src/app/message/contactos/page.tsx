'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ArrowLeft, ExternalLink, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/app/components/ui/utils'
import {
	loadChatInboxPreviews,
	sortByChatRecency,
	formatChatListTime,
	orderedContactosRows,
	type PeerPreview,
} from '@/lib/chat-inbox-previews'

interface AdminRow {
	id: string
	name: string | null
	email: string | null
	avatar_url: string | null
	phone: string | null
}

function normalize(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/\s+/g, ' ')
		.trim()
}

function matchRow(p: AdminRow, query: string): boolean {
	if (!query.trim()) return true
	const q = normalize(query)
	const name = normalize(p.name ?? '')
	const email = normalize(p.email ?? '')
	const phone = (p.phone ?? '').replace(/\D/g, '')
	const queryDigits = query.replace(/\D/g, '')
	return (
		name.includes(q) ||
		email.includes(q) ||
		(queryDigits.length >= 2 && phone.includes(queryDigits))
	)
}

export default function MessageContactosPage() {
	const router = useRouter()
	const { currentUser } = useApp()
	const supabase = useMemo(() => createClient(), [])
	const [profiles, setProfiles] = useState<AdminRow[]>([])
	const [loading, setLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [search, setSearch] = useState('')
	const [lastByPeer, setLastByPeer] = useState<Record<string, PeerPreview>>({})
	const [marioId, setMarioId] = useState<string | null>(null)
	const hasLoaded = useRef(false)

	useEffect(() => {
		if (currentUser?.isAdmin) {
			router.replace('/admin/messages')
		}
	}, [currentUser?.isAdmin, router])

	useEffect(() => {
		if (!currentUser?.id || currentUser.isAdmin) return
		if (hasLoaded.current) return
		hasLoaded.current = true
		let cancelled = false
		;(async () => {
			setLoading(true)
			setLoadError(null)
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession()
				if (!session?.access_token || cancelled) {
					if (!cancelled) setLoadError('No hay sesión. Volvé a iniciar sesión.')
					return
				}
				const res = await fetch('/api/message/admins', {
					headers: { Authorization: `Bearer ${session.access_token}` },
				})
				const j = (await res.json().catch(() => ({}))) as { profiles?: AdminRow[]; error?: string }
				if (cancelled) return
				if (!res.ok) {
					setLoadError(j.error ?? 'No se pudo cargar el equipo. Intentá de nuevo.')
					setProfiles([])
					return
				}
				setProfiles(Array.isArray(j.profiles) ? j.profiles : [])
			} catch {
				if (!cancelled) {
					setLoadError('Error de red al cargar el equipo.')
					setProfiles([])
				}
			} finally {
				if (!cancelled) setLoading(false)
			}
		})()
		return () => {
			cancelled = true
		}
	}, [currentUser?.id, currentUser?.isAdmin, supabase.auth])

	useEffect(() => {
		if (!currentUser?.id || currentUser.isAdmin) return
		let cancelled = false
		void (async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession()
			if (!session?.access_token || cancelled) return
			const res = await fetch('/api/message/mario', {
				headers: { Authorization: `Bearer ${session.access_token}` },
			})
			if (!res.ok || cancelled) return
			const j = (await res.json()) as { id?: string }
			if (j?.id && !cancelled) setMarioId(j.id)
		})()
		return () => {
			cancelled = true
		}
	}, [currentUser?.id, currentUser?.isAdmin, supabase.auth])

	useEffect(() => {
		if (!currentUser?.id || currentUser.isAdmin) return
		let cancelled = false
		void (async () => {
			const map = await loadChatInboxPreviews(supabase, currentUser.id)
			if (!cancelled) setLastByPeer(map)
		})()
		return () => {
			cancelled = true
		}
	}, [currentUser?.id, currentUser?.isAdmin, supabase])

	const filtered = useMemo(() => profiles.filter((p) => matchRow(p, search)), [profiles, search])

	const orderedRows = useMemo(
		() => (marioId ? orderedContactosRows(filtered, marioId, lastByPeer) : null),
		[filtered, marioId, lastByPeer]
	)
	const filteredSorted = useMemo(
		() => sortByChatRecency(filtered, lastByPeer),
		[filtered, lastByPeer]
	)

	const marioLast = marioId ? lastByPeer[marioId] : undefined
	const marioPreviewLine = marioLast?.preview?.trim() ?? ''
	const marioTimeLabel = marioLast?.createdAt ? formatChatListTime(marioLast.createdAt) : ''

	if (!currentUser) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
				<Card className="w-full max-w-md">
					<CardContent className="p-6 text-center">
						<p className="mb-4 text-gray-600 dark:text-gray-400">Iniciá sesión para chatear con el equipo.</p>
						<Button onClick={() => router.push('/login')}>Ir a iniciar sesión</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (currentUser.isAdmin) {
		return (
			<DashboardLayout fillViewport contentClassName="max-w-[720px]">
				<div className="flex min-h-0 flex-1 items-center justify-center bg-white py-20 dark:bg-[#111B21]">
					<p className="text-slate-600 dark:text-[#8696A0]">Redirigiendo…</p>
				</div>
			</DashboardLayout>
		)
	}

	return (
		<DashboardLayout fillViewport contentClassName="max-w-[720px] flex min-h-0 flex-1 flex-col">
			<div
				className={cn(
					'flex min-h-0 flex-1 flex-col overflow-hidden bg-white sm:rounded-lg sm:border sm:border-slate-200 dark:bg-[#111B21] dark:sm:border-[#2A3942]'
				)}
			>
				<div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-[#f0f2f5] px-2 py-3 pl-1 dark:border-[#2A3942] dark:bg-[#202C33]">
					<Button
						variant="ghost"
						size="icon"
						className="text-slate-600 hover:bg-slate-200/80 dark:text-[#AEBAC1] dark:hover:bg-white/10 dark:hover:text-white"
						onClick={() => router.push('/')}
						aria-label="Volver"
					>
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<h1 className="text-[20px] font-medium text-slate-900 dark:text-[#E9EDEF]">Chats</h1>
				</div>

				<div className="shrink-0 bg-slate-50 px-3 pb-2 pt-2 dark:bg-[#111B21]">
					<div className="relative">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 dark:text-[#8696A0]" />
						<input
							type="search"
							placeholder="Buscar por nombre, email o teléfono…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-[15px] text-slate-900 placeholder:text-slate-500 outline-none ring-1 ring-transparent focus:ring-[#00A884]/40 dark:border-0 dark:bg-[#202C33] dark:text-[#E9EDEF] dark:placeholder:text-[#8696A0]"
							aria-label="Buscar administrador"
						/>
					</div>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto">
					{loadError ? (
						<div className="mx-3 mt-2 rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-3 text-sm text-red-100">
							<p>{loadError}</p>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="mt-2 border-red-400/50 text-red-100 hover:bg-red-900/40"
								onClick={() => {
									hasLoaded.current = false
									setLoadError(null)
									setLoading(true)
									void (async () => {
										try {
											const {
												data: { session },
											} = await supabase.auth.getSession()
											if (!session?.access_token) {
												setLoadError('No hay sesión.')
												setLoading(false)
												return
											}
											const res = await fetch('/api/message/admins', {
												headers: { Authorization: `Bearer ${session.access_token}` },
											})
											const j = (await res.json().catch(() => ({}))) as { profiles?: AdminRow[]; error?: string }
											if (!res.ok) {
												setLoadError(j.error ?? 'No se pudo cargar el equipo.')
												setProfiles([])
												return
											}
											setProfiles(Array.isArray(j.profiles) ? j.profiles : [])
											setLoadError(null)
										} catch {
											setLoadError('Error de red.')
											setProfiles([])
										} finally {
											setLoading(false)
											hasLoaded.current = true
										}
									})()
								}}
							>
								Reintentar
							</Button>
						</div>
					) : null}

					{loading ? (
						<p className="py-10 text-center text-sm text-slate-600 dark:text-[#8696A0]">Cargando equipo…</p>
					) : !orderedRows && filtered.length === 0 && !loadError ? (
						<p className="px-4 py-10 text-center text-sm text-slate-600 dark:text-[#8696A0]">
							{profiles.length === 0 ? 'No hay administradores disponibles.' : 'Ningún resultado coincide.'}
						</p>
					) : orderedRows ? (
						orderedRows.map((row) => {
							if (row.kind === 'mario') {
								return (
									<Link
										key="mario"
										href="/message/mario"
										className="flex items-center gap-3 border-b border-slate-200 px-3 py-3 transition-colors hover:bg-slate-100 dark:border-[#2A3942] dark:hover:bg-[#2A3942]/50"
									>
										<Avatar className="h-12 w-12 shrink-0">
											<AvatarFallback className="bg-[#00A884] text-lg font-semibold text-white">M</AvatarFallback>
										</Avatar>
										<div className="min-w-0 flex-1">
											<div className="flex items-baseline justify-between gap-2">
												<p className="truncate text-[17px] font-medium text-slate-900 dark:text-[#E9EDEF]">
													Mario Stebler
												</p>
												{marioTimeLabel ? (
													<span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-[#8696A0]">
														{marioTimeLabel}
													</span>
												) : null}
											</div>
											<p className="truncate text-sm text-slate-600 dark:text-[#8696A0]">
												{marioPreviewLine || 'Referente · tocá para chatear'}
											</p>
										</div>
									</Link>
								)
							}
							const profile = row.profile
							const waDigits = profile.phone?.replace(/\D/g, '') ?? ''
							const title = profile.name?.trim() || profile.email || 'Equipo'
							const last = lastByPeer[profile.id]
							const subtitle = last?.preview?.trim() ? last.preview : 'Sin mensajes aún'
							const timeLabel = last?.createdAt ? formatChatListTime(last.createdAt) : ''
							return (
								<div
									key={profile.id}
									className="flex items-stretch border-b border-slate-200 transition-colors hover:bg-slate-100 dark:border-[#2A3942] dark:hover:bg-[#2A3942]/50"
								>
									<Link href={`/message/${profile.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3">
										<Avatar className="h-12 w-12 shrink-0">
											<AvatarImage src={profile.avatar_url ?? undefined} />
											<AvatarFallback className="bg-slate-200 text-sm text-slate-700 dark:bg-[#313D43] dark:text-[#E9EDEF]">
												{title[0]?.toUpperCase() ?? '?'}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0 flex-1">
											<div className="flex items-baseline justify-between gap-2">
												<p className="truncate text-[17px] font-medium text-slate-900 dark:text-[#E9EDEF]">
													{title}
												</p>
												{timeLabel ? (
													<span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-[#8696A0]">
														{timeLabel}
													</span>
												) : null}
											</div>
											<p className="truncate text-sm text-slate-600 dark:text-[#8696A0]">{subtitle}</p>
										</div>
									</Link>
									{waDigits ? (
										<a
											href={`https://wa.me/${waDigits}`}
											target="_blank"
											rel="noopener noreferrer"
											className="flex w-12 shrink-0 items-center justify-center text-[#25D366] hover:bg-white/5"
											aria-label="Abrir WhatsApp"
											onClick={(e) => e.stopPropagation()}
										>
											<ExternalLink className="h-5 w-5" />
										</a>
									) : null}
								</div>
							)
						})
					) : (
						<>
							<Link
								href="/message/mario"
								className="flex items-center gap-3 border-b border-slate-200 px-3 py-3 transition-colors hover:bg-slate-100 dark:border-[#2A3942] dark:hover:bg-[#2A3942]/50"
							>
								<Avatar className="h-12 w-12 shrink-0">
									<AvatarFallback className="bg-[#00A884] text-lg font-semibold text-white">M</AvatarFallback>
								</Avatar>
								<div className="min-w-0 flex-1">
									<div className="flex items-baseline justify-between gap-2">
										<p className="truncate text-[17px] font-medium text-slate-900 dark:text-[#E9EDEF]">
											Mario Stebler
										</p>
										{marioTimeLabel ? (
											<span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-[#8696A0]">
												{marioTimeLabel}
											</span>
										) : null}
									</div>
									<p className="truncate text-sm text-slate-600 dark:text-[#8696A0]">
										{marioPreviewLine || 'Referente · tocá para chatear'}
									</p>
								</div>
							</Link>
							{filteredSorted.length === 0 && !loadError ? (
								<p className="px-4 py-10 text-center text-sm text-slate-600 dark:text-[#8696A0]">
									{profiles.length === 0 ? 'No hay administradores disponibles.' : 'Ningún resultado coincide.'}
								</p>
							) : (
								filteredSorted.map((profile) => {
									const waDigits = profile.phone?.replace(/\D/g, '') ?? ''
									const title = profile.name?.trim() || profile.email || 'Equipo'
									const last = lastByPeer[profile.id]
									const subtitle = last?.preview?.trim() ? last.preview : 'Sin mensajes aún'
									const timeLabel = last?.createdAt ? formatChatListTime(last.createdAt) : ''
									return (
										<div
											key={profile.id}
											className="flex items-stretch border-b border-slate-200 transition-colors hover:bg-slate-100 dark:border-[#2A3942] dark:hover:bg-[#2A3942]/50"
										>
											<Link href={`/message/${profile.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3">
												<Avatar className="h-12 w-12 shrink-0">
													<AvatarImage src={profile.avatar_url ?? undefined} />
													<AvatarFallback className="bg-slate-200 text-sm text-slate-700 dark:bg-[#313D43] dark:text-[#E9EDEF]">
														{title[0]?.toUpperCase() ?? '?'}
													</AvatarFallback>
												</Avatar>
												<div className="min-w-0 flex-1">
													<div className="flex items-baseline justify-between gap-2">
														<p className="truncate text-[17px] font-medium text-slate-900 dark:text-[#E9EDEF]">
															{title}
														</p>
														{timeLabel ? (
															<span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-[#8696A0]">
																{timeLabel}
															</span>
														) : null}
													</div>
													<p className="truncate text-sm text-slate-600 dark:text-[#8696A0]">{subtitle}</p>
												</div>
											</Link>
											{waDigits ? (
												<a
													href={`https://wa.me/${waDigits}`}
													target="_blank"
													rel="noopener noreferrer"
													className="flex w-12 shrink-0 items-center justify-center text-[#25D366] hover:bg-white/5"
													aria-label="Abrir WhatsApp"
													onClick={(e) => e.stopPropagation()}
												>
													<ExternalLink className="h-5 w-5" />
												</a>
											) : null}
										</div>
									)
								})
							)}
						</>
					)}
				</div>
			</div>
		</DashboardLayout>
	)
}
