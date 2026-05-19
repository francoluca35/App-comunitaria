'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { format } from 'date-fns'
import { cn } from '@/app/components/ui/utils'
import { MessageContent } from '@/components/MessageContent'
import { parseChatMessagePayload } from '@/lib/chat-message-payload'
import { VoiceMessageRow } from '@/components/chat/VoiceMessageRow'
import { ChatImageBubble } from '@/components/chat/ChatImageBubble'
import { ChatMessageReceiptTicks } from '@/components/chat/ChatMessageReceiptTicks'
import { getChatReceiptStatus } from '@/lib/chat-read-receipts'

export type BubbleMessage = {
	id: string
	content: string
	created_at: string
	sender_id: string
	delivered_at?: string | null
	read_at?: string | null
}

export function WhatsAppMessageBubble({ message, isMine }: { message: BubbleMessage; isMine: boolean }) {
	const { resolvedTheme } = useTheme()
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])

	const payload = parseChatMessagePayload(message.content)
	const timeStr = format(new Date(message.created_at), 'HH:mm')
	const receiptStatus = isMine ? getChatReceiptStatus(message) : null
	const isDark = mounted && resolvedTheme === 'dark'
	const textVariant = isDark
		? isMine
			? 'wa-out'
			: 'wa-in'
		: isMine
			? 'wa-out-light'
			: 'wa-in-light'

	return (
		<div className={cn('flex px-1', isMine ? 'justify-end' : 'justify-start')}>
			<div
				className={cn(
					'max-w-[min(85%,400px)] rounded-lg px-2 py-1 shadow-sm',
					isMine
						? 'rounded-br-sm bg-[#d9fdd3] dark:bg-[#005C4B]'
						: 'rounded-bl-sm border border-slate-200/90 bg-white dark:border-transparent dark:bg-[#202C33]'
				)}
			>
				<div className="flex items-end gap-2">
					<div className="min-w-0 flex-1">
						{payload.kind === 'audio' ? (
							<VoiceMessageRow
								src={payload.url}
								isMine={isMine}
								initialDurationSec={payload.durationSec}
							/>
						) : payload.kind === 'image' ? (
							<ChatImageBubble src={payload.url} isMine={isMine} />
						) : (
							<MessageContent content={message.content} variant={textVariant} />
						)}
					</div>
					<span className="flex shrink-0 items-center gap-0.5 self-end pb-0.5">
						<span className="text-[10px] tabular-nums leading-none text-slate-500 dark:text-[#8696A0]">
							{timeStr}
						</span>
						{receiptStatus ? <ChatMessageReceiptTicks status={receiptStatus} /> : null}
					</span>
				</div>
			</div>
		</div>
	)
}
