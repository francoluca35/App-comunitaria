'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp, type PostMediaItem } from '@/app/providers'
import { uploadVentaImage } from '@/lib/upload-venta-image'
import { MEDIA_UPLOAD_LIMITS } from '@/lib/media-upload-limits'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Textarea } from '@/app/components/ui/textarea'
import { Card, CardContent } from '@/app/components/ui/card'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ArrowLeft, AlertCircle, ShoppingBag, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { CST } from '@/lib/cst-theme'

const VENTA_SLUG = 'venta'

export default function CreateVentaPage() {
	const router = useRouter()
	const { addPost, currentUser, postCategories } = useApp()
	const [subcategory, setSubcategory] = useState('')
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [price, setPrice] = useState('')
	const [imageFile, setImageFile] = useState<File | null>(null)
	const [imagePreview, setImagePreview] = useState<string | null>(null)
	const [sending, setSending] = useState(false)

	const ventaAvailable = useMemo(
		() => postCategories.some((c) => c.slug === VENTA_SLUG),
		[postCategories]
	)

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0]
		e.target.value = ''
		if (!f) return
		if (!f.type.startsWith('image/')) {
			toast.error('Elegí una imagen (JPG, PNG, WebP…)')
			return
		}
		if (f.size > MEDIA_UPLOAD_LIMITS.maxImageInputBytes) {
			toast.error(`La imagen supera ${MEDIA_UPLOAD_LIMITS.maxImageInputMbLabel}`)
			return
		}
		if (imagePreview) URL.revokeObjectURL(imagePreview)
		setImageFile(f)
		setImagePreview(URL.createObjectURL(f))
	}

	const clearImage = () => {
		if (imagePreview) URL.revokeObjectURL(imagePreview)
		setImageFile(null)
		setImagePreview(null)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!currentUser) {
			toast.error('Iniciá sesión para publicar')
			router.push('/login')
			return
		}
		if (!ventaAvailable) {
			toast.error('La categoría Venta aún no está disponible en el servidor')
			return
		}
		const sub = subcategory.trim()
		const tit = title.trim()
		const desc = description.trim()
		const pr = price.trim()
		if (sub.length < 2) {
			toast.error('Escribí una subcategoría (al menos 2 letras), por ejemplo: Ropa, Muebles, Autos…')
			return
		}
		if (!tit) {
			toast.error('Completá el título')
			return
		}
		if (!desc) {
			toast.error('Completá la descripción')
			return
		}
		if (!pr) {
			toast.error('Indicá el precio (podés poner "Consultar" si preferís)')
			return
		}
		if (!imageFile) {
			toast.error('Agregá una foto del producto (máx. 1 MB al subir)')
			return
		}

		setSending(true)
		try {
			let media: PostMediaItem[] = []
			try {
				const item = await uploadVentaImage(currentUser.id, imageFile)
				media = [item]
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'No se pudo subir la imagen')
				return
			}
			const result = await addPost({
				title: tit,
				description: desc,
				category: VENTA_SLUG,
				saleSubcategory: sub,
				salePrice: pr,
				media,
			})
			if (!result.ok) {
				toast.error(result.error ?? 'Error al enviar')
				return
			}
			toast.success(
				'Publicación enviada. Un moderador puede pedirte por mensaje privado más fotos o detalles antes de aprobarla.'
			)
			router.push('/')
		} finally {
			setSending(false)
		}
	}

	if (!currentUser) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: CST.fondo }}>
				<Card className="max-w-md w-full border-[#D8D2CC]">
					<CardContent className="p-6 text-center">
						<p className="text-[#2B2B2B] font-medium mb-4">Iniciá sesión para publicar</p>
						<Button onClick={() => router.push('/login')} style={{ backgroundColor: CST.bordo }} className="text-white w-full">
							Ir a iniciar sesión
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<DashboardLayout>
			<div className="mx-auto w-full max-w-2xl">
				<div className="mb-6 flex items-center gap-3">
					<Button variant="ghost" size="icon" onClick={() => router.push('/create')}>
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<div className="flex items-center gap-2">
						<ShoppingBag className="h-6 w-6 text-[#8B0015]" />
						<h1 className="text-xl font-bold text-slate-900 dark:text-white">Publicar venta</h1>
					</div>
				</div>

				<form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
					<Card className="border-[#8B0015]/25 bg-[#8B0015]/10 dark:border-[#8B0015]/50 dark:bg-[#8B0015]/20">
						<CardContent className="flex gap-3 p-4 text-sm text-[#5A000E] dark:text-[#F3C9D0]">
							<AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
							<p>
								Tu aviso queda pendiente de moderación. El equipo puede escribirte por mensaje privado para
								pedirte más fotos o detalles del producto antes de publicarlo en el feed.
							</p>
						</CardContent>
					</Card>

					<div className="space-y-2">
						<Label htmlFor="venta-sub">
							Subcategoría <span className="text-red-500">*</span>
						</Label>
						<Input
							id="venta-sub"
							value={subcategory}
							onChange={(e) => setSubcategory(e.target.value)}
							placeholder="Ej.: Electrónica, Ropa, Herramientas, Autos…"
							maxLength={60}
							autoComplete="off"
						/>
						<p className="text-xs text-slate-500 dark:text-slate-400">La definís vos: ayuda a ordenar las ventas en la comunidad.</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="venta-title">
							Título <span className="text-red-500">*</span>
						</Label>
						<Input
							id="venta-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Ej.: Bicicleta rodado 26"
							maxLength={100}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="venta-desc">
							Descripción <span className="text-red-500">*</span>
						</Label>
						<Textarea
							id="venta-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Estado, marca, zona de retiro, formas de pago…"
							rows={5}
							maxLength={1200}
							className="min-h-[120px] resize-y"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="venta-price">
							Precio <span className="text-red-500">*</span>
						</Label>
						<Input
							id="venta-price"
							value={price}
							onChange={(e) => setPrice(e.target.value)}
							placeholder='Ej.: $ 45.000, USD 50, "Consultar"'
							maxLength={80}
						/>
					</div>

					<div className="space-y-2">
						<Label>
							Foto <span className="text-red-500">*</span>
						</Label>
						{imagePreview ? (
							<div className="relative aspect-square max-w-xs overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={imagePreview} alt="Vista previa" className="h-full w-full object-cover" />
								<button
									type="button"
									className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
									onClick={clearImage}
									aria-label="Quitar foto"
								>
									<X className="h-4 w-4" />
								</button>
							</div>
						) : (
							<label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center transition-colors hover:border-[#8B0015] dark:border-slate-600">
								<input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
								<Upload className="mb-2 h-8 w-8 text-slate-400" />
								<p className="text-sm text-slate-600 dark:text-slate-400">
									Una imagen, hasta {MEDIA_UPLOAD_LIMITS.maxImageInputMbLabel} (se optimiza a{' '}
									{MEDIA_UPLOAD_LIMITS.ventaMaxStoredMbLabel})
								</p>
							</label>
						)}
					</div>

					<Button type="submit" className="w-full" size="lg" disabled={sending || !ventaAvailable}>
						{sending ? 'Enviando…' : 'Enviar para moderación'}
					</Button>
				</form>
			</div>
		</DashboardLayout>
	)
}
