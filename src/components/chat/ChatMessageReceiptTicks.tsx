'use client'

import { Check, CheckCheck } from 'lucide-react'
import { cn } from '@/app/components/ui/utils'
import type { ChatReceiptStatus } from '@/lib/chat-read-receipts'

type Props = {
	status: ChatReceiptStatus
	className?: string
}

/** Una tilde = enviado; dos grises = recibido; dos violetas = leído. */
export function ChatMessageReceiptTicks({ status, className }: Props) {
	if (status === 'sent') {
		return (
			<Check
				className={cn('h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-[#8696A0]', className)}
				aria-label="Enviado"
			/>
		)
	}

	const isRead = status === 'read'
	return (
		<CheckCheck
			className={cn(
				'h-3.5 w-3.5 shrink-0',
				isRead ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-[#8696A0]',
				className
			)}
			aria-label={isRead ? 'Leído' : 'Recibido'}
		/>
	)
}
