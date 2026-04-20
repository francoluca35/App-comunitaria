'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { Button } from '@/app/components/ui/button'
import { Textarea } from '@/app/components/ui/textarea'
import type { PublicidadDisplay } from '@/lib/publicidad-display'
import { CST } from '@/lib/cst-theme'

type PublicidadComment = {
	id: string
	publicidadId: string
	authorId: string
	authorName: string
	authorAvatar?: string
	text: string
	createdAt: Date
}

type Props = {
	publicidad: PublicidadDisplay | null
	open: boolean
	onOpenChange: (open: boolean) => void
	isLoggedIn: boolean
}

function initials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]!.toUpperCase())
		.join('')
}

export function PublicidadCommentsModal({ publicidad, open, onOpenChange, isLoggedIn }: Props) {
	const supabase = useMemo(() => createClient(), [])
	const [loading, setLoading] = useState(false)
	const [sending, setSending] = useState(false)
	const [comments, setComments] = useState<PublicidadComment[]>([])
	const [text, setText] = useState('')

	const loadComments = useCallback(async () => {
		if (!publicidad?.id) return
		setLoading(true)
		try {
			const res = await fetch(`/api/publicidad/${publicidad.id}/comments`)
			const data = (await res.json().catch(() => [])) as any
			if (!res.ok || !Array.isArray(data)) {
				setComments([])
				return
			}
			const mapped: PublicidadComment[] = data.map((row) => ({
				id: String(row.id ?? ''),
				publicidadId: String(row.publicidadId ?? publicidad.id),
				authorId: String(row.authorId ?? ''),
				authorName: String(row.authorName ?? 'Usuario'),
				authorAvatar: typeof row.authorAvatar === 'string' ? row.authorAvatar : undefined,
				text: String(row.text ?? ''),
				createdAt: new Date(row.createdAt),
			}))
			setComments(mapped)
		} finally {
			setLoading(false)
		}
	}, [publicidad?.id])

	useEffect(() => {
		if (!open || !publicidad?.id) return
		setText('')
		void loadComments()
	}, [open, publicidad?.id, loadComments])

	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault()
			if (!publicidad?.id) return
			if (!isLoggedIn) {
				toast.error('Debés iniciar sesión para comentar')
				return
			}
			const trimmed = text.trim()
			if (!trimmed) {
				toast.error('Escribí un comentario')
				return
			}
			setSending(true)
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession()
				if (!session?.access_token) {
					toast.error('Sesión expirada. Volvé a iniciar sesión.')
					return
				}
				const res = await fetch(`/api/publicidad/${publicidad.id}/comments`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${session.access_token}`,
					},
					body: JSON.stringify({ text: trimmed }),
				})
				const data = await res.json().catch(() => ({}))
				if (!res.ok) {
					toast.error(typeof (data as any).error === 'string' ? (data as any).error : 'No se pudo publicar el comentario')
					return
				}
				const next: PublicidadComment = {
					id: String((data as any).id ?? ''),
					publicidadId: String((data as any).publicidadId ?? publicidad.id),
					authorId: String((data as any).authorId ?? ''),
					authorName: String((data as any).authorName ?? 'Usuario'),
					authorAvatar: typeof (data as any).authorAvatar === 'string' ? (data as any).authorAvatar : undefined,
					text: String((data as any).text ?? trimmed),
					createdAt: new Date((data as any).createdAt ?? Date.now()),
				}
				setComments((prev) => [...prev, next])
				setText('')
				toast.success('Comentario agregado')
			} finally {
				setSending(false)
			}
		},
		[publicidad?.id, isLoggedIn, text, supabase]
	)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="fixed inset-x-0 bottom-0 top-auto w-screen max-w-none max-h-[90dvh] translate-x-0 translate-y-0 overflow-hidden rounded-t-2xl border-[#D8D2CC] p-0 sm:inset-x-auto sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:w-full sm:max-h-[85vh] sm:max-w-2xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:overflow-hidden sm:rounded-lg">
				<div className="bg-[#F0F2F5] sm:flex sm:max-h-[85vh] sm:flex-col sm:bg-white">
					<DialogTitle className="sr-only">Comentarios de publicidad</DialogTitle>
					<div className="border-b border-[#CED0D4] px-4 pb-2 pt-2.5">
						<div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-[#B0B3B8] sm:hidden" aria-hidden />
						<p className="text-center text-[15px] font-semibold text-[#1C1E21]">
							Comentarios ({comments.length})
						</p>
						{publicidad ? (
							<p className="mt-1 text-center text-xs text-[#65676B] line-clamp-1">
								{publicidad.title}
							</p>
						) : null}
					</div>

					<div className="max-h-[calc(90dvh-9.5rem)] overflow-y-auto px-3 pb-24 pt-3 sm:max-h-[60vh] sm:flex-1 sm:px-4 sm:pb-4">
						{loading ? (
							<p className="py-6 text-center text-xs text-[#65676B]">Cargando comentarios…</p>
						) : comments.length === 0 ? (
							<p className="py-6 text-center text-xs text-[#65676B]">No hay comentarios aún. ¡Sé el primero!</p>
						) : (
							<div className="space-y-3">
								{comments.map((comment) => (
									<div key={comment.id} className="flex items-start gap-2.5">
										<Avatar className="h-8 w-8 shrink-0">
											<AvatarImage src={comment.authorAvatar} alt={comment.authorName} />
											<AvatarFallback
												className="text-[11px] font-semibold text-white"
												style={{ backgroundColor: CST.acento }}
											>
												{initials(comment.authorName || 'U')}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0 flex-1">
											<div className="rounded-2xl bg-[#E4E6EB] px-3 py-2">
												<p className="truncate text-[13px] font-semibold leading-tight text-[#1C1E21]">
													{comment.authorName}
												</p>
												<p className="mt-0.5 break-words text-[15px] leading-snug text-[#1C1E21]">
													{comment.text}
												</p>
											</div>
											<p className="mt-1 pl-2 text-[12px] text-[#65676B]">
												{formatDistanceToNow(comment.createdAt, { addSuffix: true, locale: es })}
											</p>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{isLoggedIn ? (
						<form onSubmit={(e) => void handleSubmit(e)} className="fixed inset-x-0 bottom-0 z-10 border-t border-[#CED0D4] bg-[#F0F2F5] px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 sm:static sm:z-auto sm:border-t sm:bg-white sm:px-4 sm:pb-3">
							<div className="relative">
								<Textarea
									placeholder="Escribí un comentario…"
									value={text}
									onChange={(e) => setText(e.target.value)}
									rows={1}
									className="max-h-24 min-h-[2.5rem] resize-none rounded-full border-transparent bg-[#E4E6EB] pb-2 pl-4 pr-10 pt-2 text-[14px] leading-tight text-[#1C1E21] placeholder:text-[#65676B]"
								/>
								<Button
									type="submit"
									variant="ghost"
									size="icon"
									disabled={sending}
									className="absolute right-1 top-1 h-8 w-8 rounded-full text-[#1b74e4] hover:bg-[#DCEBFF] hover:text-[#1b74e4]"
									aria-label="Enviar comentario"
								>
									<Send className="h-4 w-4" />
								</Button>
							</div>
						</form>
					) : (
						<div className="fixed inset-x-0 bottom-0 z-10 border-t border-[#CED0D4] bg-[#F0F2F5] px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 sm:static sm:z-auto sm:bg-white sm:px-4 sm:pb-3">
							<p className="text-center text-xs text-[#65676B]">
								Iniciá sesión para comentar.{' '}
								<Link href="/login" className="font-semibold text-[#1b74e4]">
									Iniciar sesión
								</Link>
							</p>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
