'use client'

import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog'
import { DropdownMenuItem } from '@/app/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/app/components/ui/utils'
import { createClient } from '@/lib/supabase/client'
import { adminCarteleraItemUrl } from '@/lib/admin-cartelera-api'
import { invalidateLateralPublicidadCache } from '@/lib/lateral-publicidad-cache'

type Props = {
	publicidadId: string
	/** Dueño: advierte que no hay devolución del dinero. */
	variant: 'owner' | 'admin'
	className?: string
	size?: 'sm' | 'icon'
	/** Muestra "Eliminar" como ítem del menú de tres puntos. */
	asDropdownItem?: boolean
	onDeleted?: () => void
}

export function DeletePublicidadButton({
	publicidadId,
	variant,
	className,
	size = 'sm',
	asDropdownItem = false,
	onDeleted,
}: Props) {
	const [busy, setBusy] = useState(false)
	const [open, setOpen] = useState(false)

	const title =
		variant === 'owner' ? '¿Eliminar esta publicidad?' : '¿Eliminar publicidad como administrador?'

	const description =
		variant === 'owner' ? (
			<>
				Si eliminás esta publicidad, <strong>no se devolverá el dinero invertido</strong>. La publicidad se
				borrará por completo (texto, imágenes y comentarios). Esta acción no se puede deshacer.
			</>
		) : (
			<>
				Se eliminará la publicidad de este usuario, incluidas imágenes y comentarios. No se puede deshacer.
			</>
		)

	const handleDelete = async () => {
		setBusy(true)
		try {
			const supabase = createClient()
			const {
				data: { session },
			} = await supabase.auth.getSession()
			const token = session?.access_token
			if (!token) {
				toast.error('Sesión expirada')
				return
			}

			const url =
				variant === 'owner'
					? `/api/publicidad/mis/${publicidadId}`
					: adminCarteleraItemUrl(publicidadId)

			const res = await fetch(url, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` },
			})
			const data = (await res.json().catch(() => ({}))) as { error?: string }
			if (!res.ok) {
				toast.error(data.error ?? 'No se pudo eliminar')
				return
			}

			toast.success('Publicidad eliminada')
			setOpen(false)
			if (variant === 'admin') {
				invalidateLateralPublicidadCache()
			}
			onDeleted?.()
		} catch {
			toast.error('Error de conexión')
		} finally {
			setBusy(false)
		}
	}

	const trigger =
		size === 'icon' ? (
			<Button
				type="button"
				variant="outline"
				size="icon"
				className={cn('text-red-600 hover:bg-red-50 hover:text-red-700', className)}
				disabled={busy}
				aria-label="Eliminar publicidad"
			>
				{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
			</Button>
		) : (
			<Button
				type="button"
				variant="outline"
				size="sm"
				className={cn('text-red-600 hover:bg-red-50 hover:text-red-700', className)}
				disabled={busy}
			>
				{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
				Eliminar
			</Button>
		)

	const dialog = (
		<AlertDialogContent>
			<AlertDialogHeader>
				<AlertDialogTitle>{title}</AlertDialogTitle>
				<AlertDialogDescription asChild>
					<div className="text-sm text-muted-foreground">{description}</div>
				</AlertDialogDescription>
			</AlertDialogHeader>
			<AlertDialogFooter>
				<AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
				<AlertDialogAction
					className="bg-red-600 hover:bg-red-700"
					disabled={busy}
					onClick={(e) => {
						e.preventDefault()
						void handleDelete()
					}}
				>
					{busy ? 'Eliminando…' : 'Sí, eliminar'}
				</AlertDialogAction>
			</AlertDialogFooter>
		</AlertDialogContent>
	)

	if (asDropdownItem) {
		return (
			<AlertDialog open={open} onOpenChange={setOpen}>
				<DropdownMenuItem
					className="text-red-600 focus:text-red-600"
					disabled={busy}
					onSelect={(e) => {
						e.preventDefault()
						setOpen(true)
					}}
				>
					Eliminar
				</DropdownMenuItem>
				{dialog}
			</AlertDialog>
		)
	}

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
			{dialog}
		</AlertDialog>
	)
}
