'use client'

import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { useApp } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/app/components/ui/utils'

type Props = {
	postId: string
	authorId: string
	className?: string
	size?: 'sm' | 'icon'
}

export function EditOwnPostButton({ postId, authorId, className, size = 'sm' }: Props) {
	const { currentUser } = useApp()
	if (!currentUser || currentUser.id !== authorId) return null

	return (
		<Button
			variant="ghost"
			size={size}
			className={cn(
				'text-[#8B0015] hover:bg-[#8B0015]/10 hover:text-[#5A000E]',
				size === 'icon' && 'h-8 w-8 shrink-0',
				className
			)}
			asChild
		>
			<Link href={`/mis-publicaciones/${postId}/editar`} aria-label="Editar publicación">
				<Pencil className="h-4 w-4" />
			</Link>
		</Button>
	)
}
