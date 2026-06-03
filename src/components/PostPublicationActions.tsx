'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, Share2, ThumbsUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/app/components/ui/utils'
import { postPermalink } from '@/lib/app-public-url'
import type { PostReactionSummary, PostReactionType } from '@/app/providers/types'

function WhatsAppMark({ className }: { className?: string }) {
	return (
		<svg className={cn('shrink-0', className)} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
			<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
		</svg>
	)
}

const reactionOptions: { type: PostReactionType; label: string }[] = [
	{ type: 'like', label: 'Me gusta' },
	{ type: 'love', label: 'Me encanta' },
]

export type PostPublicationActionsProps = {
	postId: string
	whatsappNumber?: string | null | undefined
	className?: string
	onCommentsClick?: () => void
	/** En el detalle del post usar "#comments" */
	commentsHref?: string
	showComments?: boolean
	/** Texto del botón si no pasás `commentCount` (solo accesibilidad) */
	commentsLabel?: string
	/** Contador junto al ícono de comentarios */
	commentCount?: number
	/** Compartir enlace absoluto a `/post/{id}` (solo URL). Por defecto activo. */
	showShare?: boolean
	/** Fila más compacta (detalle del post) */
	compact?: boolean
	reactionSummary?: PostReactionSummary
	myReaction?: PostReactionType
	onReactionChange?: (reaction: PostReactionType | null) => Promise<{ ok: boolean; error?: string }>
}

function iconActionClass(compact: boolean) {
	return cn(
		'inline-flex items-center justify-center gap-1 rounded-full text-[#65676B] transition-colors',
		'hover:bg-[#F2F3F5] active:bg-[#E4E6EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b74e4]/35',
		compact ? 'h-8 min-w-8 px-1.5' : 'h-9 min-w-9 px-2'
	)
}

function iconSizeClass(compact: boolean) {
	return compact ? 'h-[18px] w-[18px]' : 'h-5 w-5'
}

function countClass(compact: boolean) {
	return cn('tabular-nums text-[#65676B]', compact ? 'text-xs' : 'text-[13px]')
}

