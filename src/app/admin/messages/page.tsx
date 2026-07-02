'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useApp, type AdminProfile } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
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
import { ArrowLeft, ExternalLink, Search, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/app/components/ui/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
	loadChatInboxPreviews,
	sortByChatRecency,
	formatChatListTime,
	type PeerPreview,
} from '@/lib/chat-inbox-previews'
import { canUseAdminContactSearch } from '@/lib/admin-contact-search'
import { ADMIN_USERS_PAGE_SIZE, fetchAdminUsersList } from '@/lib/admin-users-api'

async function fetchAllActiveProfiles(accessToken: string, excludeUserId?: string): Promise<AdminProfile[]> {
	const all: AdminProfile[] = []
	let page = 1
	for (;;) {
		const result = await fetchAdminUsersList(accessToken, {
			page,
			pageSize: ADMIN_USERS_PAGE_SIZE,
			status: 'active',
		})
		if ('error' in result) break
		all.push(...result.users.filter((p) => p.id !== excludeUserId))
		if (page >= result.totalPages) break
		page++
	}
	return all
}

export default function AdminMessagesPage() {
	const router = useRouter()
	const { currentUser, adminProfilesLoading, searchAdminProfiles } = useApp()
	const supabase = useMemo(() => createClient(), [])
	const [search, setSearch] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState('')
	const [lastByPeer, setLastByPeer] = useState<Record<string, PeerPreview>>({})
	const [allProfiles, setAllProfiles] = useState<AdminProfile[]>([])
	const [searchResults, setSearchResults] = useState<AdminProfile[]>([])
	const [loadingContacts, setLoadingContacts] = useState(false)
	const [showClearAllDialog, setShowClearAllDialog] = useState(false)
	const [clearingAll, setClearingAll] = useState(false)
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
		if (!isStaffAdmin || !currentUser?.id) return
		let cancelled = false
		setLoadingContacts(true)
		void (async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession()
			if (!session?.access_token || cancelled) {
				if (!cancelled) setLoadingContacts(false)
				return
			}
			const profiles = await fetchAllActiveProfiles(session.access_token, currentUser.id)
			if (!cancelled) {
				setAllProfiles(profiles)
				setLoadingContacts(false)
			}
		})()
		return () => {
			cancelled = true
		}
	}, [isStaffAdmin, currentUser?.id, supabase])

	useEffect(() => {
		if (!isStaffAdmin) return
		const q = debouncedSearch.trim()
		if (!q) {
			setSearchResults([])
			return
		}
		let cancelled = false
		setLoadingContacts(true)
		void (async () => {
			const found = await searchAdminProfiles(q)
			if (!cancelled) {
				setSearchResults(found.filter((p) => p.id !== currentUser?.id))
				setLoadingContacts(false)
			}
		})()
		return () => {
			cancelled = true
		}
	}, [isStaffAdmin, debouncedSearch, searchAdminProfiles, currentUser?.id])

	const visibleProfiles = debouncedSearch.trim() ? searchResults : allProfiles

	const filteredSorted = useMemo(
		() => sortByChatRecency(visibleProfiles, lastByPeer),
		[visibleProfiles, lastByPeer]
	)

	const clearAllChats = async () => {
		const {
			data: { session },
		} = await supabase.auth.getSession()
		if (!session?.access_token) {
			toast.error('Sesión expirada')
			return
		}
		setClearingAll(true)
		const res = await fetch('/api/chat/clear-all', {
			method: 'POST',
			headers: { Authorization: `Bearer ${session.access_token}` },
		})
		setClearingAll(false)
		setShowClearAllDialog(false)
		if (!res.ok) {
			const err = (await res.json().catch(() => ({}))) as { error?: string }
			toast.error(err.error ?? 'No se pudieron eliminar los mensajes')
			return
		}
		const body = (await res.json().catch(() => ({}))) as { deletedCount?: number }
		setLastByPeer({})
		toast.success(
			body.deletedCount != null && body.deletedCount > 0
				? `Se eliminaron ${body.deletedCount.toLocaleString('es-AR')} mensajes de todos los chats.`
				: 'No había mensajes para eliminar.'
		)
	}

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
					<Button
						type="button"
						variant="destructive"
						size="sm"
						className="ml-auto shrink-0 gap-1.5 text-xs sm:text-sm"
						onClick={() => setShowClearAllDialog(true)}
						disabled={clearingAll}
					>
						<Trash2 className="h-4 w-4" />
						<span className="hidden sm:inline">Eliminar todo</span>
					</Button>
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
							: 'Todos los contactos activos. Los que tienen mensajes aparecen primero.'}
					</p>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto">
					{loadingContacts || adminProfilesLoading ? (
						<p className="py-10 text-center text-sm text-slate-600 dark:text-[#8696A0]">Cargando usuarios...</p>
					) : filteredSorted.length === 0 ? (
						<p className="px-4 py-10 text-center text-sm text-slate-600 dark:text-[#8696A0]">
							{debouncedSearch.trim()
								? 'Ningún usuario coincide con la búsqueda.'
								: 'No hay usuarios activos para chatear.'}
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

			<AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar todos los mensajes?</AlertDialogTitle>
						<AlertDialogDescription>
							Se borrarán todos los mensajes de todos los chats de la comunidad: textos, avisos automáticos,
							fotos y audios. Esto incluye los chats de todos los usuarios y no se puede deshacer.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={clearingAll}>Cancelar</AlertDialogCancel>
						<Button variant="destructive" disabled={clearingAll} onClick={() => void clearAllChats()}>
							{clearingAll ? 'Eliminando…' : 'Sí, eliminar todo'}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</DashboardLayout>
	)
}
