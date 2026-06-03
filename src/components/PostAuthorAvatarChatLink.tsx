'use client'

import Link from 'next/link'
import { useApp } from '@/app/providers'
import { adminContactChatPath } from '@/lib/admin-contact-search'
import { canOpenAuthorChatFromPost } from '@/lib/post-admin-permissions'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { cn } from '@/app/components/ui/utils'

type PostAuthorAvatarChatLinkProps = {
	authorId: string
	authorName: string
	authorAvatar?: string
	className?: string
	fallbackClassName?: string
	onNavigate?: () => void
}

export function PostAuthorAvatarChatLink({
	authorId,
	authorName,
	authorAvatar,
	className,
	fallbackClassName,
	onNavigate,
}: PostAuthorAvatarChatLinkProps) {
	const { currentUser } = useApp()
	const canChat = canOpenAuthorChatFromPost(currentUser, authorId)

	const avatar = (
		<Avatar className={className}>
			<AvatarImage src={authorAvatar} alt={authorName} />
			<AvatarFallback
				className={cn(
					'bg-[#E8E4E0] text-sm font-semibold text-[#2B2B2B]',
					fallbackClassName
				)}
			>
				{authorName[0]?.toUpperCase() ?? '?'}
			</AvatarFallback>
		</Avatar>
	)

	if (!canChat) return avatar

	return (
		<Link
			href={adminContactChatPath(authorId)}
			onClick={onNavigate}
			className="shrink-0 rounded-full transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B0015] focus-visible:ring-offset-2"
			title={`Escribir a ${authorName} por chat`}
			aria-label={`Escribir a ${authorName} por chat`}
		>
			{avatar}
		</Link>
	)
}
