'use client'

import { useState } from 'react'
import { Battery, CheckCircle2, Download, Smartphone } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import {
	enrollPushDevice,
	isLikelyAndroid,
	isPushApiAvailable,
} from '@/lib/push-enrollment'
import { usePushEnrollmentStatus } from '@/hooks/usePushEnrollmentStatus'
import {
	isRunningAsInstalledPwa,
	usePwaInstallPrompt,
} from '@/hooks/usePwaInstallPrompt'
import { toast } from 'sonner'
import { cn } from '@/app/components/ui/utils'

type Props = {
	userId: string
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
				ok
					? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
					: 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
			)}
		>
			{ok ? <CheckCircle2 className="h-3 w-3" /> : null}
			{label}
		</span>
	)
}

export function PushBackgroundSetupSection({ userId }: Props) {
	const status = usePushEnrollmentStatus(userId)
	const { canOfferInstall, canOfferIosInstallHint, install } = usePwaInstallPrompt()
	const [busy, setBusy] = useState(false)
	const installedPwa = isRunningAsInstalledPwa()
	const android = isLikelyAndroid()

	const onEnroll = async () => {
		if (!isPushApiAvailable()) {
			toast.error('Este navegador no soporta notificaciones push.')
			return
		}
		setBusy(true)
		try {
			const supabase = createClient()
			const {
				data: { session },
			} = await supabase.auth.getSession()
			if (!session?.access_token) {
				toast.error('Sesión no disponible.')
				return
			}
			const r = await enrollPushDevice(session.access_token, { requestPermission: true })
			await status.refresh()
			if (r.ok) {
				toast.success('Dispositivo listo para avisos con la app cerrada.')
			} else if (r.reason === 'denied') {
				toast.message('Permiso denegado. Activá notificaciones en Ajustes del teléfono.')
			} else if (r.reason === 'no_vapid') {
				toast.error('Falta configurar VAPID en el servidor.')
			} else {
				toast.error('No se pudo registrar. Reintentá.')
			}
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/40">
			<div>
				<p className="text-sm font-medium text-slate-800 dark:text-gray-100">
					Avisos con la app cerrada (Web Push)
				</p>
				<p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
					Es la forma de recibir alertas y mensajes cuando no tenés la app abierta. Requiere permiso del sistema y
					registrar este dispositivo en el servidor.
				</p>
			</div>

			{!status.loading ? (
				<div className="flex flex-wrap gap-2">
					<StatusPill
						ok={status.permission === 'granted'}
						label={
							status.permission === 'granted'
								? 'Permiso del sistema'
								: status.permission === 'denied'
									? 'Permiso bloqueado'
									: 'Permiso pendiente'
						}
					/>
					<StatusPill
						ok={status.registeredOnServer}
						label={
							status.registeredOnServer
								? `Registrado (${status.deviceCount} dispositivo${status.deviceCount === 1 ? '' : 's'})`
								: 'Sin registrar en servidor'
						}
					/>
					<StatusPill ok={installedPwa} label={installedPwa ? 'App instalada' : 'Solo navegador'} />
				</div>
			) : null}

			<Button
				type="button"
				variant="outline"
				size="sm"
				className="w-full border-[#8B0015]/40 text-[#8B0015] hover:bg-[#8B0015]/10 sm:w-auto"
				disabled={busy || status.loading}
				onClick={() => void onEnroll()}
			>
				{busy ? 'Registrando…' : status.fullyEnrolled ? 'Sincronizar de nuevo' : 'Activar en este dispositivo'}
			</Button>

			{!installedPwa && (canOfferInstall || canOfferIosInstallHint) ? (
				<div className="rounded-md border border-dashed border-slate-300 bg-white/60 p-3 dark:border-gray-600 dark:bg-black/20">
					<p className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-gray-100">
						<Smartphone className="h-4 w-4 shrink-0" />
						Instalá la app en el inicio
					</p>
					<p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
						En Android, las notificaciones suelen ser más estables con la PWA instalada que solo en una pestaña de Chrome.
					</p>
					{canOfferInstall ? (
						<Button type="button" size="sm" className="mt-2 gap-1.5" onClick={() => void install()}>
							<Download className="h-4 w-4" />
							Instalar app
						</Button>
					) : (
						<p className="mt-2 text-xs text-slate-600 dark:text-gray-300">
							En iPhone: Safari → compartir → <strong>Añadir a pantalla de inicio</strong>.
						</p>
					)}
				</div>
			) : null}

			{android ? (
				<div className="rounded-md border border-slate-200 bg-white/50 p-3 text-xs leading-relaxed text-slate-600 dark:border-gray-600 dark:bg-black/15 dark:text-gray-300">
					<p className="flex items-center gap-2 font-medium text-slate-800 dark:text-gray-100">
						<Battery className="h-4 w-4 shrink-0" />
						Si no llegan o llegan tarde (Android)
					</p>
					<ul className="mt-2 list-disc space-y-1 pl-4">
						<li>Ajustes → Apps → Chrome o CST Comunidad → Notificaciones: activadas y con sonido.</li>
						<li>Batería → sin restricción o &quot;Sin optimizar&quot; para esa app.</li>
						<li>Evitá &quot;Forzar detención&quot; en Ajustes; cerrar recientes suele estar bien, forzar detención no.</li>
					</ul>
				</div>
			) : null}
		</div>
	)
}
