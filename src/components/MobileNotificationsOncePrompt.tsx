'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Smartphone } from 'lucide-react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { enrollPushDevice } from '@/lib/push-enrollment'
import { isRunningAsInstalledPwa } from '@/hooks/usePwaInstallPrompt'
import { toast } from 'sonner'
import { CST } from '@/lib/cst-theme'

/** Antes: "Ahora no" marcaba este flag y el usuario nunca más recibía push en segundo plano. Se deja de leer al migrar. */
const LEGACY_PROMPT_DONE_V1 = 'comunidad_mobile_push_prompt_v1'
const SNOOZE_UNTIL_KEY = 'comunidad_push_prompt_snooze_until_v2'
const SNOOZE_MS = 72 * 60 * 60 * 1000

function migrateLegacyPromptFlag(): void {
	try {
		if (window.localStorage.getItem(LEGACY_PROMPT_DONE_V1) === '1') {
			window.localStorage.removeItem(LEGACY_PROMPT_DONE_V1)
		}
	} catch {
		// ignore
	}
}

function readSnoozeUntil(): number {
	try {
		const raw = window.localStorage.getItem(SNOOZE_UNTIL_KEY)
		if (!raw) return 0
		const n = parseInt(raw, 10)
		return Number.isFinite(n) ? n : 0
	} catch {
		return 0
	}
}

function setSnooze72h(): void {
	try {
		window.localStorage.setItem(SNOOZE_UNTIL_KEY, String(Date.now() + SNOOZE_MS))
	} catch {
		// ignore
	}
}

function isSnoozed(): boolean {
	return readSnoozeUntil() > Date.now()
}

type Props = {
	/** Si es false, no se muestra el diálogo (p. ej. otro modal crítico encima). */
	gateOpen?: boolean
	authLoading: boolean
	userId: string | null | undefined
}

/**
 * Invita a aceptar notificaciones del navegador y registra Web Push (misma URL en móvil y escritorio).
 * "Ahora no" pospone 72 h; ya no bloquea para siempre la suscripción en segundo plano.
 */
export function MobileNotificationsOncePrompt({ gateOpen = true, authLoading, userId }: Props) {
	const [open, setOpen] = useState(false)
	const [busy, setBusy] = useState(false)
	/** Si al cerrar el diálogo debe posponer (72 h): no tras registro exitoso ni si el usuario denegó permiso. */
	const snoozeOnDialogCloseRef = useRef(true)

	useEffect(() => {
		if (typeof window === 'undefined') return
		migrateLegacyPromptFlag()
		if (authLoading || !userId || !gateOpen) {
			setOpen(false)
			return
		}
		if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
			return
		}
		if (Notification.permission !== 'default') {
			setOpen(false)
			return
		}
		if (isSnoozed()) {
			setOpen(false)
			return
		}
		snoozeOnDialogCloseRef.current = true
		setOpen(true)
	}, [authLoading, userId, gateOpen])

	const closeOnly = useCallback(() => {
		setOpen(false)
	}, [])

	const onActivate = useCallback(async () => {
		setBusy(true)
		try {
			const perm = await Notification.requestPermission()
			if (perm !== 'granted') {
				toast.message('Sin permiso no podemos avisarte cuando la app esté cerrada.')
				snoozeOnDialogCloseRef.current = false
				closeOnly()
				return
			}

			const supabase = createClient()
			const {
				data: { session },
			} = await supabase.auth.getSession()
			if (!session?.access_token) {
				toast.error('Sesión no disponible. Probá de nuevo.')
				setBusy(false)
				return
			}

			const result = await enrollPushDevice(session.access_token, { requestPermission: false })
			if (result.ok) {
				toast.success('Listo: te avisaremos aunque la app esté cerrada.')
				if (!isRunningAsInstalledPwa()) {
					toast.message('Tip: instalá la app desde Configuración para mejores avisos en el celular.', {
						duration: 6000,
					})
				}
			} else if (result.reason === 'no_vapid') {
				toast.message('Notificaciones activadas. El aviso push completo requiere VAPID en el servidor.')
			} else {
				toast.message('Permiso guardado. Si no llegan avisos, revisá la conexión.')
			}
			snoozeOnDialogCloseRef.current = false
			closeOnly()
		} catch {
			toast.error('No se pudo completar. Reintentá desde Configuración más tarde.')
			snoozeOnDialogCloseRef.current = false
			closeOnly()
		} finally {
			setBusy(false)
		}
	}, [closeOnly])

	const onLater = useCallback(() => {
		setSnooze72h()
		snoozeOnDialogCloseRef.current = false
		closeOnly()
	}, [closeOnly])

	const onDialogOpenChange = useCallback(
		(next: boolean) => {
			if (!next) {
				if (snoozeOnDialogCloseRef.current) setSnooze72h()
				snoozeOnDialogCloseRef.current = true
				setOpen(false)
			}
		},
		[]
	)

	return (
		<Dialog open={open} onOpenChange={onDialogOpenChange}>
			<DialogContent
				className="max-w-[min(100vw-1.5rem,22rem)] gap-4 rounded-2xl border-2 border-[#D8D2CC] bg-[#F4EFEA] p-5 shadow-xl sm:rounded-2xl"
				onPointerDownOutside={(e) => e.preventDefault()}
			>
				<DialogHeader className="space-y-3 text-left">
					<div className="flex justify-center">
						<span
							className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md"
							style={{ backgroundColor: CST.bordo }}
							aria-hidden
						>
							<Smartphone className="h-7 w-7" strokeWidth={2} />
						</span>
					</div>
					<DialogTitle className="text-center text-lg font-bold leading-snug text-[#2B2B2B] font-montserrat-only">
						¿Querés recibir notificaciones en este dispositivo?
					</DialogTitle>
					<DialogDescription className="text-center text-sm leading-relaxed text-[#5c4a42]">
						<span className="inline-flex items-center gap-1.5 font-medium text-[#8B0015]">
							<Bell className="h-4 w-4 shrink-0" aria-hidden />
							Te lo volvemos a ofrecer si elegís &quot;Ahora no&quot; (después de unos días).
						</span>{' '}
						Así podés enterarte de <strong>alertas importantes</strong> y <strong>mensajes</strong> aunque no tengas la app abierta.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="flex-col gap-2 sm:flex-col">
					<Button
						type="button"
						className="h-12 w-full rounded-xl text-base font-semibold text-white shadow-md"
						style={{ backgroundColor: CST.bordo }}
						disabled={busy}
						onClick={() => void onActivate()}
					>
						{busy ? 'Activando…' : 'Sí, avisarme'}
					</Button>
					<Button type="button" variant="ghost" className="h-11 w-full rounded-xl text-[#7A5C52]" disabled={busy} onClick={onLater}>
						Ahora no
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
