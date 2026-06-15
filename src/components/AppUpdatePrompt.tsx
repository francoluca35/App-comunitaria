'use client'

import { Loader2, RefreshCw } from 'lucide-react'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import { useAppUpdatePrompt } from '@/hooks/useAppUpdatePrompt'
import { isStandaloneApp } from '@/lib/app-version'
import { CST } from '@/lib/cst-theme'

function updateCopy(reason: 'version' | 'service-worker', required: boolean) {
	const standalone = isStandaloneApp()
	if (required) {
		return standalone
			? 'Tu versión de CST quedó desactualizada. Actualizá para seguir con las protecciones más recientes y evitar avisos de Google Play Protect.'
			: 'Tu versión quedó desactualizada. Actualizá para seguir usando CST con las mejoras más recientes.'
	}
	if (reason === 'service-worker') {
		return 'Hay una versión nueva lista. Tocá «Actualizar ahora» cuando quieras aplicarla.'
	}
	return standalone
		? 'Hay una versión nueva de CST. Actualizá cuando puedas para tener las últimas mejoras y evitar avisos de Google Play Protect.'
		: 'Hay una versión nueva disponible. Actualizá cuando quieras para usar la versión más reciente.'
}

/** Solo se muestra si hay actualización pendiente; el chequeo es silencioso en segundo plano. */
export function AppUpdatePrompt() {
	const {
		dialogOpen,
		required,
		reason,
		isUpdating,
		clientVersion,
		serverVersion,
		confirmUpdate,
		dismissDialog,
	} = useAppUpdatePrompt()

	if (!dialogOpen) return null

	const title = required ? 'Actualizá CST para continuar' : 'Nueva versión disponible'
	const description = updateCopy(reason, required)

	return (
		<AlertDialog
			open={dialogOpen}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && !required) dismissDialog()
			}}
		>
			<AlertDialogContent className="border-[#D8D2CC] sm:max-w-md">
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2 text-[#2B2B2B]">
						<RefreshCw className="h-5 w-5 shrink-0" style={{ color: CST.bordo }} aria-hidden />
						{title}
					</AlertDialogTitle>
					<AlertDialogDescription className="space-y-2 text-left text-[#5c5652]">
						<span className="block">{description}</span>
						{isStandaloneApp() ? (
							<span className="block text-xs text-[#7A5C52]">
								Si Google muestra “app no segura”, desinstalá el icono CST viejo e instalá la versión
								nueva desde el enlace oficial.
							</span>
						) : null}
						{serverVersion && clientVersion !== serverVersion ? (
							<span className="block text-xs text-[#7A5C52]">
								Versión actual: {clientVersion} · Nueva: {serverVersion}
							</span>
						) : null}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					{!required ? (
						<AlertDialogCancel onClick={dismissDialog}>Más tarde</AlertDialogCancel>
					) : null}
					<AlertDialogAction
						disabled={isUpdating}
						onClick={(event) => {
							event.preventDefault()
							void confirmUpdate()
						}}
						className="bg-[#8B0015] text-white hover:bg-[#5A000E]"
					>
						{isUpdating ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
								Actualizando…
							</>
						) : (
							'Actualizar ahora'
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
