'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useApp, type AdminProfile } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ArrowLeft, ExternalLink, Search } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/app/components/ui/utils'
import { createClient } from '@/lib/supabase/client'
import {
	loadChatInboxPreviews,
	sortByChatRecency,
	formatChatListTime,
	type PeerPreview,
} from '@/lib/chat-inbox-previews'

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

export default function AdminMessagesPage() {
	const router = useRouter()
	const { currentUser, adminProfiles, adminProfilesLoading, loadAdminProfiles } = useApp()
	const supabase = useMemo(() => createClient(), [])
	const [search, setSearch] = useState('')
	const [lastByPeer, setLastByPeer] = useState<Record<string, PeerPreview>>({})
	const hasRequestedLoad = useRef(false)

	useEffect(() => {
		if (!currentUser?.isAdmin || hasRequestedLoad.current) return
		hasRequestedLoad.current = true
		loadAdminProfiles()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUser?.isAdmin])

	useEffect(() => {
		if (!currentUser?.isAdmin || !currentUser.id) return
		let cancelled = false
		void (async () => {
			const map = await loadChatInboxPreviews(supabase, currentUser.id)
			if (!cancelled) setLastByPeer(map)
		})()
		return () => {
			cancelled = true
		}
	}, [currentUser?.id, currentUser?.isAdmin, supabase])

	const filtered = useMemo(() => {
		return adminProfiles.filter((p) => matchProfile(p, search))
	}, [adminProfiles, search])

	const filteredSorted = useMemo(
		() => sortByChatRecency(filtered, lastByPeer),
		[filtered, lastByPeer]
	)

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

	return (
		<DashboardLayout contentClassName="max-w-[720px] flex min-h-0 flex-1 flex-col">
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
						onClick={() => router.push('/admin')}
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
							placeholder="Nombre, email o teléfono…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-[15px] text-slate-900 placeholder:text-slate-500 outline-none ring-1 ring-transparent focus:ring-[#00A884]/40 dark:border-0 dark:bg-[#202C33] dark:text-[#E9EDEF] dark:placeholder:text-[#8696A0]"
						/>
					</div>
					<p className="mt-2 px-0.5 text-xs text-slate-600 dark:text-[#8696A0]">
						Tocá un contacto para abrir el chat en la app. El ícono verde abre WhatsApp si hay teléfono.
					</p>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto">
					{adminProfilesLoading ? (
						<p className="py-10 text-center text-sm text-slate-600 dark:text-[#8696A0]">Cargando usuarios...</p>
					) : filteredSorted.length === 0 ? (
						<p className="px-4 py-10 text-center text-sm text-slate-600 dark:text-[#8696A0]">
							{adminProfiles.length === 0 ? 'No hay usuarios cargados.' : 'Ningún usuario coincide con la búsqueda.'}
						</p>
					) : (
						filteredSorted.map((profile) => {
							const waDigits = profile.phone?.replace(/\D/g, '') ?? ''
							const title = profile.name?.trim() || profile.email || 'Usuario'
							const last = lastByPeer[profile.id]
							const subtitle = last?.preview?.trim() ? last.preview : 'Sin mensajes aún'
							const timeLabel = last?.createdAt ? formatChatListTime(last.createdAt) : ''
							return (
								<div
									key={profile.id}
									className="flex items-stretch border-b border-slate-200 transition-colors hover:bg-slate-100 dark:border-[#2A3942] dark:hover:bg-[#2A3942]/50"
								>
									<Link
										href={`/admin/messages/chat/${profile.id}`}
										className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3"
									>
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
									<a
										href={waDigits ? `https://wa.me/${waDigits}` : '#'}
										target="_blank"
										rel="noopener noreferrer"
										aria-disabled={!waDigits}
										className={cn(
											'flex w-12 shrink-0 items-center justify-center',
											waDigits
												? 'text-[#25D366] hover:bg-slate-100 dark:hover:bg-white/5'
												: 'pointer-events-none text-slate-300 dark:text-[#8696A0]/40'
										)}
										aria-label="Abrir WhatsApp"
										onClick={(e) => {
											if (!waDigits) e.preventDefault()
										}}
									>
										<ExternalLink className="h-5 w-5" />
									</a>
								</div>
							)
						})
					)}
				</div>
			</div>
		</DashboardLayout>
	)
}
