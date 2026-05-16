'use client'

import { Button } from '@/app/components/ui/button'
import { Calendar, Trash2 } from 'lucide-react'
import { ChatHomeButton } from '@/components/chat/ChatHomeButton'

type ChatAdminHeaderActionsProps = {
	onHome: () => void
	onClearByDate: () => void
	onClearAll: () => void
	clearing?: boolean
}

export function ChatAdminHeaderActions({
	onHome,
	onClearByDate,
	onClearAll,
	clearing = false,
}: ChatAdminHeaderActionsProps) {
	return (
		<div className="flex shrink-0 items-center">
			<ChatHomeButton onClick={onHome} />
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="h-9 w-9 shrink-0 text-slate-600 hover:bg-slate-200/80 dark:text-[#AEBAC1] dark:hover:bg-white/10 dark:hover:text-white"
				onClick={onClearByDate}
				disabled={clearing}
				aria-label="Vaciar mensajes por rango de fechas"
			>
				<Calendar className="h-5 w-5" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="h-9 w-9 shrink-0 text-red-600 hover:bg-slate-200/80 dark:text-red-400 dark:hover:bg-white/10 dark:hover:text-red-300"
				onClick={onClearAll}
				disabled={clearing}
				aria-label="Vaciar todo el chat"
			>
				<Trash2 className="h-5 w-5" />
			</Button>
		</div>
	)
}
