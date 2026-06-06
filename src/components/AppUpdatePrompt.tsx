'use client'

import { RefreshCw } from 'lucide-react'
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
import { CST } from '@/lib/cst-theme'

export function AppUpdatePrompt() {
	const { open, required, reason, clientVersion, serverVersion, confirmUpdate, dismissUpdate } =
		useAppUpdatePrompt()

	const title = required ? 'Actualizá CST para continuar' : 'Hay una nueva versión de CST'
	const description =
		reason === 'service-worker'
			? 'Hay mejoras listas para instalarse. Actualizá ahora para usar la versión más reciente de la comunidad.'
			: required
				? 'Tu versión de la app quedó desactualizada. Actualizá para seguir usando CST con las protecciones y mejoras más recientes.'
				: 'Hay una versión nueva disponible. ¿Querés actualizar la app ahora?'

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && !required) dismissUpdate()
			}}
		>
			<AlertDialogContent className="border-[#D8D2CC] sm:max-w-md">
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2 text-[#2B2B2B]">
						<RefreshCw className="h-5 w-5 shrink-0" style={{ color: CST.bordo }} aria-hidden />
						{title}
					</AlertDialogTitle>
					<AlertDialogDescription className="text-left text-[#5c5652]">
						{description}
						{serverVersion && clientVersion !== serverVersion ? (
							<span className="mt-2 block text-xs text-[#7A5C52]">
								Versión actual: {clientVersion} · Nueva: {serverVersion}
							</span>
						) : null}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					{!required ? (
						<AlertDialogCancel onClick={dismissUpdate}>Más tarde</AlertDialogCancel>
					) : null}
					<AlertDialogAction
						onClick={(event) => {
							event.preventDefault()
							void confirmUpdate()
						}}
						className="bg-[#8B0015] text-white hover:bg-[#5A000E]"
					>
						Actualizar ahora
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
