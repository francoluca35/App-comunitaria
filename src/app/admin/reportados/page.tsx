'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Flag, Loader2, MessageSquareWarning } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useApp } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { toast } from 'sonner'

type ReportRow = {
	id: string
	comment_id: string
	post_id: string
	reporter_id: string
	reason: string | null
	created_at: string
}

type ProfileMini = {
	id: string
	name: string | null
	avatar_url: string | null
	email?: string | null
}

type CommentMini = {
	id: string
	text: string
	image_url: string | null
	author_id: string
}

type PostMini = {
	id: string
	title: string
}

export default function AdminReportedCommentsPage() {
	const router = useRouter()
	const { currentUser } = useApp()
	const supabase = useMemo(() => createClient(), [])
	const [loading, setLoading] = useState(true)
	const [reports, setReports] = useState<ReportRow[]>([])
	const [reportersById, setReportersById] = useState<Record<string, ProfileMini>>({})
	const [commentsById, setCommentsById] = useState<Record<string, CommentMini>>({})
	const [commentAuthorsById, setCommentAuthorsById] = useState<Record<string, ProfileMini>>({})
	const [postsById, setPostsById] = useState<Record<string, PostMini>>({})

	useEffect(() => {
		if (!currentUser?.isAdmin) return
		let cancelled = false
		const load = async () => {
			setLoading(true)
			try {
				const { data: reportData, error: reportError } = await supabase
					.from('comment_reports')
					.select('id, comment_id, post_id, reporter_id, reason, created_at')
					.order('created_at', { ascending: false })
					.limit(300)

				if (reportError) {
					throw new Error(reportError.message || 'No se pudieron cargar reportes')
				}
				const rows = (reportData ?? []) as ReportRow[]
				if (cancelled) return
				setReports(rows)

				const reporterIds = Array.from(new Set(rows.map((r) => r.reporter_id)))
				const commentIds = Array.from(new Set(rows.map((r) => r.comment_id)))
				const postIds = Array.from(new Set(rows.map((r) => r.post_id)))

				const reportersPromise = reporterIds.length
					? supabase.from('profiles').select('id, name, avatar_url, email').in('id', reporterIds)
					: Promise.resolve({ data: [], error: null })

				const commentsPromise = commentIds.length
					? supabase.from('comments').select('id, text, image_url, author_id').in('id', commentIds)
					: Promise.resolve({ data: [], error: null })

				const postsPromise = postIds.length
					? supabase.from('posts').select('id, title').in('id', postIds)
					: Promise.resolve({ data: [], error: null })

				const [reportersRes, commentsRes, postsRes] = await Promise.all([
					reportersPromise,
					commentsPromise,
					postsPromise,
				])

				if (reportersRes.error) throw new Error(reportersRes.error.message || 'Error al cargar reportantes')
				if (commentsRes.error) throw new Error(commentsRes.error.message || 'Error al cargar comentarios')
				if (postsRes.error) throw new Error(postsRes.error.message || 'Error al cargar publicaciones')
				if (cancelled) return

				const reporterMap: Record<string, ProfileMini> = {}
				for (const p of (reportersRes.data ?? []) as ProfileMini[]) {
					reporterMap[p.id] = p
				}
				setReportersById(reporterMap)

				const commentMap: Record<string, CommentMini> = {}
				const commentAuthorIds = new Set<string>()
				for (const c of (commentsRes.data ?? []) as CommentMini[]) {
					commentMap[c.id] = c
					if (c.author_id) commentAuthorIds.add(c.author_id)
				}
				setCommentsById(commentMap)

				const postMap: Record<string, PostMini> = {}
				for (const p of (postsRes.data ?? []) as PostMini[]) {
					postMap[p.id] = p
				}
				setPostsById(postMap)

				if (commentAuthorIds.size > 0) {
					const { data: authorProfiles, error: authorProfilesError } = await supabase
						.from('profiles')
						.select('id, name, avatar_url')
						.in('id', Array.from(commentAuthorIds))
					if (authorProfilesError) {
						throw new Error(authorProfilesError.message || 'Error al cargar autores de comentarios')
					}
					if (cancelled) return
					const authorMap: Record<string, ProfileMini> = {}
					for (const a of (authorProfiles ?? []) as ProfileMini[]) {
						authorMap[a.id] = a
					}
					setCommentAuthorsById(authorMap)
				} else {
					setCommentAuthorsById({})
				}
			} catch (e) {
				if (!cancelled) {
					const msg = e instanceof Error ? e.message : 'No se pudieron cargar los reportes'
					toast.error(msg)
					setReports([])
				}
			} finally {
				if (!cancelled) setLoading(false)
			}
		}
		void load()
		return () => {
			cancelled = true
		}
	}, [currentUser?.isAdmin, supabase])

	if (!currentUser?.isAdmin) {
		return (
			<div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
				<Card className="max-w-sm w-full shadow-lg">
					<CardContent className="p-8 text-center">
						<p className="text-lg text-slate-700 mb-6">No tenés permisos de administrador.</p>
						<Button type="button" className="w-full" onClick={() => router.push('/')}>
							Volver al inicio
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<DashboardLayout>
			<div className="w-full max-w-3xl mx-auto">
				<div className="flex items-center gap-3 mb-4">
					<Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
						<ArrowLeft className="w-5 h-5" />
					</Button>
					<h1 className="text-xl font-semibold text-slate-900 dark:text-white">Comentarios reportados</h1>
				</div>

				{loading ? (
					<Card>
						<CardContent className="p-8 flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300">
							<Loader2 className="w-4 h-4 animate-spin" />
							Cargando reportes...
						</CardContent>
					</Card>
				) : reports.length === 0 ? (
					<Card>
						<CardContent className="p-10 text-center">
							<MessageSquareWarning className="w-10 h-10 mx-auto text-slate-400 mb-3" />
							<p className="text-slate-600 dark:text-slate-300">No hay comentarios reportados.</p>
						</CardContent>
					</Card>
				) : (
					<div className="space-y-3">
						{reports.map((report) => {
							const comment = commentsById[report.comment_id]
							const post = postsById[report.post_id]
							const reporter = reportersById[report.reporter_id]
							const commentAuthor = comment ? commentAuthorsById[comment.author_id] : undefined
							return (
								<Card key={report.id}>
									<CardContent className="p-4 space-y-3">
										<div className="flex items-start justify-between gap-3">
											<div className="flex items-center gap-2 min-w-0">
												<span className="inline-flex items-center justify-center rounded-full bg-[#8B0015]/10 text-[#8B0015] h-8 w-8 shrink-0">
													<Flag className="w-4 h-4" />
												</span>
												<div className="min-w-0">
													<p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
														{post?.title || 'Publicación'}
													</p>
													<p className="text-xs text-slate-500 dark:text-slate-400">
														Reportado {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: es })}
													</p>
												</div>
											</div>
											<Link href={`/post/${report.post_id}`} className="text-xs font-semibold text-[#8B0015] hover:underline shrink-0">
												Ver publicación
											</Link>
										</div>

										<div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
											<p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Comentario reportado</p>
											<p className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words">
												{comment?.text?.trim() || '(Comentario sin texto)'}
											</p>
											{comment?.image_url ? (
												<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Incluye imagen adjunta</p>
											) : null}
										</div>

										<div className="grid gap-2 sm:grid-cols-2">
											<div className="flex items-center gap-2 min-w-0">
												<Avatar className="w-8 h-8">
													<AvatarImage src={commentAuthor?.avatar_url ?? undefined} />
													<AvatarFallback>{commentAuthor?.name?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
												</Avatar>
												<div className="min-w-0">
													<p className="text-xs text-slate-500 dark:text-slate-400">Autor del comentario</p>
													<p className="text-sm text-slate-900 dark:text-slate-100 truncate">
														{commentAuthor?.name?.trim() || 'Usuario'}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-2 min-w-0">
												<Avatar className="w-8 h-8">
													<AvatarImage src={reporter?.avatar_url ?? undefined} />
													<AvatarFallback>{reporter?.name?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
												</Avatar>
												<div className="min-w-0">
													<p className="text-xs text-slate-500 dark:text-slate-400">Reportado por</p>
													<p className="text-sm text-slate-900 dark:text-slate-100 truncate">
														{reporter?.name?.trim() || reporter?.email || 'Usuario'}
													</p>
												</div>
											</div>
										</div>

										{report.reason?.trim() ? (
											<div className="rounded-lg border border-[#8B0015]/20 bg-[#8B0015]/5 p-2.5">
												<p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Motivo</p>
												<p className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words">
													{report.reason.trim()}
												</p>
											</div>
										) : null}
									</CardContent>
								</Card>
							)
						})}
					</div>
				)}
			</div>
		</DashboardLayout>
	)
}
