'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Download, Share2, Smartphone } from 'lucide-react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { isRunningAsInstalledPwa, usePwaInstallPrompt } from '@/hooks/usePwaInstallPrompt'
import { CST } from '@/lib/cst-theme'

const SNOOZE_UNTIL_KEY = 'comunidad_pwa_install_snooze_until_v1'
const SNOOZE_MS = 72 * 60 * 60 * 1000

const SKIP_PATHS = new Set(['/login', '/pwa-launch'])

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
	/** Para que otros modales (p. ej. notificaciones) no se superpongan. */
	onOpenChange?: (open: boolean) => void
}

/**
 * Aviso global al abrir la app en el navegador si la PWA no está instalada.
 * El usuario debe tocar «Instalar app» (requisito del navegador).
 */
export function PwaInstallPrompt({ onOpenChange }: Props) {
	const pathname = usePathname()
	const { canOfferInstall, canOfferIosInstallHint, install } = usePwaInstallPrompt()
	const [open, setOpen] = useState(false)
	const [iosOpen, setIosOpen] = useState(false)
	const [busy, setBusy] = useState(false)
	const snoozeOnCloseRef = useRef(true)

	useEffect(() => {
		onOpenChange?.(open || iosOpen)
	}, [open, iosOpen, onOpenChange])

	useEffect(() => {
		if (typeof window === 'undefined') return
		if (SKIP_PATHS.has(pathname)) return
		if (isRunningAsInstalledPwa()) return
		if (isSnoozed()) return
		if (!canOfferInstall && !canOfferIosInstallHint) return

		snoozeOnCloseRef.current = true
		setOpen(true)
	}, [pathname, canOfferInstall, canOfferIosInstallHint])

	const closeMain = useCallback(() => setOpen(false), [])

	const onInstallClick = useCallback(async () => {
		if (canOfferInstall) {
			setBusy(true)
			try {
				await install()
			} finally {
				setBusy(false)
				snoozeOnCloseRef.current = false
				closeMain()
			}
			return
		}
		if (canOfferIosInstallHint) {
			snoozeOnCloseRef.current = false
			closeMain()
			setIosOpen(true)
		}
	}, [canOfferInstall, canOfferIosInstallHint, install, closeMain])

	const onLater = useCallback(() => {
		setSnooze72h()
		snoozeOnCloseRef.current = false
		closeMain()
	}, [closeMain])

	const onMainOpenChange = useCallback((next: boolean) => {
		if (!next) {
			if (snoozeOnCloseRef.current) setSnooze72h()
			snoozeOnCloseRef.current = true
			setOpen(false)
		}
	}, [])

	const onIosOpenChange = useCallback((next: boolean) => {
		if (!next) {
			setSnooze72h()
			setIosOpen(false)
		}
	}, [])

	return (
		<>
			<Dialog open={open} onOpenChange={onMainOpenChange}>
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
							Instalar app
						</DialogTitle>
						<DialogDescription className="text-center text-sm leading-relaxed text-[#5c4a42]">
							Instalá CST en tu dispositivo para abrirla como aplicación, con acceso rápido desde el inicio y
							mejores notificaciones.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex-col gap-2 sm:flex-col">
						<Button
							type="button"
							className="h-12 w-full gap-2 rounded-xl text-base font-semibold text-white shadow-md"
							style={{ backgroundColor: CST.bordo }}
							disabled={busy}
							onClick={() => void onInstallClick()}
						>
							{canOfferInstall ? (
								<>
									<Download className="h-5 w-5 shrink-0" aria-hidden />
									{busy ? 'Instalando…' : 'Instalar app'}
								</>
							) : (
								<>
									<Share2 className="h-5 w-5 shrink-0" aria-hidden />
									Cómo instalar
								</>
							)}
						</Button>
						<Button
							type="button"
							variant="ghost"
							className="h-11 w-full rounded-xl text-[#7A5C52]"
							disabled={busy}
							onClick={onLater}
						>
							Ahora no
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={iosOpen} onOpenChange={onIosOpenChange}>
				<DialogContent className="max-w-md border-[#D8D2CC] sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-[#2B2B2B]">Instalar CST en iPhone o iPad</DialogTitle>
						<DialogDescription className="text-left text-slate-600">
							En Apple hay que añadir el sitio a la pantalla de inicio desde Safari.
						</DialogDescription>
					</DialogHeader>
					<ol className="list-decimal space-y-3 pl-4 text-sm leading-relaxed text-slate-800">
						<li>
							Abrí esta página en <strong>Safari</strong> (si estás en Chrome u otro navegador, abrí el enlace en
							Safari).
						</li>
						<li>
							Tocá el botón <strong>Compartir</strong>{' '}
							<span className="whitespace-nowrap text-slate-600">(cuadrado con flecha hacia arriba)</span>.
						</li>
						<li>
							Elegí <strong>«Añadir a pantalla de inicio»</strong> (puede estar más abajo en el menú).
						</li>
						<li>
							Tocá <strong>«Añadir»</strong>. Vas a ver el ícono de CST en tu inicio.
						</li>
					</ol>
					<DialogFooter className="sm:justify-end">
						<Button
							type="button"
							className="w-full bg-[#8B0015] text-white hover:bg-[#5A000E] sm:w-auto"
							onClick={() => onIosOpenChange(false)}
						>
							Entendido
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
