'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useApp, type AdminProfile } from '@/app/providers'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { cn } from '@/app/components/ui/utils'
import { adminContactChatPath, canUseAdminContactSearch } from '@/lib/admin-contact-search'

const INPUT_CLASS =
	'w-full rounded-2xl border border-[#D8D2CC] bg-white py-2.5 pl-11 pr-4 text-sm text-[#2B2B2B] placeholder:text-[#7A5C52]/70 shadow-sm outline-none focus:border-[#8B0015] focus:ring-2 focus:ring-[#8B0015]/20 dark:border-[#3a3b3c] dark:bg-[#3a3b3c] dark:text-[#e4e6eb] dark:placeholder:text-[#b0b3b8] dark:focus:border-[#8B0015] dark:focus:ring-[#8B0015]/30'

const INPUT_CLASS_MOBILE =
	'h-10 w-full rounded-xl border border-white/25 bg-white/95 py-0 pl-10 pr-3 text-sm text-[#2B2B2B] shadow-sm outline-none ring-1 ring-black/5 placeholder:text-[#7A5C52]/75 focus:border-white focus:ring-2 focus:ring-white/40 dark:border-[#3a3b3c] dark:bg-[#3a3b3c] dark:text-[#e4e6eb] dark:ring-0 dark:placeholder:text-[#b0b3b8] dark:focus:border-[#8B0015] dark:focus:ring-[#8B0015]/30'

type Props = {
	variant?: 'desktop' | 'mobile'
	className?: string
}

export function AdminHeaderContactSearch({ variant = 'desktop', className }: Props) {
	const router = useRouter()
	const { currentUser, searchAdminProfiles } = useApp()
	const [query, setQuery] = useState('')
	const [open, setOpen] = useState(false)
	const [results, setResults] = useState<AdminProfile[]>([])
	const [searching, setSearching] = useState(false)
	const rootRef = useRef<HTMLDivElement>(null)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const enabled = canUseAdminContactSearch(currentUser)

	useEffect(() => {
		if (!open) return
		const onPointerDown = (e: MouseEvent) => {
			if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
		}
		document.addEventListener('pointerdown', onPointerDown)
		return () => document.removeEventListener('pointerdown', onPointerDown)
	}, [open])

	useEffect(() => {
		const q = query.trim()
		if (!enabled || !q) {
			setResults([])
			setSearching(false)
			return
		}

		if (debounceRef.current) clearTimeout(debounceRef.current)
		setSearching(true)
		debounceRef.current = setTimeout(() => {
			void (async () => {
				const found = await searchAdminProfiles(q)
				setResults(found.filter((p) => p.id !== currentUser?.id))
				setSearching(false)
			})()
		}, 300)

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [query, enabled, searchAdminProfiles, currentUser?.id])

	const goToChat = useCallback(
		(userId: string) => {
			setQuery('')
			setOpen(false)
			setResults([])
			router.push(adminContactChatPath(userId))
		},
		[router]
	)

	if (!enabled) return null

	const inputClass = variant === 'mobile' ? INPUT_CLASS_MOBILE : INPUT_CLASS

	return (
		<div ref={rootRef} className={cn('relative w-full', className)}>
			<label className="relative block w-full">
				<Search
					className={cn(
						'pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A5C52] dark:text-[#b0b3b8]',
						variant === 'mobile' ? 'left-3.5' : 'left-4'
					)}
				/>
				<input
					type="search"
					value={query}
					onChange={(e) => {
						setQuery(e.target.value)
						setOpen(true)
					}}
					onFocus={() => setOpen(true)}
					placeholder="Buscar contacto por nombre…"
					className={inputClass}
					autoComplete="off"
					aria-label="Buscar contacto"
					aria-expanded={open && query.trim().length > 0}
					aria-controls="admin-contact-search-results"
				/>
			</label>

			{open && query.trim().length > 0 ? (
				<ul
					id="admin-contact-search-results"
					role="listbox"
					className={cn(
						'absolute z-[80] max-h-[min(18rem,50dvh)] w-full overflow-y-auto rounded-xl border border-[#D8D2CC] bg-white py-1 shadow-lg dark:border-[#3a3b3c] dark:bg-[#242526]',
						variant === 'mobile' ? 'top-full mt-1' : 'top-full mt-1.5'
					)}
				>
					{searching ? (
						<li className="px-4 py-3 text-sm text-[#7A5C52] dark:text-[#b0b3b8]">Buscando contactos…</li>
					) : results.length === 0 ? (
						<li className="px-4 py-3 text-sm text-[#7A5C52] dark:text-[#b0b3b8]">Sin resultados</li>
					) : (
						results.slice(0, 12).map((p) => {
							const label = (p.name ?? p.email ?? 'Usuario').trim() || 'Usuario'
							return (
								<li key={p.id} role="option">
									<button
										type="button"
										className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#F4EFEA] dark:hover:bg-[#3a3b3c]"
										onClick={() => goToChat(p.id)}
									>
										<Avatar className="h-9 w-9 shrink-0">
											<AvatarImage src={p.avatar_url ?? undefined} alt="" />
											<AvatarFallback className="text-xs font-semibold">
												{label[0]?.toUpperCase() ?? '?'}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium text-[#2B2B2B] dark:text-[#e4e6eb]">{label}</p>
											<p className="truncate text-xs text-[#7A5C52] dark:text-[#b0b3b8]">{p.email}</p>
										</div>
									</button>
								</li>
							)
						})
					)}
				</ul>
			) : null}
		</div>
	)
}