function PostReactionButton({
	summary,
	myReaction,
	onReactionChange,
	compact,
}: {
	summary?: PostReactionSummary
	myReaction?: PostReactionType
	onReactionChange?: (reaction: PostReactionType | null) => Promise<{ ok: boolean; error?: string }>
	compact: boolean
}) {
	const [open, setOpen] = useState(false)
	const longPressFiredRef = useRef(false)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const total = (summary?.like ?? 0) + (summary?.love ?? 0)
	const activeLabel = myReaction === 'love' ? 'Me encanta' : 'Me gusta'
	const iconClass = iconSizeClass(compact)

	useEffect(() => {
		const close = () => setOpen(false)
		if (!open) return
		window.addEventListener('click', close)
		return () => window.removeEventListener('click', close)
	}, [open])

	const clearTimer = () => {
		if (timerRef.current) clearTimeout(timerRef.current)
		timerRef.current = null
	}

	const applyReaction = async (reaction: PostReactionType | null) => {
		if (!onReactionChange) return
		const result = await onReactionChange(reaction)
		if (!result.ok) toast.error(result.error ?? 'No se pudo actualizar la reacción')
	}

	const handlePointerDown = () => {
		longPressFiredRef.current = false
		clearTimer()
		if (typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
		timerRef.current = setTimeout(() => {
			longPressFiredRef.current = true
			setOpen(true)
		}, 450)
	}

	const handlePointerUp = () => {
		clearTimer()
		if (longPressFiredRef.current) return
		void applyReaction(myReaction === 'like' ? null : 'like')
	}

	return (
		<div className="relative">
			{open ? (
				<div
					className="absolute bottom-full left-0 z-30 mb-1.5 flex rounded-full border border-[#D8D2CC] bg-white p-1 shadow-lg"
					onClick={(e) => e.stopPropagation()}
				>
					{reactionOptions.map((option) => (
						<button
							key={option.type}
							type="button"
							className={cn(
								'flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[#F2F3F5]',
								myReaction === option.type && 'bg-[#E7F3FF]'
							)}
							title={option.label}
							aria-label={option.label}
							onClick={() => {
								setOpen(false)
								void applyReaction(option.type)
							}}
						>
							{option.type === 'love' ? (
								<Heart className="h-5 w-5 fill-red-500 text-red-500" />
							) : (
								<ThumbsUp className="h-5 w-5 fill-[#1b74e4] text-[#1b74e4]" />
							)}
						</button>
					))}
				</div>
			) : null}
			<button
				type="button"
				className={cn(iconActionClass(compact), myReaction && 'text-[#1b74e4]')}
				onPointerDown={handlePointerDown}
				onPointerUp={handlePointerUp}
				onPointerCancel={clearTimer}
				onPointerLeave={clearTimer}
				onClick={(e) => e.stopPropagation()}
				onContextMenu={(e) => {
					e.preventDefault()
					e.stopPropagation()
					void applyReaction(myReaction === 'love' ? null : 'love')
				}}
				aria-label={`${activeLabel}${total > 0 ? `, ${total}` : ''}`}
			>
				{myReaction === 'love' ? (
					<Heart className={cn('shrink-0 fill-red-500 text-red-500', iconClass)} strokeWidth={2} aria-hidden />
				) : (
					<ThumbsUp
						className={cn('shrink-0', myReaction ? 'fill-[#1b74e4] text-[#1b74e4]' : '', iconClass)}
						strokeWidth={2}
						aria-hidden
					/>
				)}
				{total > 0 ? <span className={countClass(compact)}>{total}</span> : null}
			</button>
		</div>
	)
}

export function PostPublicationActions({
	postId,
	whatsappNumber,
	className,
	onCommentsClick,
	commentsHref: commentsHrefProp,
	showComments = true,
	commentsLabel = 'Comentar',
	commentCount,
	showShare = true,
	compact = false,
	reactionSummary,
	myReaction,
	onReactionChange,
}: PostPublicationActionsProps) {
	const wa = whatsappNumber?.replace(/\D/g, '') ?? ''
	const hasWa = wa.length > 0
	const commentsHref = commentsHrefProp ?? `/post/${postId}`
	const isHashLink = commentsHref.startsWith('#')
	const iconClass = iconSizeClass(compact)
	const commentsAria =
		typeof commentCount === 'number' && commentCount > 0
			? `${commentsLabel} (${commentCount})`
			: commentsLabel

	if (!showComments && !hasWa && !showShare && !onReactionChange) return null

	const handleShare = async () => {
		if (typeof window === 'undefined') return
		const url = postPermalink(postId)
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
	}

	const commentControl = (
		<>
			<MessageCircle className={cn('shrink-0', iconClass)} strokeWidth={2} aria-hidden />
			{typeof commentCount === 'number' && commentCount > 0 ? (
				<span className={countClass(compact)}>{commentCount}</span>
			) : null}
		</>
	)

	return (
		<div
			role="group"
			aria-label="Acciones de la publicación"
			className={cn(
				'flex w-full items-center justify-between border-t border-[#CED0D4] bg-white',
				compact ? 'px-2 py-1' : 'px-2 py-1.5 sm:px-3',
				className
			)}
		>
			<div className="flex min-w-0 items-center gap-0.5">
				{onReactionChange ? (
					<PostReactionButton
						summary={reactionSummary}
						myReaction={myReaction}
						onReactionChange={onReactionChange}
						compact={compact}
					/>
				) : null}
				{showComments ? (
					onCommentsClick ? (
						<button
							type="button"
							className={iconActionClass(compact)}
							onClick={onCommentsClick}
							aria-label={commentsAria}
						>
							{commentControl}
						</button>
					) : isHashLink ? (
						<a href={commentsHref} className={iconActionClass(compact)} aria-label={commentsAria}>
							{commentControl}
						</a>
					) : (
						<Link href={commentsHref} className={iconActionClass(compact)} aria-label={commentsAria}>
							{commentControl}
						</Link>
					)
				) : null}
			</div>

			<div className="flex shrink-0 items-center gap-0.5">
				{hasWa ? (
					<a
						href={`https://wa.me/${wa}`}
						target="_blank"
						rel="noopener noreferrer"
						className={iconActionClass(compact)}
						aria-label="Contactar por WhatsApp"
					>
						<WhatsAppMark className={cn('text-[#25D366]', iconClass)} />
					</a>
				) : null}
				{showShare ? (
					<button
						type="button"
						className={iconActionClass(compact)}
						onClick={() => void handleShare()}
						aria-label="Compartir publicación"
					>
						<Share2 className={cn('shrink-0', iconClass)} strokeWidth={2} aria-hidden />
					</button>
				) : null}
			</div>
		</div>
	)
}
