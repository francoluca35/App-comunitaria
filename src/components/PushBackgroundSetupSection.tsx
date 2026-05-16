'use client'

import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { enrollPushDevice, isPushApiAvailable } from '@/lib/push-enrollment'
import { usePushEnrollmentStatus } from '@/hooks/usePushEnrollmentStatus'
import { toast } from 'sonner'
import { cn } from '@/app/components/ui/utils'

type Props = {
	userId: string
}

export function PushBackgroundSetupSection({ userId }: Props) {
	const status = usePushEnrollmentStatus(userId)
	const [busy, setBusy] = useState(false)

	const enabled = status.fullyEnrolled
	const canEnable = status.pushApiAvailable && !enabled

	const onEnable = async () => {
		if (!isPushApiAvailable()) {
			toast.error('Este dispositivo no admite notificaciones con la app cerrada.')
			return
		}
		setBusy(true)
		try {
			const supabase = createClient()
			const {
				data: { session },
			} = await supabase.auth.getSession()
			if (!session?.access_token) {
				toast.error('Iniciá sesión de nuevo para activar las notificaciones.')
				return
			}
			const r = await enrollPushDevice(session.access_token, { requestPermission: true })
			await status.refresh()
			if (r.ok) {
				toast.success('Notificaciones con app cerrada habilitadas.')
			} else if (r.reason === 'denied') {
				toast.message('Activá las notificaciones en los ajustes del teléfono.')
			} else {
				toast.error('No se pudo habilitar. Intentá de nuevo.')
			}
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/40 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<p className="text-sm font-medium text-slate-800 dark:text-gray-100">
					Notificaciones con app cerrada
				</p>
				<p
					className={cn(
						'mt-1 text-sm font-medium',
						status.loading
							? 'text-slate-400 dark:text-gray-500'
							: enabled
								? 'text-emerald-700 dark:text-emerald-400'
								: 'text-slate-500 dark:text-gray-400'
					)}
				>
					{status.loading ? '…' : enabled ? 'Habilitado' : 'Deshabilitado'}
				</p>
			</div>
			{canEnable ? (
				<Button
					type="button"
					size="sm"
					className="w-full bg-[#8B0015] text-white hover:bg-[#5A000E] sm:w-auto"
					disabled={busy || status.loading}
					onClick={() => void onEnable()}
				>
					{busy ? 'Activando…' : 'Habilitar'}
				</Button>
			) : null}
		</div>
	)
}
