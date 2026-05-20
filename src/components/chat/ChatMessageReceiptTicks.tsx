'use client'

import { Check, CheckCheck } from 'lucide-react'
import { cn } from '@/app/components/ui/utils'
import type { ChatReceiptStatus } from '@/lib/chat-read-receipts'

type Props = {
	status: ChatReceiptStatus
	className?: string
}

/** Una tilde = enviado; dos grises = entregado; dos violetas = leído. */
export function ChatMessageReceiptTicks({ status, className }: Props) {
	if (status === 'sent') {
		return (
			<Check
				strokeWidth={2.5}
				className={cn('h-[13px] w-[13px] shrink-0 text-[#8696A0]', className)}
				aria-label="Enviado"
			/>
		)
	}

	const isRead = status === 'read'
	return (
		<CheckCheck
			strokeWidth={2.5}
			className={cn(
				'h-[13px] w-[13px] shrink-0',
				isRead ? 'text-violet-600 dark:text-violet-400' : 'text-[#8696A0]',
				className
			)}
			aria-label={isRead ? 'Leído' : 'Entregado'}
		/>
	)
}
