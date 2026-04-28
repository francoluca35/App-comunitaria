'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp, type PostMediaItem } from '@/app/providers'
import {
	uploadLocalPostMedia,
	isAllowedPostVideoFile,
	type LocalAttachment,
} from '@/lib/upload-post-media'
import { POST_MEDIA_LIMITS } from '@/lib/post-media-limits'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Textarea } from '@/app/components/ui/textarea'
import { Card, CardContent } from '@/app/components/ui/card'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ArrowLeft, Upload, UserSearch, X } from 'lucide-react'
import { toast } from 'sonner'
import { CST } from '@/lib/cst-theme'

const EXTRAVIO_CATEGORY_SLUG = 'extravios'
const criticalRed = '#991B1B'
const ARGENTINA_COUNTRY_PREFIX = '+54'
const DEFAULT_ARGENTINA_PROVINCE_PREFIX = '342' // Santa Fe (Santo Tomé)

const ARGENTINA_PROVINCE_PREFIXES = [
	{ province: 'CABA / AMBA', code: '11' },
	{ province: 'Buenos Aires', code: '221' },
	{ province: 'Catamarca', code: '383' },
	{ province: 'Chaco', code: '362' },
	{ province: 'Chubut', code: '280' },
	{ province: 'Córdoba', code: '351' },
	{ province: 'Corrientes', code: '379' },
	{ province: 'Entre Ríos', code: '343' },
	{ province: 'Formosa', code: '370' },
	{ province: 'Jujuy', code: '388' },
	{ province: 'La Pampa', code: '2954' },
	{ province: 'La Rioja', code: '380' },
	{ province: 'Mendoza', code: '261' },
	{ province: 'Misiones', code: '376' },
	{ province: 'Neuquén', code: '299' },
	{ province: 'Río Negro', code: '2920' },
	{ province: 'Salta', code: '387' },
	{ province: 'San Juan', code: '264' },
	{ province: 'San Luis', code: '266' },
	{ province: 'Santa Cruz', code: '2966' },
	{ province: 'Santa Fe', code: '342' },
	{ province: 'Santiago del Estero', code: '385' },
	{ province: 'Tierra del Fuego', code: '2901' },
	{ province: 'Tucumán', code: '381' },
] as const

