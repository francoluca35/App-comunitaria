'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { DeleteOwnPostButton } from '@/components/DeleteOwnPostButton'
import { Post, useApp } from '@/app/providers'
import { Card, CardContent, CardFooter } from '@/app/components/ui/card'
import { PostPublicationActions } from '@/components/PostPublicationActions'
import { PostImageWithLightbox } from '@/components/PostImageWithLightbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { PostAuthorNameCategoryRow } from '@/components/PostAuthorNameCategoryRow'
import { Badge } from '@/app/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface PostCardProps {
	post: Post
	/** Si está definido, "Comentar" abre el modal en lugar de ir a `/post/{id}`. */
	onOpenComments?: (post: Post) => void
	/** Primeras filas del feed: carga prioritaria de imágenes (LCP). */
	priority?: boolean
}

export function PostCard({ post, onOpenComments, priority }: PostCardProps) {
	const { config, currentUser, commentCountByPostId } = useApp()
	const [descriptionExpanded, setDescriptionExpanded] = useState(false)
	const [descriptionOverflowsCollapsed, setDescriptionOverflowsCollapsed] = useState(false)
	const descriptionRef = useRef<HTMLParagraphElement | null>(null)
	const isMine = currentUser?.id === post.authorId
	const commentCount =
		config.commentsEnabled && Object.prototype.hasOwnProperty.call(commentCountByPostId, post.id)
			? commentCountByPostId[post.id]
			: undefined

	const statusBadge =
		post.status === 'pending' ? (
			<Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
				Pendiente
			</Badge>
		) : post.status === 'rejected' ? (
			<Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
				Rechazada
			</Badge>
		) : null

	const createdAtLabel = formatDistanceToNow(post.createdAt, { addSuffix: true, locale: es })
	const descriptionText = post.description.trim()

	useEffect(() => {
		setDescriptionExpanded(false)
	}, [post.id])

	useEffect(() => {
		const el = descriptionRef.current
		if (!el || !descriptionText) {
			setDescriptionOverflowsCollapsed(false)
			return
		}

		const measure = () => {
			const n = descriptionRef.current
			if (!n) return
			if (descriptionExpanded) return
			setDescriptionOverflowsCollapsed(n.scrollHeight > n.clientHeight + 1)
		}

		measure()
		const ro = new ResizeObserver(() => measure())
		ro.observe(el)
		window.addEventListener('resize', measure)
		return () => {
			ro.disconnect()
			window.removeEventListener('resize', measure)
		}
	}, [descriptionText, descriptionExpanded, post.id])

	return (
		<Card className="relative gap-0 overflow-hidden rounded-none border-x-0 border-b border-[#CED0D4] border-t-0 bg-white sm:rounded-none sm:border sm:border-[#D8D2CC]">
			{isMine ? (
				<div className="absolute right-2 top-3 z-10 sm:right-3">
					<DeleteOwnPostButton postId={post.id} authorId={post.authorId} size="icon" />
				</div>
			) : null}
			<CardContent className={`p-4 ${isMine ? 'pr-14' : ''}`}>
				<div className="mb-2 flex items-start gap-2.5">
					<Avatar className="h-10 w-10 shrink-0">
						<AvatarImage src={post.authorAvatar} />
						<AvatarFallback className="bg-[#E8E4E0] text-sm font-semibold text-[#2B2B2B]">
							{post.authorName[0]?.toUpperCase() ?? '?'}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<PostAuthorNameCategoryRow
							authorName={post.authorName}
							category={post.category}
							statusBadge={statusBadge}
						/>
						<p className="mt-0.5 text-sm leading-tight text-[#7A5C52]">{createdAtLabel}</p>
					</div>
				</div>

				<Link href={`/post/${post.id}`} className="block">
					<h3 className="font-montserrat-only mb-0.5 font-semibold leading-snug text-[#2B2B2B] line-clamp-2 hover:text-[#8B0015] transition-colors">
						{post.title}
					</h3>
				</Link>
				{post.description ? (
					<div className="mt-0.5">
						<p
							ref={descriptionRef}
							className={`text-sm text-[#2B2B2B] whitespace-pre-wrap ${
								!descriptionExpanded ? 'line-clamp-2 sm:line-clamp-3' : ''
							}`}
						>
							{descriptionText}
						</p>
						{descriptionExpanded || descriptionOverflowsCollapsed ? (
							<button
								type="button"
								className="mt-1 text-xs font-semibold text-[#8B0015] hover:underline"
								onClick={() => setDescriptionExpanded((v) => !v)}
							>
								{descriptionExpanded ? 'Ver menos' : 'Ver más'}
							</button>
						) : null}
					</div>
				) : null}
			</CardContent>

			{post.media.length > 0 ? (
				<PostImageWithLightbox
					media={post.media}
					alt={post.title}
					variant="feed"
					priority={priority}
				/>
			) : null}

			<CardFooter className="border-0 bg-white px-0 py-0">
				<PostPublicationActions
					postId={post.id}
					whatsappNumber={config.whatsappEnabled ? post.whatsappNumber : undefined}
					showComments={config.commentsEnabled}
					onCommentsClick={onOpenComments ? () => onOpenComments(post) : undefined}
					commentCount={commentCount}
				/>
			</CardFooter>
		</Card>
	)
}
