'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { isMarioAccountEmail } from '@/lib/mario-account'
import { DashboardLayout } from '@/components/DashboardLayout'

/**
 * `/message` ya no es el chat con Mario: vecinos van a elegir admin en `/message/contactos`.
 * El chat dedicado con Mario está en `/message/mario` (CTA del inicio, etc.).
 */
export default function MessageIndexPage() {
	const router = useRouter()
	const { currentUser, authLoading } = useApp()

	useEffect(() => {
		if (authLoading) return
		if (!currentUser) {
			router.replace('/login?next=/message/contactos')
			return
		}
		if (isMarioAccountEmail(currentUser.email)) {
			router.replace('/message/mario')
			return
		}
		if (currentUser.isAdmin || currentUser.isModerator) {
			router.replace('/admin/messages')
			return
		}
		router.replace('/message/contactos')
	}, [authLoading, currentUser, router])

	return (
		<DashboardLayout fillViewport>
			<div className="flex flex-1 items-center justify-center p-4">
				<p className="text-slate-500 dark:text-slate-400">Redirigiendo…</p>
			</div>
		</DashboardLayout>
	)
}