export default function CreateExtravioPage() {
	const router = useRouter()
	const { addPost, currentUser, config, postCategories } = useApp()
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [whatsappPrefix, setWhatsappPrefix] = useState(DEFAULT_ARGENTINA_PROVINCE_PREFIX)
	const [whatsappNumber, setWhatsappNumber] = useState('')
	const [attachments, setAttachments] = useState<LocalAttachment[]>([])
	const [sending, setSending] = useState(false)

	const hasExtravioCategory = useMemo(
		() => postCategories.some((c) => c.slug === EXTRAVIO_CATEGORY_SLUG),
		[postCategories]
	)

	const maxImagesAlertas = POST_MEDIA_LIMITS.maxImagesAlertas
	const maxVideosAlertas = POST_MEDIA_LIMITS.maxVideosAlertas

	const handleAttachmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (!files?.length) return
		const list = Array.from(files)
		const { maxImageMbPerFile, maxVideoMbPerFile } = POST_MEDIA_LIMITS
		setAttachments((prev) => {
			const out: LocalAttachment[] = [...prev]
			let imageCount = out.filter((a) => a.kind === 'image').length
			let videoCount = out.filter((a) => a.kind === 'video').length
			for (const f of list) {
				const isImg =
					f.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(f.name)
				const isVid = isAllowedPostVideoFile(f)
				if (!isImg && !isVid) {
					toast.error(`${f.name}: solo fotos o videos (p. ej. MP4, MOV, WebM)`)
					continue
				}
				if (isImg) {
					if (imageCount >= maxImagesAlertas) {
						toast.error(`Máximo ${maxImagesAlertas} fotos por alerta (${maxImageMbPerFile} MB c/u)`)
						continue
					}
					if (f.size > maxImageMbPerFile * 1024 * 1024) {
						toast.error(`${f.name} supera ${maxImageMbPerFile} MB (límite por foto)`)
						continue
					}
					out.push({ file: f, kind: 'image' })
					imageCount++
				} else {
					if (videoCount >= maxVideosAlertas) {
						toast.error(`Máximo ${maxVideosAlertas} videos por alerta`)
						continue
					}
					if (f.size > maxVideoMbPerFile * 1024 * 1024) {
						toast.error(`${f.name} supera ${maxVideoMbPerFile} MB`)
						continue
					}
					out.push({ file: f, kind: 'video' })
					videoCount++
				}
			}
			return out
		})
		e.target.value = ''
	}

	const removeAttachment = (index: number) => {
		setAttachments((prev) => prev.filter((_, i) => i !== index))
	}

	const imageCount = attachments.filter((a) => a.kind === 'image').length
	const videoCount = attachments.filter((a) => a.kind === 'video').length
	const canAddAttachments =
		imageCount < maxImagesAlertas || videoCount < maxVideosAlertas

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!currentUser) {
			toast.error('Debés iniciar sesión')
			router.push('/login')
			return
		}
		if (!hasExtravioCategory) {
			toast.error('Esta categoría no está disponible. Contactá a un administrador.')
			return
		}
		if (!title.trim() || !description.trim()) {
			toast.error('Completá título y descripción')
			return
		}
		const localWaDigits = whatsappNumber.replace(/\D/g, '').replace(/^0+/, '').replace(/^15/, '')
		if (config.whatsappEnabled && !localWaDigits) {
			toast.error('Ingresá el número local de WhatsApp')
			return
		}
		if (config.whatsappEnabled && localWaDigits.length < 6) {
			toast.error('El número de WhatsApp es demasiado corto')
			return
		}
		if (attachments.length === 0) {
			toast.error('Incluí al menos una foto o un video')
			return
		}

		setSending(true)
		try {
			let media: PostMediaItem[] = []
			try {
				media = await uploadLocalPostMedia(currentUser.id, attachments)
			} catch (err) {
				const msg = err instanceof Error ? err.message : 'Error al subir imágenes'
				toast.error(msg)
				return
			}
			const result = await addPost({
				title: title.trim(),
				description: description.trim(),
				category: EXTRAVIO_CATEGORY_SLUG,
				media,
				whatsappNumber: config.whatsappEnabled
					? `${ARGENTINA_COUNTRY_PREFIX}9${whatsappPrefix}${localWaDigits}`
					: undefined,
			})
			if (!result.ok) {
				toast.error(result.error ?? 'Error al enviar')
				return
			}
			if (currentUser.isAdmin) {
				toast.success(
					'Publicación enviada. Todos recibirán aviso prioritario, punto en el icono (donde aplique), y un mensaje de Mario con el enlace.'
				)
			} else {
				toast.success(
					'Envío recibido. Cuando la aprueben el equipo, toda la comunidad será avisada por todos los medios incluidos mensaje de Mario.'
				)
			}
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
						<p className="text-[#2B2B2B] font-medium mb-4">
							Iniciá sesión para publicar una alerta de extravío
						</p>
						<Button
							onClick={() => router.push('/login')}
							style={{ backgroundColor: CST.bordo }}
							className="text-white w-full hover:bg-[#5A000E]"
						>
							Ir a iniciar sesión
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (!hasExtravioCategory && postCategories.length > 0) {
		return (
			<DashboardLayout>
				<div className="mx-auto w-full max-w-3xl">
					<Button variant="ghost" size="icon" onClick={() => router.push('/create')} className="mb-4">
						<ArrowLeft className="w-5 h-5" />
					</Button>
					<Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
						<CardContent className="p-6 text-sm text-amber-950 dark:text-amber-100">
							No está cargada la categoría «Personas extraviadas». Pedile a un administrador que ejecute la última migración en la base de datos.
						</CardContent>
					</Card>
				</div>
			</DashboardLayout>
		)
	}

	return (
		<DashboardLayout>
			<div className="mx-auto w-full max-w-3xl pb-10">
				<div className="flex items-center gap-3 mb-4">
					<Button variant="ghost" size="icon" onClick={() => router.push('/create')}>
						<ArrowLeft className="w-5 h-5" />
					</Button>
					<div>
						<h1 className="text-xl font-bold text-[#8B0015] dark:text-white flex items-center gap-2 font-montserrat-only">
							<UserSearch className="h-6 w-6 shrink-0" style={{ color: criticalRed }} />
							Persona extraviada
						</h1>
						<p className="text-sm text-[#7A5C52] dark:text-gray-400 mt-0.5">
							Máxima prioridad: notificación masiva, mensaje privado desde Mario con el enlace, y refuerzo en la PWA.
						</p>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5 lg:space-y-6">
					<Card
						className="border-2 overflow-hidden"
						style={{
							borderColor: `${criticalRed}55`,
							background: 'linear-gradient(180deg, #FEF2F2 0%, #F4EFEA 100%)',
						}}
					>
						<CardContent className="p-4 text-sm text-[#450A0A] dark:text-red-100 dark:bg-red-950/20">
							<p className="font-semibold mb-1">Solo emergencias reales</p>
							<p className="leading-snug mb-2">
								Esta publicación interrumpe a toda la comunidad y envía un mensaje personal desde Mario. Usala solo si se perdió una persona (niño/a, adulto mayor u otra situación grave).
							</p>
							<p className="text-xs opacity-90">{config.termsOfService}</p>
						</CardContent>
					</Card>

					<div className="space-y-2">
						<Label htmlFor="extravio-title">
							Título <span className="text-red-600">*</span>
						</Label>
						<Input
							id="extravio-title"
							placeholder="Ej: Se perdió … — zona, edad"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							required
							maxLength={100}
						/>
						<p className="text-xs text-[#7A5C52]">{title.length}/100</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="extravio-desc">
							Descripción <span className="text-red-600">*</span>
						</Label>
						<Textarea
							id="extravio-desc"
							placeholder="Datos para reconocer a la persona, última vez vista, teléfono de contacto, pedido de difusión."
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							required
							rows={6}
							maxLength={2000}
							className="resize-y min-h-[140px]"
						/>
						<p className="text-xs text-[#7A5C52]">{description.length}/2000</p>
					</div>

					{config.whatsappEnabled && (
						<div className="space-y-2">
							<Label htmlFor="extravio-whatsapp-local">
								WhatsApp de contacto <span className="text-red-600">*</span>
							</Label>
							<div className="space-y-1.5">
								<Label htmlFor="extravio-whatsapp-province" className="text-xs font-normal text-[#7A5C52]">
									Zona / prefijo (por defecto Santa Fe — Santo Tomé)
								</Label>
								<select
									id="extravio-whatsapp-province"
									value={whatsappPrefix}
									onChange={(e) => setWhatsappPrefix(e.target.value)}
									className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								>
									{ARGENTINA_PROVINCE_PREFIXES.map((item) => (
										<option key={item.province} value={item.code}>
											{item.province} ({item.code})
										</option>
									))}
								</select>
							</div>
							<div className="flex min-h-10 w-full overflow-hidden rounded-md border border-input bg-background shadow-sm ring-offset-background focus-within:ring-2 focus-within:ring-[#8B0015]/25 focus-within:ring-offset-2">
								<span
									className="flex shrink-0 items-center border-r border-input bg-muted/50 px-3 py-2 text-sm tabular-nums text-[#2B2B2B] select-none"
									aria-hidden
								>
									{ARGENTINA_COUNTRY_PREFIX} 9 {whatsappPrefix}
								</span>
								<Input
									id="extravio-whatsapp-local"
									type="tel"
									placeholder="solo tu número"
									value={whatsappNumber}
									onChange={(e) => setWhatsappNumber(e.target.value)}
									required
									inputMode="tel"
									autoComplete="tel-national"
									className="min-w-0 flex-1 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none h-10"
									aria-describedby="extravio-whatsapp-hint"
								/>
							</div>
							<p id="extravio-whatsapp-hint" className="text-xs text-[#7A5C52]">
								El prefijo ya está fijo a la izquierda: solo completá tu número local (sin 0 ni 15 al inicio). Se
								guarda como {ARGENTINA_COUNTRY_PREFIX} 9 {whatsappPrefix} + lo que escribas. Va a la publicación y al
								mensaje de Mario.
							</p>
						</div>
					)}

					<div className="space-y-2">
						<Label>
							Fotos o videos <span className="text-red-600">*</span>
						</Label>
						<p className="text-xs text-[#7A5C52]">
							Hasta {maxImagesAlertas} fotos ({POST_MEDIA_LIMITS.maxImageMbPerFile} MB c/u) y hasta {maxVideosAlertas}{' '}
							videos ({POST_MEDIA_LIMITS.maxVideoMbPerFile} MB c/u).
						</p>
						{attachments.length > 0 && (
							<div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
								{attachments.map((att, index) => (
									<div
										key={`${att.file.name}-${index}`}
										className="relative aspect-square rounded-xl overflow-hidden border border-[#D8D2CC] bg-black/5"
									>
										{att.kind === 'video' ? (
											<video
												src={URL.createObjectURL(att.file)}
												className="h-full w-full object-cover"
												muted
												playsInline
											/>
										) : (
											/* eslint-disable-next-line @next/next/no-img-element */
											<img
												src={URL.createObjectURL(att.file)}
												alt=""
												className="h-full w-full object-cover"
											/>
										)}
										<button
											type="button"
											onClick={() => removeAttachment(index)}
											className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
											aria-label="Quitar archivo"
										>
											<X className="h-4 w-4" />
										</button>
									</div>
								))}
							</div>
						)}
						{canAddAttachments && (
							<label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#D8D2CC] bg-white py-10 cursor-pointer transition-colors hover:border-[#8B0015] dark:bg-gray-900/40">
								<Upload className="h-8 w-8 text-[#7A5C52]/70" />
								<span className="text-sm font-medium text-[#2B2B2B]">
									Tocá para agregar ({imageCount}/{maxImagesAlertas} fotos · {videoCount}/{maxVideosAlertas}{' '}
									videos)
								</span>
								<input
									type="file"
									accept="image/*,video/*,.mp4,.mov,.webm,.m4v,.3gp,.3g2"
									multiple
									className="sr-only"
									onChange={handleAttachmentsChange}
								/>
							</label>
						)}
					</div>

					<Button
						type="submit"
						disabled={sending}
						className="w-full text-white font-semibold hover:bg-[#5A000E]"
						style={{ backgroundColor: criticalRed }}
					>
						{sending ? 'Enviando…' : 'Enviar alerta de extravío'}
					</Button>
				</form>
			</div>
		</DashboardLayout>
	)
}
