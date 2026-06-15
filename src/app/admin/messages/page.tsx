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
import { canUseAdminContactSearch } from '@/lib/admin-contact-search'

export default function AdminMessagesPage() {
	const router = useRouter()
	const { currentUser, adminProfilesLoading, searchAdminProfiles, fetchAdminProfilesByIds } = useApp()
	const supabase = useMemo(() => createClient(), [])
	const [search, setSearch] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState('')
	const [lastByPeer, setLastByPeer] = useState<Record<string, PeerPreview>>({})
	const [chatProfiles, setChatProfiles] = useState<AdminProfile[]>([])
	const [searchResults, setSearchResults] = useState<AdminProfile[]>([])
	const [loadingContacts, setLoadingContacts] = useState(false)
	const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const isStaffAdmin = canUseAdminContactSearch(currentUser)

	useEffect(() => {
		if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
		searchDebounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
		return () => {
			if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
		}
	}, [search])

	useEffect(() => {
		if (!isStaffAdmin || !currentUser?.id) return
		let cancelled = false
		void (async () => {
			const map = await loadChatInboxPreviews(supabase, currentUser.id)
			if (!cancelled) setLastByPeer(map)
		})()
		return () => {
			cancelled = true
		}
	}, [currentUser?.id, isStaffAdmin, supabase])

	useEffect(() => {
		if (!isStaffAdmin) return
		const q = debouncedSearch.trim()

		if (q) {
			let cancelled = false
			setLoadingContacts(true)
			void (async () => {
				const found = await searchAdminProfiles(q)
				if (!cancelled) {
					setSearchResults(found)
					setLoadingContacts(false)
				}
			})()
			return () => {
				cancelled = true
			}
		}

		const peerIds = Object.keys(lastByPeer)
		if (peerIds.length === 0) {
			setChatProfiles([])
			setSearchResults([])
			return
		}

		let cancelled = false
		setLoadingContacts(true)
		void (async () => {
			const profiles = await fetchAdminProfilesByIds(peerIds)
			if (!cancelled) {
				setChatProfiles(profiles)
				setLoadingContacts(false)
			}
		})()
		return () => {
			cancelled = true
		}
	}, [isStaffAdmin, debouncedSearch, lastByPeer, searchAdminProfiles, fetchAdminProfilesByIds])

	const visibleProfiles = debouncedSearch.trim() ? searchResults : chatProfiles

	const filteredSorted = useMemo(
		() => sortByChatRecency(visibleProfiles, lastByPeer),
		[visibleProfiles, lastByPeer]
	)

	if (!isStaffAdmin) {
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
						{debouncedSearch.trim()
							? 'Resultados de búsqueda en todos los usuarios.'
							: 'Conversaciones recientes. Buscá por nombre, email o teléfono para encontrar más contactos.'}
					</p>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto">
					{loadingContacts || adminProfilesLoading ? (
						<p className="py-10 text-center text-sm text-slate-600 dark:text-[#8696A0]">Cargando usuarios...</p>
					) : filteredSorted.length === 0 ? (
						<p className="px-4 py-10 text-center text-sm text-slate-600 dark:text-[#8696A0]">
							{debouncedSearch.trim()
								? 'Ningún usuario coincide con la búsqueda.'
								: 'No hay conversaciones todavía. Buscá un contacto para iniciar un chat.'}
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
