'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ArrowLeft, ExternalLink, MessageSquare, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

	const filtered = useMemo(() => profiles.filter((p) => matchRow(p, search)), [profiles, search])

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
			<DashboardLayout fillViewport>
				<div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 items-center justify-center py-20">
					<p className="text-slate-500 dark:text-slate-400">Redirigiendo…</p>
				</div>
			</DashboardLayout>
		)
	}

	return (
		<DashboardLayout fillViewport>
			<div className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-4">
				<div className="mb-4 flex items-center gap-3">
					<Button variant="ghost" size="icon" onClick={() => router.push('/')}>
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<h1 className="text-xl font-semibold text-slate-900 dark:text-white">Chatear con el equipo</h1>
				</div>

				<p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
					Elegí un administrador o moderador para abrir el chat. Para hablar solo con el referente Mario Stebler, usá «Hablar
					con Mario» abajo o el botón del inicio.
				</p>

				<Card className="mb-4 overflow-hidden border-[#8B0015]/20 bg-[#8B0015]/5 dark:bg-[#8B0015]/10">
					<CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
						<div>
							<p className="text-sm font-medium text-slate-900 dark:text-white">Mario Stebler (referente)</p>
							<p className="text-xs text-slate-500 dark:text-slate-400">Conversación dedicada con Mario</p>
						</div>
						<Button asChild size="sm" variant="outline" className="shrink-0 border-[#8B0015]/40 text-[#8B0015] dark:text-[#F3C9D0]">
							<Link href="/message/mario">Hablar con Mario</Link>
						</Button>
					</CardContent>
				</Card>

				<div className="relative mb-4">
					<Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
					<Input
						type="text"
						placeholder="Buscar por nombre, email o teléfono…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-10"
						aria-label="Buscar administrador"
					/>
				</div>

				<div className="space-y-2">
					{loadError && (
						<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
							<p>{loadError}</p>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="mt-2"
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
					)}
					{loading ? (
						<p className="py-8 text-center text-slate-500 dark:text-slate-400">Cargando equipo…</p>
					) : filtered.length === 0 && !loadError ? (
						<p className="py-8 text-center text-slate-500 dark:text-slate-400">
							{profiles.length === 0 ? 'No hay administradores disponibles.' : 'Ningún resultado coincide.'}
						</p>
					) : (
						filtered.map((profile) => {
							const waDigits = profile.phone?.replace(/\D/g, '') ?? ''
							return (
								<Card key={profile.id} className="overflow-hidden">
									<CardContent className="p-4">
										<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
											<div className="flex min-w-0 flex-1 items-center gap-3">
												<Avatar className="h-12 w-12 shrink-0">
													<AvatarImage src={profile.avatar_url ?? undefined} />
													<AvatarFallback className="text-sm">
														{(profile.name ?? profile.email)?.[0]?.toUpperCase() ?? '?'}
													</AvatarFallback>
												</Avatar>
												<div className="min-w-0 flex-1">
													<p className="truncate font-medium text-slate-900 dark:text-white">
														{profile.name?.trim() || profile.email}
													</p>
													<p className="truncate text-sm text-slate-500 dark:text-slate-400">{profile.email}</p>
													{profile.phone ? (
														<p className="truncate text-xs text-slate-500 dark:text-slate-400">Tel: {profile.phone}</p>
													) : null}
												</div>
											</div>
											<div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
												<Button
													size="sm"
													variant="outline"
													asChild
													className="border-[#8B0015]/30 text-[#8B0015] hover:bg-[#8B0015]/10 dark:border-[#8B0015]/60 dark:text-[#F3C9D0] dark:hover:bg-[#8B0015]/20"
												>
													<Link href={`/message/${profile.id}`}>
														<MessageSquare className="mr-2 h-4 w-4" />
														Chatear
													</Link>
												</Button>
												{waDigits ? (
													<Button
														size="sm"
														variant="outline"
														asChild
														className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20"
													>
														<a href={`https://wa.me/${waDigits}`} target="_blank" rel="noopener noreferrer">
															<ExternalLink className="mr-2 h-4 w-4" />
															WhatsApp
														</a>
													</Button>
												) : (
													<Button
														type="button"
														size="sm"
														variant="outline"
														disabled
														className="border-green-200 text-green-700 opacity-60 dark:border-green-800 dark:text-green-400"
														title="Sin teléfono cargado para WhatsApp"
													>
														<ExternalLink className="mr-2 h-4 w-4" />
														WhatsApp
													</Button>
												)}
											</div>
										</div>
									</CardContent>
								</Card>
							)
						})
					)}
				</div>
			</div>
		</DashboardLayout>
	)
}
