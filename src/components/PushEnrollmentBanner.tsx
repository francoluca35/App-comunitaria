'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, BellOff, RefreshCw, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { enrollPushDevice } from '@/lib/push-enrollment'
import { usePushEnrollmentStatus } from '@/hooks/usePushEnrollmentStatus'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/app/components/ui/utils'

const DISMISS_KEY = 'comunidad_push_banner_dismiss_until_v3'
const DISMISS_MS = 24 * 60 * 60 * 1000

function isDismissed(): boolean {
	try {
		const raw = localStorage.getItem(DISMISS_KEY)
		if (!raw) return false
		return parseInt(raw, 10) > Date.now()
	} catch {
		return false
	}
}

function dismiss24h(): void {
	try {
		localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS))
	} catch {
		// ignore
	}
}

const HIDDEN_PREFIXES = ['/login', '/registro', '/recuperar']

type Props = {
	userId: string | null | undefined
	authLoading: boolean
}

/**
 * Aviso persistente si faltan permisos o el dispositivo no está en push_subscriptions.
 */
export function PushEnrollmentBanner({ userId, authLoading }: Props) {
	const pathname = usePathname()
	const status = usePushEnrollmentStatus(userId)
	const [busy, setBusy] = useState(false)
	const [dismissed, setDismissed] = useState(() => isDismissed())

	if (authLoading || !userId || dismissed) return null
	if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null
	if (status.loading || status.fullyEnrolled || !status.pushApiAvailable) return null
	if (!status.needsPermission && !status.needsServerSync) return null

	const isSync = status.needsServerSync && status.permission === 'granted'
	const isDenied = status.permission === 'denied'

	const onActivate = async () => {
		setBusy(true)
		try {
			const supabase = createClient()
			const {
				data: { session },
			} = await supabase.auth.getSession()
			if (!session?.access_token) return
			await enrollPushDevice(session.access_token, { requestPermission: true })
			await status.refresh()
		} finally {
			setBusy(false)
		}
	}

	return (
		<div
			className={cn(
				'fixed inset-x-0 z-[60] border-b px-3 py-2.5 shadow-md',
				'top-[env(safe-area-inset-top,0px)]',
				isDenied
					? 'border-amber-200/80 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/90 dark:text-amber-100'
					: 'border-[#8B0015]/25 bg-[#8B0015]/10 text-[#4a0009] dark:border-[#8B0015]/40 dark:bg-[#2a0a10] dark:text-[#f4d4d8]'
			)}
			role="status"
		>
			<div className="mx-auto flex max-w-lg items-start gap-2">
				{isDenied ? (
					<BellOff className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
				) : (
					<Bell className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
				)}
				<div className="min-w-0 flex-1 text-sm leading-snug">
					{isDenied ? (
						<>
							<strong className="font-semibold">Notificaciones bloqueadas.</strong> Para alertas y mensajes con la app
							cerrada, activalas en Ajustes del teléfono → Apps → navegador o CST Comunidad → Notificaciones.
						</>
					) : isSync ? (
						<>
							<strong className="font-semibold">Falta registrar este dispositivo.</strong> Tenés permiso pero el servidor
							aún no guardó el push. Tocá sincronizar.
						</>
					) : (
						<>
							<strong className="font-semibold">Activá avisos en segundo plano.</strong> Así te enterás de alertas y
							mensajes aunque cierres la app.
						</>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-1">
					{!isDenied ? (
						<Button
							type="button"
							size="sm"
							variant="secondary"
							className="h-8 bg-white/90 text-xs dark:bg-white/15"
							disabled={busy}
							onClick={() => void onActivate()}
						>
							{busy ? (
								<RefreshCw className="h-3.5 w-3.5 animate-spin" />
							) : isSync ? (
								'Sincronizar'
							) : (
								'Activar'
							)}
						</Button>
					) : (
						<Button type="button" size="sm" variant="secondary" className="h-8 text-xs" asChild>
							<Link href="/configuracion">Ayuda</Link>
						</Button>
					)}
					<button
						type="button"
						className="rounded-full p-1 opacity-70 hover:opacity-100"
						aria-label="Ocultar por 24 horas"
						onClick={() => {
							dismiss24h()
							setDismissed(true)
						}}
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	)
}
