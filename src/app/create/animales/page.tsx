'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp, type PostMediaItem } from '@/app/providers'
import {
  uploadLocalPostMedia,
  isAllowedPostVideoFile,
  type LocalAttachment,
} from '@/lib/upload-post-media'
import { POST_MEDIA_LIMITS } from '@/lib/post-media-limits'
import {
  buildAnimalesDescription,
  buildAnimalesTitle,
  formatFechaAR,
  referentFirstName,
  type AnimalCaso,
} from '@/lib/animales-template'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent } from '@/app/components/ui/card'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ArrowLeft, AlertCircle, Dog, Search, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/app/components/ui/utils'
import { CST } from '@/lib/cst-theme'

function todayIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function CreateAnimalesPage() {
  const router = useRouter()
  const { addPost, currentUser, config, postCategories } = useApp()
  const [caso, setCaso] = useState<AnimalCaso>('encontrado')
  const [ubicacion, setUbicacion] = useState('')
  const [fechaIso, setFechaIso] = useState(todayIsoDate)
  const [telefono, setTelefono] = useState('')
  const [attachmentFiles, setAttachmentFiles] = useState<LocalAttachment[]>([])
  const [sending, setSending] = useState(false)

  const mascotasSlug = useMemo(() => {
    if (postCategories.some((c) => c.slug === 'mascotas')) return 'mascotas'
    return postCategories[0]?.slug ?? ''
  }, [postCategories])

  const nombreReferente = referentFirstName(config.heroReferentName || 'Mario')

  const previewDescription = useMemo(
    () =>
      ubicacion.trim() && telefono.trim()
        ? buildAnimalesDescription({
            caso,
            referente: nombreReferente,
            ubicacion: ubicacion.trim(),
            fechaIso,
            telefono: telefono.trim(),
          })
        : null,
    [caso, nombreReferente, ubicacion, fechaIso, telefono]
  )

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const list = Array.from(files)
    setAttachmentFiles((prev) => {
      const out: LocalAttachment[] = [...prev]
      let imageCount = out.filter((a) => a.kind === 'image').length
      let videoCount = out.filter((a) => a.kind === 'video').length
      const { maxImagesPerPost, maxImageMbPerFile, maxVideosPerPost, maxVideoMbPerFile } = POST_MEDIA_LIMITS
      for (const f of list) {
        const isImg = f.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(f.name)
        const isVid = isAllowedPostVideoFile(f)
        if (!isImg && !isVid) {
          toast.error(`${f.name}: solo fotos o videos (p. ej. MP4, MOV, WebM)`)
          continue
        }
        if (isImg) {
          if (imageCount >= maxImagesPerPost) {
            toast.error(`Máximo ${maxImagesPerPost} fotos (${maxImageMbPerFile} MB c/u)`)
            break
          }
          if (f.size > maxImageMbPerFile * 1024 * 1024) {
            toast.error(`${f.name} supera ${maxImageMbPerFile} MB (límite por foto)`)
            continue
          }
          out.push({ file: f, kind: 'image' })
          imageCount++
        } else {
          if (videoCount >= maxVideosPerPost) {
            toast.error(`Máximo ${maxVideosPerPost} videos por publicación`)
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
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const imageAttachmentCount = attachmentFiles.filter((a) => a.kind === 'image').length
  const videoAttachmentCount = attachmentFiles.filter((a) => a.kind === 'video').length
  const canAddAttachments =
    imageAttachmentCount < POST_MEDIA_LIMITS.maxImagesPerPost ||
    videoAttachmentCount < POST_MEDIA_LIMITS.maxVideosPerPost

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      toast.error('Iniciá sesión para publicar')
      router.push('/login')
      return
    }
    if (!mascotasSlug) {
      toast.error('No hay categoría de mascotas disponible')
      return
    }
    if (!ubicacion.trim()) {
      toast.error('Indicá en qué calle o zona fue')
      return
    }
    if (!telefono.trim()) {
      toast.error('Indicá un teléfono de contacto')
      return
    }
    if (attachmentFiles.length === 0) {
      toast.error('Agregá al menos una foto o un video de la mascota')
      return
    }

    const title = buildAnimalesTitle(caso, ubicacion)
    const description = buildAnimalesDescription({
      caso,
      referente: nombreReferente,
      ubicacion: ubicacion.trim(),
      fechaIso,
      telefono: telefono.trim(),
    })

    setSending(true)
    try {
      let media: PostMediaItem[] = []
      try {
        media = await uploadLocalPostMedia(currentUser.id, attachmentFiles)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al subir archivos'
        toast.error(msg)
        return
      }
      const result = await addPost({
        title,
        description,
        category: mascotasSlug,
        media,
        whatsappNumber: config.whatsappEnabled ? telefono.trim() : undefined,
      })
      if (!result.ok) {
        toast.error(result.error ?? 'Error al enviar')
        return
      }
      toast.success('Listo. Tu aviso fue enviado para revisión.')
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
            <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#2C241C] mb-2">Iniciá sesión</h2>
            <p className="text-[#6B5F54] mb-4">Necesitás una cuenta para avisar sobre mascotas.</p>
            <Button onClick={() => router.push('/login')} style={{ backgroundColor: CST.bordo }} className="text-white hover:bg-[#5A000E]">
              Iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!mascotasSlug) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto p-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/create')} className="mb-4">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 text-sm text-amber-950">
              No está disponible la categoría <strong>Mascotas</strong> en el sistema. Volvé al inicio de publicar o
              contactá al administrador.
            </CardContent>
          </Card>
          <Button className="mt-4 w-full" variant="outline" asChild>
            <Link href="/create">Volver</Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto pb-8">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/create')} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-[#2C241C]">Mascotas</h1>
            <p className="text-sm text-[#6B5F54]">Solo completá lo que falta y subí la foto</p>
          </div>
        </div>

        <Card className="mb-4 border-[#D8D2CC] bg-[#F4EFEA]">
          <CardContent className="p-4 text-sm text-[#5C3D2E]">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-700" />
              <div>
                <p className="font-medium">Se revisa antes de publicarse</p>
                <p className="text-xs mt-1 text-[#6B5F54]">{config.termsOfService}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setCaso('encontrado')}
            className={cn(
              'flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all',
              caso === 'encontrado'
                ? 'border-[#8B0015] bg-white shadow-md ring-2 ring-[#8B0015]/20'
                : 'border-[#D8D2CC] bg-white hover:border-[#8B0015]/35'
            )}
          >
            <Search className="h-10 w-10 text-[#8B0015]" />
            <span className="text-sm font-bold text-[#2C241C]">Encontré</span>
            <span className="text-[10px] text-center text-[#6B5F54] leading-tight">Buscar dueño</span>
          </button>
          <button
            type="button"
            onClick={() => setCaso('perdido')}
            className={cn(
              'flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all',
              caso === 'perdido'
                ? 'border-[#7A5C52] bg-white shadow-md ring-2 ring-[#7A5C52]/22'
                : 'border-[#D8D2CC] bg-white hover:border-[#7A5C52]/45'
            )}
          >
            <Dog className="h-10 w-10 text-[#7A5C52]" />
            <span className="text-sm font-bold text-[#2C241C]">Perdí</span>
            <span className="text-[10px] text-center text-[#6B5F54] leading-tight">Pedir ayuda</span>
          </button>
        </div>

        <Card className="mb-6 border-[#D8D2CC] bg-white">
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[#9A8F84] mb-2">Texto que se envía</p>
            {previewDescription ? (
              <p className="text-sm leading-relaxed text-[#2C241C] whitespace-pre-wrap">{previewDescription}</p>
            ) : (
              <p className="text-sm text-[#6B5F54]">
                Completá calle o barrio, fecha y teléfono para ver el mensaje listo para enviar a {nombreReferente}.
              </p>
            )}
            {fechaIso && (
              <p className="text-[11px] text-[#9A8F84] mt-2">Fecha en el aviso: {formatFechaAR(fechaIso)}</p>
            )}
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="ubicacion" className="text-[#2C241C]">
              ¿En qué calle o zona? <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ubicacion"
              placeholder="Ej: Balcarce y Mitre"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              className="rounded-xl border-2 border-[#D8D2CC] h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha" className="text-[#2C241C]">
              Fecha <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fecha"
              type="date"
              value={fechaIso}
              onChange={(e) => setFechaIso(e.target.value)}
              className="rounded-xl border-2 border-[#D8D2CC] h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tel" className="text-[#2C241C]">
              Teléfono para que te llamen <span className="text-red-500">*</span>
            </Label>
            <Input
              id="tel"
              type="tel"
              inputMode="tel"
              placeholder="Ej: 11 1234-5678"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="rounded-xl border-2 border-[#D8D2CC] h-12 text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#2C241C]">
              Fotos o videos de la mascota <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-[#6B5F54]">
              Hasta {POST_MEDIA_LIMITS.maxImagesPerPost} fotos ({POST_MEDIA_LIMITS.maxImageMbPerFile} MB c/u, hasta{' '}
              {POST_MEDIA_LIMITS.maxImagesPerPost * POST_MEDIA_LIMITS.maxImageMbPerFile} MB en total) y hasta{' '}
              {POST_MEDIA_LIMITS.maxVideosPerPost} videos; las fotos se comprimen al subir.
            </p>
            {attachmentFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {attachmentFiles.map((att, index) => (
                  <div
                    key={`${att.file.name}-${index}`}
                    className="relative aspect-square rounded-xl overflow-hidden bg-[#D8D2CC]/30"
                  >
                    {att.kind === 'video' ? (
                      <video
                        src={URL.createObjectURL(att.file)}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <img src={URL.createObjectURL(att.file)} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="absolute top-1 right-1 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center"
                      aria-label="Quitar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {canAddAttachments && (
              <label className="block border-2 border-dashed border-[#D8D2CC] rounded-2xl p-8 text-center cursor-pointer bg-white hover:border-[#8B0015] transition-colors">
                <input
                  type="file"
                  accept="image/*,video/*,.mp4,.mov,.webm,.m4v,.3gp,.3g2"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentChange}
                />
                <Upload className="w-10 h-10 text-[#8B0015] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#2C241C]">Tocá para subir fotos o videos</p>
                <p className="text-xs text-[#6B5F54] mt-1">
                  Fotos hasta {POST_MEDIA_LIMITS.maxImageMbPerFile} MB c/u; videos hasta{' '}
                  {POST_MEDIA_LIMITS.maxVideoMbPerFile} MB.
                </p>
              </label>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-14 rounded-2xl text-base font-bold text-white shadow-md hover:bg-[#5A000E]"
            style={{ backgroundColor: CST.bordo }}
            disabled={sending}
          >
            {sending ? 'Enviando…' : 'Enviar aviso'}
          </Button>

          <Button variant="outline" type="button" className="w-full rounded-2xl border-[#D8D2CC]" asChild>
            <Link href="/create">Volver a elegir tipo de publicación</Link>
          </Button>
        </form>
      </div>
    </DashboardLayout>
  )
}
