'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { useApp, type Post } from '@/app/providers'
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { Textarea } from '@/app/components/ui/textarea'
import { Card, CardContent } from '@/app/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { PostAuthorNameCategoryRow } from '@/components/PostAuthorNameCategoryRow'
import { PostPublicationActions } from '@/components/PostPublicationActions'
import { PostImageWithLightbox } from '@/components/PostImageWithLightbox'
import { CST } from '@/lib/cst-theme'

function authorInitials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((p) => p[0]!.toUpperCase())
		.join('')
}

export type PostCommentsModalProps = {
	post: Post | null
	onClose: () => void
}

export function PostCommentsModal({ post, onClose }: PostCommentsModalProps) {
	const { currentUser, config, comments, addComment, loadCommentsForPost, commentCountByPostId } = useApp()
	const [commentText, setCommentText] = useState('')
	const [commentsLoading, setCommentsLoading] = useState(false)

	const postComments = useMemo(() => {
		if (!post) return []
		return comments.filter((c) => c.postId === post.id)
	}, [comments, post])

	useEffect(() => {
		if (!post) return
		setCommentText('')
		setCommentsLoading(true)
		void loadCommentsForPost(post.id).finally(() => setCommentsLoading(false))
	}, [post, loadCommentsForPost])

	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault()
			if (!post) return
			if (!currentUser) {
				toast.error('Debés iniciar sesión para comentar')
				return
			}
			if (!commentText.trim()) {
				toast.error('Escribí un comentario')
				return
			}
			const result = await addComment(post.id, commentText)
			if (!result.ok) {
				toast.error(result.error ?? 'No se pudo publicar')
				return
			}
			setCommentText('')
			toast.success('Comentario agregado')
		},
		[post, currentUser, commentText, addComment]
	)

	return (
		<Dialog open={!!post} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-h-[90vh] overflow-y-auto border-[#D8D2CC] p-0 sm:max-w-2xl">
				{post ? (
					<div className="bg-white">
						<DialogTitle className="sr-only">Publicación de {post.authorName}</DialogTitle>
						<div className="flex items-start gap-3 px-4 pb-2 pt-4">
							<Avatar className="h-11 w-11 shrink-0 border-2 border-[#D8D2CC]">
								<AvatarImage src={post.authorAvatar} alt={post.authorName} />
								<AvatarFallback
									className="text-xs font-bold text-white"
									style={{ backgroundColor: CST.acento }}
								>
									{authorInitials(post.authorName)}
								</AvatarFallback>
							</Avatar>
							<div className="min-w-0 flex-1">
								<PostAuthorNameCategoryRow
									authorName={post.authorName}
									category={post.category}
									nameClassName="font-semibold"
								/>
								<p className="mt-0.5 text-xs leading-tight text-[#7A5C52]">
									{formatDistanceToNow(post.createdAt, { addSuffix: true, locale: es })}
								</p>
							</div>
						</div>
						<div className="px-4 pb-3 pt-0">
							<h3 className="font-montserrat-only font-bold leading-snug text-[#2B2B2B]">{post.title}</h3>
							{post.description ? (
								<p className="mt-0.5 whitespace-pre-wrap text-sm text-[#2B2B2B]">{post.description}</p>
							) : null}
						</div>
						{post.media.length > 0 ? (
							<PostImageWithLightbox media={post.media} alt={post.title} variant="detail" priority />
						) : null}
						<div className="bg-white px-0 py-0">
							<PostPublicationActions
								postId={post.id}
								whatsappNumber={config.whatsappEnabled ? post.whatsappNumber : undefined}
								showComments={config.commentsEnabled}
								onCommentsClick={() => {
									const el = document.getElementById('post-modal-comments')
									el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
								}}
								commentCount={
									config.commentsEnabled
										? commentsLoading
											? commentCountByPostId[post.id]
											: postComments.length
										: undefined
								}
							/>
						</div>
						{config.commentsEnabled ? (
							<div className="border-t border-[#D8D2CC] bg-[#F8F6F3] p-4" id="post-modal-comments">
								<Card className="rounded-xl border-slate-200/80 shadow-sm">
									<CardContent className="p-3 sm:p-4">
										<h3 className="mb-2 text-sm font-semibold text-card-foreground">
											{commentsLoading ? 'Comentarios' : `Comentarios (${postComments.length})`}
										</h3>
										<div className="mb-3 space-y-2">
											{commentsLoading ? (
												<p className="rounded-lg bg-slate-50 py-4 text-center text-xs text-slate-500">
													Cargando comentarios…
												</p>
											) : postComments.length === 0 ? (
												<p className="rounded-lg bg-slate-50 py-4 text-center text-xs text-slate-500">
													No hay comentarios aún. ¡Sé el primero!
												</p>
											) : (
												postComments.map((comment) => (
													<div key={comment.id} className="flex gap-2">
														<Avatar className="h-8 w-8 shrink-0 rounded-lg">
															<AvatarImage src={comment.authorAvatar} />
															<AvatarFallback className="rounded-lg text-xs">
																{comment.authorName[0]}
															</AvatarFallback>
														</Avatar>
														<div className="min-w-0 flex-1 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
															<div className="mb-0.5 flex flex-wrap items-center gap-1.5">
																<span className="text-xs font-medium text-slate-900">
																	{comment.authorName}
																</span>
																<span className="text-[11px] text-slate-500">
																	{formatDistanceToNow(comment.createdAt, {
																		addSuffix: true,
																		locale: es,
																	})}
																</span>
															</div>
															<p className="text-xs leading-snug text-slate-600">{comment.text}</p>
														</div>
													</div>
												))
											)}
										</div>
										{currentUser ? (
											<form onSubmit={(e) => void handleSubmit(e)}>
												<div className="flex gap-2">
													<Avatar className="h-8 w-8 shrink-0 rounded-lg">
														<AvatarImage src={currentUser.avatar} />
														<AvatarFallback className="rounded-lg text-xs">
															{currentUser.name[0]}
														</AvatarFallback>
													</Avatar>
													<div className="flex-1 space-y-1.5">
														<Textarea
															placeholder="Escribí un comentario…"
															value={commentText}
															onChange={(e) => setCommentText(e.target.value)}
															rows={2}
															className="min-h-0 resize-none rounded-lg border-slate-200 py-2 text-sm"
														/>
														<Button type="submit" size="sm" className="h-8 rounded-lg text-xs">
															<Send className="mr-1.5 h-3.5 w-3.5" />
															Enviar
														</Button>
													</div>
												</div>
											</form>
										) : (
											<Card className="rounded-lg border-slate-200 bg-slate-50">
												<CardContent className="p-3 text-center">
													<p className="mb-2 text-xs text-slate-600">Iniciá sesión para dejar un comentario</p>
													<Button asChild size="sm" className="h-8 rounded-lg text-xs">
														<Link href="/login">Iniciar sesión</Link>
													</Button>
												</CardContent>
											</Card>
										)}
									</CardContent>
								</Card>
							</div>
						) : null}
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	)
}
