'use client'

import { Button } from '@/app/components/ui/button'
import { House } from 'lucide-react'

export function ChatHomeButton({ onClick }: { onClick: () => void }) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			className="h-9 w-9 shrink-0 text-slate-600 hover:bg-slate-200/80 dark:text-[#AEBAC1] dark:hover:bg-white/10 dark:hover:text-white"
			onClick={onClick}
			aria-label="Ir al inicio"
		>
			<House className="h-5 w-5" />
		</Button>
	)
}
