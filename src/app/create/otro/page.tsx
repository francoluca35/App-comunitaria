'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useApp, type Category, type PostMediaItem } from '@/app/providers'
import {
  uploadLocalPostMedia,
  isAllowedPostVideoFile,
  type LocalAttachment,
} from '@/lib/upload-post-media'
import { POST_MEDIA_LIMITS } from '@/lib/post-media-limits'
import { cn } from '@/app/components/ui/utils'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Textarea } from '@/app/components/ui/textarea'
import { Card, CardContent } from '@/app/components/ui/card'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ArrowLeft, AlertCircle, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

const OBJETO_TIPOS = [
  { value: 'perdi', label: 'Perdí' },
  { value: 'encontre', label: 'Encontré' },
  { value: 'vendo', label: 'Vendo' },
  { value: 'regalo', label: 'Regalo' },
] as const

type ObjetoTipo = (typeof OBJETO_TIPOS)[number]['value']

/** Texto principal de la publicación (obligatorio vía campos); notas extra van aparte. */
function buildObjetoTextoPublicacion(
  tipo: ObjetoTipo,
  cosa: string,
  lugar: string,
  dia: string
): string | null {
  const c = cosa.trim()
  const l = lugar.trim()
  const d = dia.trim()
  if (tipo === 'perdi') {
    if (!c || !l || !d) return null
    return `Perdí "${c}", en ${l}, el día ${d}.`
  }
  if (tipo === 'encontre') {
    if (!c || !l || !d) return null
    return `Encontré "${c}", en ${l}, el día ${d}.`
  }
  if (tipo === 'vendo') {
    if (!c) return null
    return `Vendo ${c}. Comunicate por WhatsApp o dejá un comentario.`
  }
  if (tipo === 'regalo') {
    if (!c) return null
    return `Regalo ${c}. Comunicate por WhatsApp o dejá un comentario.`
  }
  return null
}

function CreateOtroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetCategoryRaw = searchParams.get('categoria')
  const presetFromUrl = (presetCategoryRaw || '').trim()
  const { addPost, currentUser, config, postCategories } = useApp()

  /** URL trae categoría (hub) y no es alerta (alerta tiene flujo propio). */
  const wantsLockedCategory = Boolean(presetFromUrl) && presetFromUrl !== 'alertas'
  const presetIsValidSlug =
    postCategories.length > 0 && postCategories.some((c) => c.slug === presetFromUrl)
  /** Mostrar categoría fija: hub con ?categoria= o aún cargando lista (evita mostrar el selector un momento). */
  const categoryLocked = wantsLockedCategory && (postCategories.length === 0 || presetIsValidSlug)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [proposedCategoryLabel, setProposedCategoryLabel] = useState('')
  const [category, setCategory] = useState<Category>(() =>
    wantsLockedCategory ? (presetFromUrl as Category) : 'propuesta'
  )
  const [objetoTipo, setObjetoTipo] = useState<ObjetoTipo | ''>('')
  const [objetoCosa, setObjetoCosa] = useState('')
  const [objetoLugar, setObjetoLugar] = useState('')
  const [objetoDia, setObjetoDia] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [attachmentFiles, setAttachmentFiles] = useState<LocalAttachment[]>([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (categoryLocked) {
      if (postCategories.length === 0) {
        setCategory(presetFromUrl as Category)
        return
      }
      if (presetIsValidSlug) setCategory(presetFromUrl as Category)
      return
    }
    setCategory('propuesta')
  }, [categoryLocked, postCategories.length, presetFromUrl, presetIsValidSlug])

  const categoryLabel =
    postCategories.find((c) => c.slug === category)?.label ??
    (wantsLockedCategory ? presetFromUrl.replace(/-/g, ' ') : category)
  const isObjetos = category === 'objetos'
  const isAvisoONoticia = category === 'avisos' || category === 'noticias'
  const isProposedCategoryFlow = !categoryLocked

  const objetoTextoGenerado = useMemo(() => {
    if (!isObjetos || !objetoTipo) return null
    return buildObjetoTextoPublicacion(objetoTipo, objetoCosa, objetoLugar, objetoDia)
  }, [isObjetos, objetoTipo, objetoCosa, objetoLugar, objetoDia])

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
            toast.error(`Máximo ${maxImagesPerPost} fotos por publicación (${maxImageMbPerFile} MB c/u)`)
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
      toast.error('Debes iniciar sesión para crear publicaciones')
      router.push('/login')
      return
    }

    if (!category) {
      toast.error('Falta la categoría')
      return
    }
    if (category === 'propuesta') {
      const label = proposedCategoryLabel.trim()
      if (label.length < 2) {
        toast.error('Escribí el nombre de la categoría que te gustaría (al menos 2 letras)')
        return
      }
      if (!postCategories.some((c) => c.slug === 'propuesta')) {
        toast.error('Esta función aún no está disponible: ejecutá la migración SQL en Supabase (propuesta + proposed_category_label).')
        return
      }
    } else if (!postCategories.some((c) => c.slug === category)) {
      toast.error('Categoría no válida')
      return
    }

    if (category === 'objetos') {
      if (!objetoTipo) {
        toast.error('Elegí con un botón: Perdí, Encontré, Vendo o Regalo')
        return
      }
      const base = buildObjetoTextoPublicacion(objetoTipo, objetoCosa, objetoLugar, objetoDia)
      if (!base) {
        if (objetoTipo === 'perdi' || objetoTipo === 'encontre') {
          toast.error('Completá qué es, dónde y qué día')
        } else {
          toast.error('Escribí qué vendés o qué regalás')
        }
        return
      }
    } else {
      if (!title.trim() || !description.trim()) {
        toast.error('Completa título y descripción')
        return
      }
    }

    if (isAvisoONoticia && attachmentFiles.length === 0) {
      toast.error('Agregá al menos una foto o un video')
      return
    }
    if (isAvisoONoticia && config.whatsappEnabled && !whatsappNumber.trim()) {
      toast.error('Ingresá un número de WhatsApp')
      return
    }

    const tipoLabel =
      category === 'objetos' && objetoTipo
        ? (OBJETO_TIPOS.find((t) => t.value === objetoTipo)?.label ?? objetoTipo)
        : ''
    const titleToSend =
      category === 'objetos' && objetoTipo
        ? `${tipoLabel} — ${objetoCosa.trim()}`
        : title.trim()

    const descriptionToSend =
      category === 'objetos' && objetoTipo
        ? (() => {
            const base = buildObjetoTextoPublicacion(objetoTipo, objetoCosa, objetoLugar, objetoDia) ?? ''
            const extra = description.trim()
            return extra ? `${base}\n\n${extra}` : base
          })()
        : description.trim()

    setSending(true)
    try {
      let media: PostMediaItem[] = []
      if (attachmentFiles.length > 0 && currentUser) {
        try {
          media = await uploadLocalPostMedia(currentUser.id, attachmentFiles)
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error al subir archivos'
          toast.error(msg)
          return
        }
      }
      const result = await addPost({
        title: titleToSend,
        description: descriptionToSend,
        category,
        proposedCategoryLabel:
          category === 'propuesta' ? proposedCategoryLabel.trim() : undefined,
        media,
        whatsappNumber: whatsappNumber.trim() || undefined,
      })
      if (!result.ok) {
        toast.error(result.error ?? 'Error al enviar')
        return
      }
      toast.success(
        category === 'propuesta'
          ? 'Enviado. Si un moderador aprueba, se creará la categoría que pediste y tu publicación quedará ahí.'
          : 'Publicación enviada. Será revisada por un administrador.'
      )
      router.push('/')
    } finally {
      setSending(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl mb-2">Inicia sesión</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Debes iniciar sesión para crear publicaciones</p>
            <Button onClick={() => router.push('/login')}>Iniciar Sesión</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/create')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {categoryLocked ? categoryLabel : 'Nueva categoría y publicación'}
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-300">
                  <p className="mb-1">
                    {isProposedCategoryFlow
                      ? 'Escribí cómo te gustaría que se llame la categoría y el contenido. Si un moderador aprueba, se crea esa categoría en la comunidad y tu aviso queda publicado ahí.'
                      : 'Tu publicación será revisada por un administrador antes de hacerse pública.'}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">{config.termsOfService}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {categoryLocked ? (
            <div className="space-y-2">
              <Label>Categoría</Label>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
                {categoryLabel}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="proposed-category">
                ¿Cómo te gustaría que se llame la categoría? <span className="text-red-500">*</span>
              </Label>
              <Input
                id="proposed-category"
                value={proposedCategoryLabel}
                onChange={(e) => setProposedCategoryLabel(e.target.value)}
                placeholder="Ej.: Feria americana, Trueque, Eventos del barrio…"
                maxLength={80}
                autoComplete="off"
              />
              <p className="text-xs text-slate-600 dark:text-slate-400">
                No elijas de una lista: proponé un nombre. Si la moderación lo acepta, queda como categoría nueva para
                todos.
              </p>
            </div>
          )}

          {isObjetos && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-base font-semibold text-slate-900 dark:text-white">
                  ¿Qué tipo de publicación es? <span className="text-red-500">*</span>
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Tocá una opción</p>
                <div className="grid grid-cols-2 gap-3">
                  {OBJETO_TIPOS.map((t) => {
                    const selected = objetoTipo === t.value
                    return (
                      <button
                        key={t.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          setObjetoTipo(t.value)
                          if (t.value === 'vendo' || t.value === 'regalo') {
                            setObjetoLugar('')
                            setObjetoDia('')
                          }
                        }}
                        className={cn(
                          'min-h-[3.25rem] rounded-xl border-2 px-3 py-3 text-center text-base font-bold leading-tight shadow-sm transition-colors',
                          selected
                            ? 'border-[#8B0015] bg-[#8B0015] text-white ring-2 ring-[#8B0015]/30'
                            : 'border-slate-300 bg-white text-slate-800 hover:border-[#8B0015]/50 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
                        )}
                      >
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {(objetoTipo === 'perdi' || objetoTipo === 'encontre') && (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="space-y-2">
                    <Label htmlFor="objeto-cosa">
                      {objetoTipo === 'perdi' ? '¿Qué se perdió?' : '¿Qué encontraste?'} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="objeto-cosa"
                      value={objetoCosa}
                      onChange={(e) => setObjetoCosa(e.target.value)}
                      placeholder={objetoTipo === 'perdi' ? 'Ej.: llaves, billetera, mascota…' : 'Ej.: bici, documento…'}
                      maxLength={85}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="objeto-lugar">
                      ¿En qué calle o lugar? <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="objeto-lugar"
                      value={objetoLugar}
                      onChange={(e) => setObjetoLugar(e.target.value)}
                      placeholder="Calle, barrio, comercio…"
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="objeto-dia">
                      ¿Qué día? <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="objeto-dia"
                      value={objetoDia}
                      onChange={(e) => setObjetoDia(e.target.value)}
                      placeholder="Ej.: ayer, 28/3, el martes pasado…"
                      maxLength={120}
                    />
                  </div>
                </div>
              )}

              {(objetoTipo === 'vendo' || objetoTipo === 'regalo') && (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                  <Label htmlFor="objeto-cosa-vr">
                    {objetoTipo === 'vendo' ? '¿Qué vendés?' : '¿Qué regalás?'} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="objeto-cosa-vr"
                    value={objetoCosa}
                    onChange={(e) => setObjetoCosa(e.target.value)}
                    placeholder="Describí en pocas palabras"
                    maxLength={85}
                  />
                </div>
              )}

              {objetoTipo && (
                <div className="space-y-2">
                  <Label>Así va a quedar el mensaje</Label>
                  <div className="min-h-[4rem] rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm leading-relaxed text-slate-800 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200">
                    {objetoTextoGenerado ?? (
                      <span className="text-slate-400 dark:text-slate-500">Completá los datos de arriba para ver el texto.</span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">
                  Algo más que quieras contar <span className="text-slate-400 font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Si querés agregar un detalle extra, escribilo acá…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">{description.length}/1000 caracteres</p>
              </div>
            </div>
          )}

          {!isObjetos && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">
                  Título <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder={
                    isAvisoONoticia ? 'Un título claro para tu aviso' : 'Título de tu publicación'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">{title.length}/100 caracteres</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Descripción <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder={
                    isAvisoONoticia
                      ? 'Contá los detalles que quieras compartir con el barrio…'
                      : 'Describe tu publicación con el mayor detalle posible…'
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={isAvisoONoticia ? 5 : 6}
                  maxLength={1000}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">{description.length}/1000 caracteres</p>
              </div>
            </>
          )}

          {config.whatsappEnabled && (
            <div className="space-y-2">
              <Label htmlFor="whatsapp">
                WhatsApp {isAvisoONoticia ? <span className="text-red-500">*</span> : '(opcional)'}
              </Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="+54 9 11 1234-5678"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                required={isAvisoONoticia}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isAvisoONoticia
                  ? 'Así pueden contactarte desde la publicación'
                  : 'Si lo agregás, otros podrán contactarte por WhatsApp'}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>
              Fotos y/o videos {isAvisoONoticia ? <span className="text-red-500">*</span> : '(opcional)'} · hasta{' '}
              {POST_MEDIA_LIMITS.maxImagesPerPost} fotos ({POST_MEDIA_LIMITS.maxImageMbPerFile} MB c/u) y hasta{' '}
              {POST_MEDIA_LIMITS.maxVideosPerPost} videos
            </Label>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Podés elegir hasta {POST_MEDIA_LIMITS.maxImagesPerPost} fotos (como mucho{' '}
              {POST_MEDIA_LIMITS.maxImagesPerPost * POST_MEDIA_LIMITS.maxImageMbPerFile} MB en total antes de enviar); al
              subir se comprimen para ahorrar espacio.
            </p>
            {attachmentFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {attachmentFiles.map((att, index) => (
                  <div
                    key={`${att.file.name}-${index}`}
                    className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-gray-800"
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
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
                      aria-label="Quitar"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {canAddAttachments && (
              <label className="block border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors">
                <input
                  type="file"
                  accept="image/*,video/*,.mp4,.mov,.webm,.m4v,.3gp,.3g2"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentChange}
                />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  Fotos hasta {POST_MEDIA_LIMITS.maxImageMbPerFile} MB c/u (se optimizan al subir). Videos hasta{' '}
                  {POST_MEDIA_LIMITS.maxVideoMbPerFile} MB.
                </p>
              </label>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={sending}>
            {sending ? 'Enviando…' : 'Enviar publicación'}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  )
}

export default function CreateOtroPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 text-slate-500">Cargando…</div>
      }
    >
      <CreateOtroForm />
    </Suspense>
  )
}
