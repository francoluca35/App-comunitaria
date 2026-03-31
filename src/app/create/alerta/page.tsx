'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Textarea } from '@/app/components/ui/textarea'
import { Card, CardContent } from '@/app/components/ui/card'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ArrowLeft, AlertTriangle, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { CST } from '@/lib/cst-theme'

const BUCKET = 'publicaciones'
const MAX_FILE_MB = 5
const ALERT_CATEGORY_SLUG = 'alertas'
const alertRed = '#B91C1C'

export default function CreateAlertaPage() {
  const router = useRouter()
  const { addPost, currentUser, config, postCategories } = useApp()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(imageFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const hasAlertCategory = useMemo(
    () => postCategories.some((c) => c.slug === ALERT_CATEGORY_SLUG),
    [postCategories]
  )

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`La imagen supera ${MAX_FILE_MB} MB`)
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Elegí un archivo de imagen')
      return
    }
    setImageFile(file)
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!currentUser || !imageFile) return null
    const supabase = createClient()
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!baseUrl) {
      toast.error('Configuración de Storage no disponible')
      return null
    }
    const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${currentUser.id}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, imageFile, { upsert: false })
    if (error) {
      toast.error(`Error al subir: ${error.message}`)
      return null
    }
    return `${baseUrl.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${path}`
  }

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
    if (!title.trim() || !description.trim()) {
      toast.error('Completá título y descripción')
      return
    }
    if (!imageFile) {
      toast.error('La alerta debe incluir una imagen')
      return
    }

    setSending(true)
    try {
      const url = await uploadImage()
      if (!url) return
      const result = await addPost({
        title: title.trim(),
        description: description.trim(),
        category: ALERT_CATEGORY_SLUG,
        images: [url],
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
            <Button onClick={() => router.push('/login')} style={{ backgroundColor: CST.bordo }} className="text-white w-full hover:bg-[#5A000E]">
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
        <div className="max-w-md mx-auto">
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
      <div className="max-w-md mx-auto pb-10">
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

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <div className="space-y-2">
            <Label htmlFor="alert-desc">
              Descripción <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="alert-desc"
              placeholder="Qué pasó, dónde, cuándo y qué hacer o a quién avisar."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              maxLength={2000}
              className="resize-y min-h-[120px]"
            />
            <p className="text-xs text-[#7A5C52]">{description.length}/2000</p>
          </div>

          <div className="space-y-2">
            <Label>
              Imagen <span className="text-red-600">*</span>
            </Label>
            <p className="text-xs text-[#7A5C52]">Una foto clara ayuda a que todos entiendan la alerta (máx. {MAX_FILE_MB} MB).</p>
            {!imageFile ? (
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#D8D2CC] bg-white dark:bg-gray-900/40 py-10 cursor-pointer hover:border-[#8B0015] transition-colors">
                <Upload className="h-8 w-8 text-[#7A5C52]/70" />
                <span className="text-sm font-medium text-[#2B2B2B]">Tocá para elegir imagen</span>
                <input type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
              </label>
            ) : (
              <div className="relative rounded-xl border border-[#D8D2CC] overflow-hidden bg-black/5">
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                  aria-label="Quitar imagen"
                >
                  <X className="h-4 w-4" />
                </button>
                {previewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={previewUrl} alt="Vista previa" className="w-full max-h-64 object-contain" />
                ) : null}
              </div>
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
