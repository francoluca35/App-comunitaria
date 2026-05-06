'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Camera, Trash2, Upload } from 'lucide-react'
import { useApp } from '@/app/providers'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CST } from '@/lib/cst-theme'
import { AvatarImageCropDialog } from '@/components/AvatarImageCropDialog'
import { useReferentPublicProfile } from '@/hooks/useReferentPublicProfile'
import { isMarioAccountEmail } from '@/lib/mario-account'

export default function ReferenteFotoPage() {
	const router = useRouter()
	const { currentUser, refreshUser } = useApp()
	const supabase = useMemo(() => createClient(), [])
	const { referent: mario, reload: reloadMario, loading: marioLoading } = useReferentPublicProfile()

	const [uploading, setUploading] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const [cropOpen, setCropOpen] = useState(false)
	const [cropFile, setCropFile] = useState<File | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const allowed = !!(
		currentUser &&
		(currentUser.isAdminMaster || isMarioAccountEmail(currentUser.email))
	)

	useEffect(() => {
		if (!currentUser) {
			router.replace('/login?next=/referente/foto')
			return
		}
		if (!allowed) {
			router.replace('/')
		}
	}, [currentUser, allowed, router])

	const uploadFile = useCallback(
		async (file: File) => {
			const {
				data: { session },
			} = await supabase.auth.getSession()
			if (!session?.access_token) {
				toast.error('Sesión expirada.')
				return
			}
			setUploading(true)
			try {
				const formData = new FormData()
				formData.append('avatar', file)
				const res = await fetch('/api/referent/avatar', {
					method: 'POST',
					headers: { Authorization: `Bearer ${session.access_token}` },
					body: formData,
				})
				const data = await res.json().catch(() => ({}))
				if (!res.ok) {
					toast.error((data as { error?: string }).error ?? 'No se pudo subir la imagen')
					return
				}
				toast.success('Foto del referente actualizada')
				void reloadMario()
				if (isMarioAccountEmail(currentUser?.email)) {
					await refreshUser()
				}
			} catch {
				toast.error('Error de red. Intentá de nuevo.')
			} finally {
				setUploading(false)
			}
		},
		[supabase, reloadMario, refreshUser, currentUser?.email]
	)

	const handleDelete = async () => {
		if (!confirm('¿Quitar la foto del referente? En el inicio se usará la imagen por defecto o la URL de configuración.')) {
			return
		}
		const {
			data: { session },
		} = await supabase.auth.getSession()
		if (!session?.access_token) {
			toast.error('Sesión expirada.')
			return
		}
		setDeleting(true)
		try {
			const res = await fetch('/api/referent/avatar', {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${session.access_token}` },
			})
			const data = await res.json().catch(() => ({}))
			if (!res.ok) {
				toast.error((data as { error?: string }).error ?? 'No se pudo eliminar')
				return
			}
			toast.success('Foto eliminada')
			void reloadMario()
			if (isMarioAccountEmail(currentUser?.email)) {
				await refreshUser()
			}
		} catch {
			toast.error('Error de red.')
		} finally {
			setDeleting(false)
		}
	}

	if (!currentUser || !allowed) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0B141A]">
				<p className="text-slate-600 dark:text-[#8696A0]">Cargando…</p>
			</div>
		)
	}

	const previewUrl = mario?.avatar_url?.trim() || ''

	return (
		<DashboardLayout contentClassName="max-w-lg">
			<input
				ref={fileInputRef}
				type="file"
				accept="image/jpeg,image/png,image/webp"
				className="hidden"
				onChange={(e) => {
					const f = e.target.files?.[0]
					e.target.value = ''
					if (f) setCropFile(f)
					setCropOpen(true)
				}}
			/>
			<AvatarImageCropDialog
				open={cropOpen}
				onOpenChange={(open) => {
					setCropOpen(open)
					if (!open) setCropFile(null)
				}}
				file={cropFile}
				onConfirm={(file) => void uploadFile(file)}
			/>

			<div className="mb-4 flex items-center gap-2">
				<Button type="button" variant="ghost" size="icon" onClick={() => router.push('/')} aria-label="Volver">
					<ArrowLeft className="h-5 w-5" />
				</Button>
				<h1 className="font-montserrat-only text-lg font-bold text-[#2B2B2B] dark:text-white">
					Foto del referente
				</h1>
			</div>

			<Card className="border-slate-200 dark:border-[#2A3942] dark:bg-[#111B21]">
				<CardHeader>
					<CardTitle className="text-base text-slate-900 dark:text-[#E9EDEF]">
						Imagen pública en el inicio
					</CardTitle>
					<p className="text-sm text-slate-600 dark:text-[#8696A0]">
						Esta es la foto que aparece en el banner &quot;Referente oficial&quot;. También coincide con el
						avatar de la cuenta Mario en el chat.
					</p>
				</CardHeader>
				<CardContent className="flex flex-col items-center gap-6">
					{marioLoading ? (
						<p className="text-sm text-slate-500 dark:text-[#8696A0]">Cargando vista previa…</p>
					) : (
						<div className="relative">
							<Avatar className="h-40 w-40 border-4 border-[#8B0015]/40 shadow-lg">
								<AvatarImage src={previewUrl || undefined} className="object-cover" />
								<AvatarFallback
									className="text-4xl font-bold text-white"
									style={{ backgroundColor: CST.bordo }}
								>
									{(mario?.name ?? 'M')[0]?.toUpperCase() ?? 'M'}
								</AvatarFallback>
							</Avatar>
							<span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-xs text-white backdrop-blur-sm">
								<Camera className="h-3.5 w-3.5" />
								Banner
							</span>
						</div>
					)}

					<div className="flex w-full max-w-xs flex-col gap-2">
						<Button
							type="button"
							className="w-full rounded-xl text-white hover:bg-[#5A000E]"
							style={{ backgroundColor: CST.bordo }}
							disabled={uploading || marioLoading}
							onClick={() => fileInputRef.current?.click()}
						>
							<Upload className="mr-2 h-4 w-4" />
							{uploading ? 'Subiendo…' : 'Elegir y recortar imagen'}
						</Button>
						<Button
							type="button"
							variant="outline"
							className="w-full rounded-xl dark:border-[#2A3942] dark:text-[#E9EDEF]"
							disabled={deleting || !previewUrl}
							onClick={() => void handleDelete()}
						>
							<Trash2 className="mr-2 h-4 w-4" />
							{deleting ? 'Eliminando…' : 'Quitar foto'}
						</Button>
					</div>

					<p className="text-center text-xs text-slate-500 dark:text-[#8696A0]">
						Formatos JPG, PNG o WebP. Máx. 2 MB.{' '}
						<Link href="/admin/settings" className="font-medium underline" style={{ color: CST.bordo }}>
							Los administradores
						</Link>{' '}
						también pueden fijar una URL de respaldo en ajustes.
					</p>
				</CardContent>
			</Card>
		</DashboardLayout>
	)
}
