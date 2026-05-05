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
import { Card, CardContent } from '@/app/components/ui/card'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PrefixedDescriptionField } from '@/components/PrefixedDescriptionField'
import { ArrowLeft, AlertTriangle, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { CST } from '@/lib/cst-theme'
import {
  ensureDefaultDescriptionPrefix,
  isDescriptionOnlyDefaultPrefix,
} from '@/lib/default-description-prefix'

const ALERT_CATEGORY_SLUG = 'alertas'
const alertRed = '#B91C1C'

export default function CreateAlertaPage() {
  const router = useRouter()
  const { addPost, currentUser, config, postCategories } = useApp()
  const [title, setTitle] = useState('')
  const [descriptionRest, setDescriptionRest] = useState('')
  const [attachments, setAttachments] = useState<LocalAttachment[]>([])
  const [sending, setSending] = useState(false)

  const hasAlertCategory = useMemo(
    () => postCategories.some((c) => c.slug === ALERT_CATEGORY_SLUG),
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
    if (!hasAlertCategory) {
      toast.error('La categoría de alertas no está disponible. Contactá a un administrador.')
      return
    }
    if (!title.trim() || isDescriptionOnlyDefaultPrefix(descriptionRest)) {
      toast.error('Completá título y descripción')
      return
    }
    if (attachments.length === 0) {
      toast.error('La alerta debe incluir al menos una foto o un video')
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
        description: ensureDefaultDescriptionPrefix(descriptionRest),
        category: ALERT_CATEGORY_SLUG,
        media,
      })
      if (!result.ok) {
        toast.error(result.error ?? 'Error al enviar')
        return
      }
      if (currentUser.isAdmin) {
        toast.success('Alerta publicada. La comunidad recibió notificación con aviso sonoro y vibración.')
      } else {
        toast.success(
          'Alerta enviada a moderación. Cuando la aprueben, todos recibirán una notificación prioritaria (sonido y vibración).'
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
            <p className="text-[#2B2B2B] font-medium mb-4">Iniciá sesión para publicar una alerta</p>
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

  if (!hasAlertCategory && postCategories.length > 0) {
    return (
      <DashboardLayout>
        <div className="mx-auto w-full max-w-3xl">
          <Button variant="ghost" size="icon" onClick={() => router.push('/create')} className="mb-4">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="p-6 text-sm text-amber-950 dark:text-amber-100">
              No está configurada la categoría «alertas» en el sistema. Pedile a un administrador que verifique las
              categorías de publicaciones.
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
              <AlertTriangle className="h-6 w-6 shrink-0" style={{ color: alertRed }} />
              Nueva alerta
            </h1>
            <p className="text-sm text-[#7A5C52] dark:text-gray-400 mt-0.5">
              Siempre es prioritaria: aviso con sonido y vibración para toda la comunidad cuando esté aprobada.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-6">
          <Card
            className="border-2 overflow-hidden"
            style={{ borderColor: `${alertRed}55`, background: 'linear-gradient(180deg, #FEF2F2 0%, #F4EFEA 100%)' }}
          >
            <CardContent className="p-4 text-sm text-[#450A0A] dark:text-red-100 dark:bg-red-950/20">
              <p className="font-semibold mb-1">Uso responsable</p>
              <p className="leading-snug mb-2">
                Las alertas son para situaciones importantes (seguridad, emergencias, riesgos). Serán revisadas antes de
                publicarse si no sos administrador.
              </p>
              <p className="text-xs opacity-90">{config.termsOfService}</p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="alert-title">
              Título <span className="text-red-600">*</span>
            </Label>
            <Input
              id="alert-title"
              placeholder="Ej: Corte de calle / Precaución zona norte"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
            />
            <p className="text-xs text-[#7A5C52]">{title.length}/100</p>
          </div>

          <PrefixedDescriptionField
            id="alert-desc"
            label={
              <>
                Descripción <span className="text-red-600">*</span>
              </>
            }
            value={descriptionRest}
            onChange={setDescriptionRest}
            placeholder="Qué pasó, dónde, cuándo y qué hacer o a quién avisar."
            maxTotalLength={2000}
            rows={5}
            textareaClassName="min-h-[120px] flex-1 resize-y rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            className="space-y-2 [&_p]:text-[#7A5C52]"
          />

          <div className="space-y-2">
            <Label>
              Fotos o videos <span className="text-red-600">*</span>
            </Label>
            <p className="text-xs text-[#7A5C52]">
              Hasta {maxImagesAlertas} fotos ({POST_MEDIA_LIMITS.maxImageMbPerFile} MB c/u) y hasta {maxVideosAlertas}{' '}
              videos ({POST_MEDIA_LIMITS.maxVideoMbPerFile} MB c/u); las fotos se optimizan al enviar.
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
                  Tocá para agregar ({imageCount}/{maxImagesAlertas} fotos · {videoCount}/{maxVideosAlertas} videos)
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
            style={{ backgroundColor: CST.bordo }}
          >
            {sending ? 'Enviando…' : 'Enviar alerta'}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  )
}
