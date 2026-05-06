'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Camera, Flag, MessageCircle, Send, Share2, Smile, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useApp, type Post } from '@/app/providers'
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { Textarea } from '@/app/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { PostAuthorNameCategoryRow } from '@/components/PostAuthorNameCategoryRow'
import { PostImageWithLightbox } from '@/components/PostImageWithLightbox'
import { postPermalink } from '@/lib/app-public-url'
import { CST } from '@/lib/cst-theme'

function authorInitials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((p) => p[0]!.toUpperCase())
		.join('')
}

const QUICK_EMOJIS = ['😀', '😂', '😍', '🥹', '👏', '🔥', '🙏', '❤️', '👍', '🎉']

export type PostCommentsModalProps = {
	post: Post | null
	onClose: () => void
}

export function PostCommentsModal({ post, onClose }: PostCommentsModalProps) {
	const {
		currentUser,
		config,
		comments,
		addComment,
		deleteComment,
		reportComment,
		loadCommentsForPost,
		commentCountByPostId,
		toggleCommentLike,
	} = useApp()
	const [commentText, setCommentText] = useState('')
	const [commentsLoading, setCommentsLoading] = useState(false)
	const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null)
	const [commentImageFile, setCommentImageFile] = useState<File | null>(null)
	const [commentImagePreviewUrl, setCommentImagePreviewUrl] = useState<string | null>(null)
	const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
	const commentImageInputRef = useRef<HTMLInputElement>(null)

	const postComments = useMemo(() => {
		if (!post) return []
		return comments.filter((c) => c.postId === post.id)
	}, [comments, post])
	const canSubmitComment = Boolean(commentText.trim() || commentImageFile)

	useEffect(() => {
		if (!post) return
		setCommentText('')
		setReplyingToCommentId(null)
		setCommentImageFile(null)
		setCommentImagePreviewUrl(null)
		setCommentsLoading(true)
		void loadCommentsForPost(post.id).finally(() => setCommentsLoading(false))
	}, [post, loadCommentsForPost])

	useEffect(() => {
		return () => {
			if (commentImagePreviewUrl) {
				URL.revokeObjectURL(commentImagePreviewUrl)
			}
		}
	}, [commentImagePreviewUrl])

	const handleReplyClick = useCallback((commentId: string, authorName: string) => {
		const mention = `@${authorName} `
		setReplyingToCommentId(commentId)
		setCommentText((prev) => {
			if (prev.trimStart().startsWith(`@${authorName}`)) return prev
			return `${mention}${prev}`.trimEnd() + ' '
		})
	}, [])

	const handleCommentImagePicked = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		e.target.value = ''
		if (!file) return
		if (!file.type.startsWith('image/')) {
			toast.error('Solo se permiten imágenes en comentarios')
			return
		}
		if (commentImagePreviewUrl) URL.revokeObjectURL(commentImagePreviewUrl)
		const preview = URL.createObjectURL(file)
		setCommentImageFile(file)
		setCommentImagePreviewUrl(preview)
	}, [commentImagePreviewUrl])

	const clearCommentImage = useCallback(() => {
		if (commentImagePreviewUrl) URL.revokeObjectURL(commentImagePreviewUrl)
		setCommentImageFile(null)
		setCommentImagePreviewUrl(null)
	}, [commentImagePreviewUrl])

	const appendEmoji = useCallback((emoji: string) => {
		setCommentText((prev) => `${prev}${emoji}`)
		setEmojiPickerOpen(false)
	}, [])

	const handleToggleLike = useCallback(async (commentId: string) => {
		const result = await toggleCommentLike(commentId)
		if (!result.ok) {
			toast.error(result.error ?? 'No se pudo actualizar el me gusta')
		}
	}, [toggleCommentLike])

	const canDeleteComment = useCallback((commentAuthorId: string) => {
		if (!currentUser || !post) return false
		return currentUser.isAdmin || commentAuthorId === currentUser.id || post.authorId === currentUser.id
	}, [currentUser, post])

	const handleDeleteComment = useCallback(async (commentId: string) => {
		if (!window.confirm('¿Eliminar este comentario?')) return
		const result = await deleteComment(commentId)
		if (!result.ok) {
			toast.error(result.error ?? 'No se pudo eliminar el comentario')
			return
		}
		toast.success('Comentario eliminado')
	}, [deleteComment])

	const handleReportComment = useCallback(async (commentId: string) => {
		const reason = window.prompt('Motivo del reporte (opcional):') ?? ''
		const result = await reportComment(commentId, reason)
		if (!result.ok) {
			toast.error(result.error ?? 'No se pudo reportar el comentario')
			return
		}
		toast.success('Reporte enviado al administrador')
	}, [reportComment])

	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault()
			if (!post) return
			if (!currentUser) {
				toast.error('Debés iniciar sesión para comentar')
				return
			}
			if (!commentText.trim() && !commentImageFile) {
				toast.error('Escribí un comentario o agregá una imagen')
				return
			}
			const result = await addComment(post.id, commentText, commentImageFile)
			if (!result.ok) {
				toast.error(result.error ?? 'No se pudo publicar')
				return
			}
			setCommentText('')
			setReplyingToCommentId(null)
			clearCommentImage()
			toast.success('Comentario agregado')
		},
		[post, currentUser, commentText, commentImageFile, addComment, clearCommentImage]
	)

	const handleShare = useCallback(async () => {
		if (!post || typeof window === 'undefined') return
		const url = postPermalink(post.id)
		if (typeof navigator.share === 'function') {
			try {
				await navigator.share({ url })
				return
			} catch (e: unknown) {
				const name = e && typeof e === 'object' && 'name' in e ? String((e as { name: string }).name) : ''
				if (name === 'AbortError') return
			}
		}
		try {
			await navigator.clipboard.writeText(url)
			toast.success('Enlace copiado al portapapeles')
		} catch {
			toast.error('No se pudo compartir ni copiar el enlace')
		}
	}, [post])

	return (
		<Dialog open={!!post} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="fixed inset-x-0 bottom-0 top-auto w-screen max-w-none max-h-[92dvh] translate-x-0 translate-y-0 overflow-hidden rounded-t-2xl border-[#D8D2CC] p-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom-8 dark:border-white/10 sm:inset-x-auto sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:w-full sm:max-h-[90vh] sm:max-w-2xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:overflow-y-auto sm:rounded-lg sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95">
				{post ? (
					<div className="bg-[#F0F2F5] dark:bg-[#18191A] sm:bg-white dark:sm:bg-[#18191A]">
						<DialogTitle className="sr-only">Publicación de {post.authorName}</DialogTitle>
						<div className="border-b border-[#CED0D4] px-4 pb-2 pt-2.5 dark:border-white/10 sm:hidden">
							<div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-[#B0B3B8] dark:bg-white/25" aria-hidden />
							<p className="text-center text-[15px] font-semibold text-[#1C1E21] dark:text-white">
								Comentarios {commentsLoading ? '' : `(${postComments.length})`}
							</p>
						</div>
						<div className="hidden items-start gap-3 px-4 pb-2 pt-4 sm:flex">
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
								<p className="mt-0.5 text-xs leading-tight text-[#7A5C52] dark:text-[#B0B3B8]">
									{formatDistanceToNow(post.createdAt, { addSuffix: true, locale: es })}
								</p>
							</div>
						</div>
						<div className="hidden px-4 pb-3 pt-0 sm:block">
							<h3 className="font-montserrat-only font-bold leading-snug text-[#2B2B2B] dark:text-[#E4E6EB]">{post.title}</h3>
							{post.description ? (
								<p className="mt-0.5 whitespace-pre-wrap text-sm text-[#2B2B2B] dark:text-[#E4E6EB]">{post.description}</p>
							) : null}
						</div>
						{post.media.length > 0 ? (
							<div className="hidden sm:block">
							<PostImageWithLightbox media={post.media} alt={post.title} variant="detail" priority />
							</div>
						) : null}
						<div className="hidden border-t border-[#D8D2CC] bg-white px-3 py-2 dark:border-white/10 dark:bg-[#18191A] sm:block">
							<div className="flex items-center justify-start gap-1.5">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="relative h-8 w-8 rounded-full text-[#65676B] hover:bg-[#F2F3F5] hover:text-[#1b74e4] dark:text-[#B0B3B8] dark:hover:bg-white/10 dark:hover:text-[#2D88FF]"
									onClick={() => {
										const el = document.getElementById('post-modal-comments')
										el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
									}}
									aria-label="Ir a comentarios"
								>
									<MessageCircle className="h-4 w-4" />
									<span className="absolute -right-1 -top-1 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-[#1b74e4] px-1 text-[10px] font-bold leading-none text-white">
										{commentsLoading ? (commentCountByPostId[post.id] ?? postComments.length) : postComments.length}
									</span>
								</Button>
								{config.whatsappEnabled && post.whatsappNumber?.replace(/\D/g, '').length ? (
									<Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-[#F2F3F5] dark:hover:bg-white/10">
										<a
											href={`https://wa.me/${post.whatsappNumber.replace(/\D/g, '')}`}
											target="_blank"
											rel="noopener noreferrer"
											aria-label="Contactar por WhatsApp"
										>
											<svg viewBox="0 0 24 24" className="h-4 w-4 text-[#25D366]" fill="currentColor" aria-hidden>
												<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
											</svg>
										</a>
									</Button>
								) : null}
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-8 w-8 rounded-full text-[#65676B] hover:bg-[#F2F3F5] hover:text-[#1b74e4] dark:text-[#B0B3B8] dark:hover:bg-white/10 dark:hover:text-[#2D88FF]"
									onClick={() => void handleShare()}
									aria-label="Compartir publicación"
								>
									<Share2 className="h-4 w-4" />
								</Button>
							</div>
						</div>
						<input
							ref={commentImageInputRef}
							type="file"
							accept="image/*"
							className="hidden"
							onChange={handleCommentImagePicked}
						/>
						{config.commentsEnabled ? (
							<>
								<div
									className="min-h-[calc(70dvh-8.5rem)] max-h-[calc(92dvh-8.75rem)] overflow-y-auto bg-[#F0F2F5] px-3 pb-28 pt-2 dark:bg-[#18191A] sm:min-h-0 sm:max-h-none sm:overflow-visible sm:border-t sm:border-[#D8D2CC] sm:bg-[#F8F6F3] sm:p-4 dark:sm:border-white/10 dark:sm:bg-[#111418]"
									id="post-modal-comments"
								>
									<div className="hidden sm:block">
										<div className="space-y-3">
											{commentsLoading ? (
												<p className="rounded-xl bg-[#E9EBEE] py-6 text-center text-sm text-[#65676B] dark:bg-[#242526] dark:text-[#B0B3B8]">
													Cargando comentarios…
												</p>
											) : postComments.length === 0 ? (
												<p className="rounded-xl bg-[#E9EBEE] py-6 text-center text-sm text-[#65676B] dark:bg-[#242526] dark:text-[#B0B3B8]">
													No hay comentarios aún. ¡Sé el primero!
												</p>
											) : (
												postComments.map((comment) => (
													<div key={comment.id} className="flex items-start gap-2.5">
														<Avatar className="h-9 w-9 shrink-0">
															<AvatarImage src={comment.authorAvatar} />
															<AvatarFallback className="text-xs font-semibold">
																{comment.authorName[0]}
															</AvatarFallback>
														</Avatar>
														<div className="min-w-0 flex-1">
															<div className="inline-block max-w-full rounded-2xl bg-[#E4E6EB] px-3 py-2 dark:bg-[#242526]">
																<p className="truncate text-[13px] font-semibold leading-tight text-[#1C1E21] dark:text-[#E4E6EB]">
																	{comment.authorName}
																</p>
																<p className="mt-0.5 break-words text-[15px] leading-snug text-[#1C1E21] dark:text-[#E4E6EB]">
																	{comment.text}
																</p>
																{comment.imageUrl ? (
																	<div className="mt-2 overflow-hidden rounded-xl">
																		{/* eslint-disable-next-line @next/next/no-img-element */}
																		<img src={comment.imageUrl} alt="Imagen del comentario" className="max-h-60 w-auto max-w-full object-cover" />
																	</div>
																) : null}
															</div>
															<div className="mt-1 flex items-center gap-2 pl-2">
																<button
																	type="button"
																	onClick={() => void handleToggleLike(comment.id)}
																	className={`text-[12px] font-semibold transition-colors ${
																		comment.likedByMe
																			? 'text-[#1b74e4] dark:text-[#2D88FF]'
																			: 'text-[#65676B] hover:text-[#1b74e4] dark:text-[#B0B3B8] dark:hover:text-[#2D88FF]'
																	}`}
																>
																	Me gusta {comment.likeCount > 0 ? `(${comment.likeCount})` : ''}
																</button>
																<span className="text-[12px] text-[#65676B] dark:text-[#B0B3B8]">·</span>
																<button
																	type="button"
																	onClick={() => handleReplyClick(comment.id, comment.authorName)}
																	className="text-[12px] font-semibold text-[#65676B] transition-colors hover:text-[#1b74e4] dark:text-[#B0B3B8] dark:hover:text-[#2D88FF]"
																>
																	Responder
																</button>
															{currentUser ? (
																<>
																	<span className="text-[12px] text-[#65676B] dark:text-[#B0B3B8]">·</span>
																	<button
																		type="button"
																		onClick={() => void handleReportComment(comment.id)}
																		className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#65676B] transition-colors hover:text-[#8B0015] dark:text-[#B0B3B8]"
																	>
																		<Flag className="h-3 w-3" />
																		Reportar
																	</button>
																</>
															) : null}
															{canDeleteComment(comment.authorId) ? (
																<>
																	<span className="text-[12px] text-[#65676B] dark:text-[#B0B3B8]">·</span>
																	<button
																		type="button"
																		onClick={() => void handleDeleteComment(comment.id)}
																		className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#65676B] transition-colors hover:text-[#8B0015] dark:text-[#B0B3B8]"
																	>
																		<Trash2 className="h-3 w-3" />
																		Eliminar
																	</button>
																</>
															) : null}
																<span className="text-[12px] text-[#65676B] dark:text-[#B0B3B8]">
																	{formatDistanceToNow(comment.createdAt, { addSuffix: true, locale: es })}
																</span>
															</div>
														</div>
													</div>
												))
											)}
										</div>
										{currentUser ? (
											<form
												onSubmit={(e) => void handleSubmit(e)}
												className="sticky bottom-0 mt-3 border-t border-[#D8DADF] bg-[#F8F6F3] px-1 pb-1 pt-2 dark:border-white/10 dark:bg-[#111418]"
											>
												<div className="flex items-center gap-2">
													<Avatar className="h-9 w-9 shrink-0">
														<AvatarImage src={currentUser.avatar} />
														<AvatarFallback className="text-xs font-semibold">{currentUser.name[0]}</AvatarFallback>
													</Avatar>
													<div className="flex-1 rounded-2xl bg-[#E4E6EB] px-3 py-2 dark:bg-[#3A3B3C]">
														{commentImagePreviewUrl ? (
															<div className="mb-2 flex items-start gap-2 rounded-xl border border-black/10 bg-white/70 p-2 dark:border-white/10 dark:bg-black/20">
																{/* eslint-disable-next-line @next/next/no-img-element */}
																<img src={commentImagePreviewUrl} alt="Vista previa" className="h-16 w-16 rounded-lg object-cover" />
																<div className="flex-1 text-xs text-[#65676B] dark:text-[#B0B3B8]">
																	Imagen adjunta
																</div>
																<button
																	type="button"
																	onClick={clearCommentImage}
																	className="text-xs font-semibold text-[#1b74e4] dark:text-[#2D88FF]"
																>
																	Quitar
																</button>
															</div>
														) : null}
														<Textarea
															placeholder={
																replyingToCommentId
																	? 'Escribí tu respuesta…'
																	: `Comentar como ${currentUser.name}`
															}
															value={commentText}
															onChange={(e) => {
																if (replyingToCommentId) setReplyingToCommentId(null)
																setCommentText(e.target.value)
															}}
															rows={1}
															className="min-h-[1.7rem] resize-none border-0 bg-transparent px-0 py-0 text-[15px] text-[#1C1E21] placeholder:text-[#65676B] shadow-none focus-visible:ring-0 dark:text-[#E4E6EB] dark:placeholder:text-[#B0B3B8]"
														/>
														<div className="mt-1.5 flex items-center gap-2 text-[#65676B] dark:text-[#B0B3B8]">
															<button
																type="button"
																onClick={() => setEmojiPickerOpen(true)}
																className="inline-flex items-center justify-center rounded-full p-1 hover:bg-black/10 dark:hover:bg-white/10"
																aria-label="Abrir selector de emojis"
															>
																<Smile className="h-4 w-4" />
															</button>
															<button
																type="button"
																onClick={() => commentImageInputRef.current?.click()}
																className="inline-flex items-center justify-center rounded-full p-1 hover:bg-black/10 dark:hover:bg-white/10"
																aria-label="Adjuntar una foto"
															>
																<Camera className="h-4 w-4" />
															</button>
															<Button
																type="submit"
																variant="ghost"
																size="icon"
																disabled={!canSubmitComment}
																className="ml-auto h-7 w-7 rounded-full text-[#1b74e4] hover:bg-[#DCEBFF] hover:text-[#1b74e4] dark:text-[#2D88FF] dark:hover:bg-white/10"
															>
																<Send className="h-3.5 w-3.5" />
															</Button>
														</div>
														{commentImagePreviewUrl && !commentText.trim() ? (
															<p className="mt-1 text-[11px] text-[#65676B] dark:text-[#B0B3B8]">
																Se publicara solo la imagen.
															</p>
														) : null}
													</div>
												</div>
											</form>
										) : (
											<div className="mt-3 rounded-xl bg-[#E9EBEE] p-3 text-center dark:bg-[#242526]">
												<p className="mb-2 text-xs text-[#65676B] dark:text-[#B0B3B8]">Iniciá sesión para dejar un comentario</p>
												<Button asChild size="sm" className="h-8 rounded-full text-xs">
													<Link href="/login">Iniciar sesión</Link>
												</Button>
											</div>
										)}
									</div>

									<div className="space-y-3 sm:hidden">
										{commentsLoading ? (
											<p className="py-6 text-center text-xs text-[#65676B] dark:text-[#B0B3B8]">Cargando comentarios…</p>
										) : postComments.length === 0 ? (
											<p className="py-6 text-center text-xs text-[#65676B] dark:text-[#B0B3B8]">
												No hay comentarios aún. ¡Sé el primero!
											</p>
										) : (
											postComments.map((comment) => (
												<div key={comment.id} className="flex items-start gap-2.5">
													<Avatar className="h-8 w-8 shrink-0">
														<AvatarImage src={comment.authorAvatar} />
														<AvatarFallback className="text-[11px] font-semibold">
															{comment.authorName[0]}
														</AvatarFallback>
													</Avatar>
													<div className="min-w-0 flex-1">
														<div className="rounded-2xl bg-[#E4E6EB] px-3 py-2 dark:bg-[#242526]">
															<p className="truncate text-[13px] font-semibold leading-tight text-[#1C1E21] dark:text-white">
																{comment.authorName}
															</p>
															<p className="mt-0.5 break-words text-[15px] leading-snug text-[#1C1E21] dark:text-[#E4E6EB]">
																{comment.text}
															</p>
															{comment.imageUrl ? (
																<div className="mt-2 overflow-hidden rounded-xl">
																	{/* eslint-disable-next-line @next/next/no-img-element */}
																	<img src={comment.imageUrl} alt="Imagen del comentario" className="max-h-56 w-auto max-w-full object-cover" />
																</div>
															) : null}
														</div>
														<div className="mt-1 flex items-center gap-2 pl-2">
															<button
																type="button"
																onClick={() => void handleToggleLike(comment.id)}
																className={`text-[12px] font-semibold transition-colors ${
																	comment.likedByMe
																		? 'text-[#1b74e4] dark:text-[#2D88FF]'
																		: 'text-[#65676B] hover:text-[#1b74e4] dark:text-[#B0B3B8] dark:hover:text-[#2D88FF]'
																}`}
															>
																Me gusta {comment.likeCount > 0 ? `(${comment.likeCount})` : ''}
															</button>
															<span className="text-[12px] text-[#65676B] dark:text-[#B0B3B8]">·</span>
															<button
																type="button"
																onClick={() => handleReplyClick(comment.id, comment.authorName)}
																className="text-[12px] font-semibold text-[#65676B] dark:text-[#B0B3B8]"
															>
																Responder
															</button>
															{currentUser ? (
																<>
																	<span className="text-[12px] text-[#65676B] dark:text-[#B0B3B8]">·</span>
																	<button
																		type="button"
																		onClick={() => void handleReportComment(comment.id)}
																		className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#65676B] dark:text-[#B0B3B8]"
																	>
																		<Flag className="h-3 w-3" />
																		Reportar
																	</button>
																</>
															) : null}
															{canDeleteComment(comment.authorId) ? (
																<>
																	<span className="text-[12px] text-[#65676B] dark:text-[#B0B3B8]">·</span>
																	<button
																		type="button"
																		onClick={() => void handleDeleteComment(comment.id)}
																		className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#65676B] dark:text-[#B0B3B8]"
																	>
																		<Trash2 className="h-3 w-3" />
																		Eliminar
																	</button>
																</>
															) : null}
															<span className="text-[12px] text-[#65676B] dark:text-[#B0B3B8]">
																{formatDistanceToNow(comment.createdAt, { addSuffix: true, locale: es })}
															</span>
														</div>
													</div>
												</div>
											))
										)}
									</div>
								</div>

								{currentUser ? (
									<form
										onSubmit={(e) => void handleSubmit(e)}
										className="fixed inset-x-0 bottom-0 z-10 border-t border-[#CED0D4] bg-[#F0F2F5] px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 dark:border-white/10 dark:bg-[#18191A] sm:hidden"
									>
										{commentImagePreviewUrl ? (
											<div className="mb-2 flex items-center gap-2 rounded-xl border border-black/10 bg-[#E4E6EB] p-2 dark:border-white/10 dark:bg-[#242526]">
												{/* eslint-disable-next-line @next/next/no-img-element */}
												<img src={commentImagePreviewUrl} alt="Vista previa" className="h-12 w-12 rounded-lg object-cover" />
												<span className="flex-1 text-xs text-[#65676B] dark:text-[#B0B3B8]">Imagen adjunta</span>
												<button
													type="button"
													onClick={clearCommentImage}
													className="text-xs font-semibold text-[#1b74e4] dark:text-[#2D88FF]"
												>
													Quitar
												</button>
											</div>
										) : null}
										<div className="flex items-center gap-2">
											<Avatar className="h-8 w-8 shrink-0">
												<AvatarImage src={currentUser.avatar} />
												<AvatarFallback className="text-[11px] font-semibold">{currentUser.name[0]}</AvatarFallback>
											</Avatar>
											<div className="relative flex-1">
												<Textarea
													placeholder={
														replyingToCommentId
															? 'Escribí tu respuesta…'
															: `Comentar como ${currentUser.name}`
													}
													value={commentText}
													onChange={(e) => {
														if (replyingToCommentId) setReplyingToCommentId(null)
														setCommentText(e.target.value)
													}}
													rows={1}
													className="max-h-24 min-h-[2.5rem] resize-none rounded-full border-transparent bg-[#E4E6EB] pb-2 pl-16 pr-10 pt-2 text-[14px] leading-tight text-[#1C1E21] placeholder:text-[#65676B] dark:bg-[#3A3B3C] dark:text-[#E4E6EB] dark:placeholder:text-[#B0B3B8]"
												/>
												<div className="absolute bottom-1 left-2 flex items-center gap-1 text-[#65676B] dark:text-[#B0B3B8]">
													<button
														type="button"
														onClick={() => setEmojiPickerOpen(true)}
														className="inline-flex items-center justify-center rounded-full p-1 hover:bg-black/10 dark:hover:bg-white/10"
														aria-label="Abrir selector de emojis"
													>
														<Smile className="h-3.5 w-3.5" />
													</button>
													<button
														type="button"
														onClick={() => commentImageInputRef.current?.click()}
														className="inline-flex items-center justify-center rounded-full p-1 hover:bg-black/10 dark:hover:bg-white/10"
														aria-label="Adjuntar una foto"
													>
														<Camera className="h-3.5 w-3.5" />
													</button>
												</div>
												<Button
													type="submit"
													variant="ghost"
													size="icon"
													disabled={!canSubmitComment}
													className="absolute right-1 top-1 h-8 w-8 rounded-full text-[#1b74e4] hover:bg-[#DCEBFF] hover:text-[#1b74e4] dark:text-[#2D88FF] dark:hover:bg-white/10 dark:hover:text-[#2D88FF]"
												>
													<Send className="h-4 w-4" />
												</Button>
											</div>
										</div>
										{commentImagePreviewUrl && !commentText.trim() ? (
											<p className="mt-1 text-[11px] text-[#65676B] dark:text-[#B0B3B8]">
												Se publicara solo la imagen.
											</p>
										) : null}
									</form>
								) : (
									<div className="fixed inset-x-0 bottom-0 z-10 border-t border-[#CED0D4] bg-[#F0F2F5] px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 dark:border-white/10 dark:bg-[#18191A] sm:hidden">
										<p className="text-center text-xs text-[#65676B] dark:text-[#B0B3B8]">
											Iniciá sesión para dejar un comentario.{' '}
											<Link href="/login" className="font-semibold text-[#1b74e4]">
												Iniciar sesión
											</Link>
										</p>
									</div>
								)}
							</>
						) : null}
						{emojiPickerOpen ? (
							<div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3 sm:items-center">
								<button
									type="button"
									className="absolute inset-0 cursor-default"
									onClick={() => setEmojiPickerOpen(false)}
									aria-label="Cerrar selector de emojis"
								/>
								<div className="relative w-full max-w-sm rounded-2xl border border-[#D8D2CC] bg-white p-3 shadow-xl dark:border-white/10 dark:bg-[#242526]">
									<p className="mb-2 text-sm font-semibold text-[#1C1E21] dark:text-[#E4E6EB]">
										Emojis
									</p>
									<div className="grid grid-cols-5 gap-1.5">
										{QUICK_EMOJIS.map((emoji) => (
											<button
												key={emoji}
												type="button"
												onClick={() => appendEmoji(emoji)}
												className="rounded-lg px-1 py-1.5 text-2xl transition-colors hover:bg-[#F2F3F5] dark:hover:bg-white/10"
											>
												{emoji}
											</button>
										))}
									</div>
								</div>
							</div>
						) : null}
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	)
}
