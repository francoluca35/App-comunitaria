'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { ArrowLeft, ArrowRight, Upload, X, Loader2 } from 'lucide-react'
import { Input } from '@/app/components/ui/input'
import { Textarea } from '@/app/components/ui/textarea'
import { Label } from '@/app/components/ui/label'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { compressImagesForCommunityUpload, storageExtensionFromFile } from '@/lib/compress-upload-image'
import { PublicidadPhoneInstagramFields } from '@/components/PublicidadPhoneInstagramFields'
import { instagramStoredFromLocal, phoneStoredFromDigits } from '@/lib/publicidad-contact-fields'

const BUCKET = 'publicaciones'
const MAX_IMAGES = 5
const MAX_FILE_MB = 5

function toInputDateValue(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function parseInputDateValue(value: string): Date | null {
  // value: YYYY-MM-DD
  const [y, m, d] = value.split('-').map((x) => Number(x))
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

function daysInclusiveFromToday(endDate: Date, today: Date): number {
  const endMidnight = new Date(endDate)
  const todayMidnight = new Date(today)
  endMidnight.setHours(0, 0, 0, 0)
  todayMidnight.setHours(0, 0, 0, 0)

  const diffMs = endMidnight.getTime() - todayMidnight.getTime()
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  // endDate = today => 1 día
  return diffDays + 1
}

export default function CrearPublicidadPage() {
  const router = useRouter()
  const { currentUser, publicidadCategories, refreshPublicidadCategories } = useApp()

  const [step, setStep] = useState<1 | 2>(1)

  // Form user
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categorySlug, setCategorySlug] = useState('otros')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const maxEnd = useMemo(() => {
    // days_active max = 365 => end date max = today + 364 days
    const d = new Date(today)
    d.setDate(d.getDate() + 364)
    return d
  }, [today])

  const [endDateValue, setEndDateValue] = useState<string>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    // default: 30 días => endDate = today + 29
    d.setDate(d.getDate() + 29)
    return toInputDateValue(d)
  })

  const [selectedDays, setSelectedDays] = useState<number>(30)

  // Precio estimado
  const [valorPublicitario, setValorPublicitario] = useState<number>(0)
  const [valorPublicitarioLateral, setValorPublicitarioLateral] = useState<number>(0)
  const [promoteLateral, setPromoteLateral] = useState<boolean>(false)

  const perDayPrice = useMemo(
    () => valorPublicitario + (promoteLateral ? valorPublicitarioLateral : 0),
    [valorPublicitario, valorPublicitarioLateral, promoteLateral]
  )
  const totalPrice = useMemo(() => perDayPrice * selectedDays, [perDayPrice, selectedDays])

  const [sending, setSending] = useState(false)

  const loadValor = useCallback(async () => {
    try {
      const res = await fetch('/api/publicidad/valor-publicitario')
      if (!res.ok) return
      const data = (await res.json().catch(() => ({}))) as { valorPublicitario?: number }
      setValorPublicitario(typeof data.valorPublicitario === 'number' ? data.valorPublicitario : 0)

      const res2 = await fetch('/api/publicidad/valor-publicitario-lateral')
      if (!res2.ok) return
      const data2 = (await res2.json().catch(() => ({}))) as { valorPublicitarioLateral?: number }
      setValorPublicitarioLateral(typeof data2.valorPublicitarioLateral === 'number' ? data2.valorPublicitarioLateral : 0)
    } catch {
      setValorPublicitario(0)
      setValorPublicitarioLateral(0)
    }
  }, [])

  useEffect(() => {
    void loadValor()
  }, [loadValor])

  useEffect(() => {
    void refreshPublicidadCategories()
  }, [refreshPublicidadCategories])

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const supabase = createClient()
    const { data: sessionData } = await supabase.auth.getSession()
    return sessionData.session?.access_token ?? null
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const list = Array.from(files)

    if (imageFiles.length + list.length > MAX_IMAGES) {
      toast.error(`Máximo ${MAX_IMAGES} imágenes`)
      return
    }

    const valid: File[] = []
    for (const f of list) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${f.name} supera ${MAX_FILE_MB} MB`)
        continue
      }
      if (!f.type.startsWith('image/')) {
        toast.error(`${f.name} no es una imagen`)
        continue
      }
      valid.push(f)
    }

    setImageFiles((prev) => [...prev, ...valid].slice(0, MAX_IMAGES))
  }

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadImages = async (): Promise<string[]> => {
    if (!currentUser) return []
    if (!imageFiles.length) return []

    const supabase = createClient()
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!baseUrl) {
      toast.error('Configuración de Storage no disponible')
      return []
    }

    const prepared = await compressImagesForCommunityUpload(imageFiles)
    const urls: string[] = []
    for (let i = 0; i < prepared.length; i++) {
      const file = prepared[i]
      const label = imageFiles[i]?.name ?? file.name
      const ext = storageExtensionFromFile(file)
      const path = `${currentUser.id}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
      if (error) {
        toast.error(`Error al subir ${label}: ${error.message}`)
        throw error
      }
      const publicUrl = `${baseUrl.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${path}`
      urls.push(publicUrl)
    }
    return urls
  }

  const validateStep1 = () => {
    if (!title.trim()) return 'Ingresá un título'
    if (!description.trim()) return 'Ingresá una descripción'
    if (!imageFiles.length) return 'Subí al menos 1 imagen'
    if (!phoneStoredFromDigits(phoneDigits) && !instagramStoredFromLocal(instagramHandle))
      return 'Ingresá teléfono o Instagram'
    return null
  }

  const handleNext = () => {
    const err = validateStep1()
    if (err) {
      toast.error(err)
      return
    }
    setStep(2)
  }

  useEffect(() => {
    const end = parseInputDateValue(endDateValue)
    if (!end) return
    const days = daysInclusiveFromToday(end, today)
    const clamped = Math.max(1, Math.min(365, days))
    setSelectedDays(clamped)
  }, [endDateValue, today])

  const handleSubmit = async () => {
    if (!currentUser) {
      toast.error('Debés iniciar sesión')
      router.push('/login')
      return
    }

    const err = validateStep1()
    if (err) {
      toast.error(err)
      return
    }

    const accessToken = await getAccessToken()
    if (!accessToken) {
      toast.error('Sesión expirada')
      return
    }

    setSending(true)
    try {
      const imageUrls = await uploadImages()
      if (!imageUrls.length) {
        toast.error('No se subieron imágenes')
        return
      }

      const res = await fetch('/api/publicidad/requests', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          phone_number: phoneStoredFromDigits(phoneDigits),
          instagram: instagramStoredFromLocal(instagramHandle),
          images: imageUrls,
          days_active: selectedDays,
          promote_lateral: promoteLateral,
          category: categorySlug,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? 'No se pudo enviar')
        return
      }

      toast.success('Solicitud de publicidad enviada al admin. Te llegará un link para pagar cuando esté aprobada.')
      router.push('/mis-publicidades')
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSending(false)
    }
  }

  if (!currentUser) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <p className="text-lg text-slate-700 mb-4">Debés iniciar sesión</p>
              <Button onClick={() => router.push('/login')}>Iniciar sesión</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="w-full max-w-lg mx-auto pb-8">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Crear publicidad</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Paso {step} de 2
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Datos de tu publicidad</CardTitle>
            <CardDescription>
              {step === 1 ? 'Completá el contenido y pasá al paso siguiente.' : 'Elegí por cuántos días estará activa tu publicidad.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {step === 1 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pub-title">
                    Título <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="pub-title"
                    placeholder="Ej: Plomería 24 hs"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pub-desc">
                    Descripción <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="pub-desc"
                    placeholder="Contanos qué ofrecés, zona, condiciones y demás…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    maxLength={1000}
                    className="resize-none"
                  />
                </div>

                <PublicidadPhoneInstagramFields
                  phoneDigits={phoneDigits}
                  onPhoneDigitsChange={setPhoneDigits}
                  instagramHandle={instagramHandle}
                  onInstagramHandleChange={setInstagramHandle}
                  phoneInputId="pub-phone"
                  igInputId="pub-ig"
                />

                <div className="space-y-2">
                  <Label htmlFor="pub-cat">Categoría</Label>
                  <select
                    id="pub-cat"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={categorySlug}
                    onChange={(e) => setCategorySlug(e.target.value)}
                  >
                    {publicidadCategories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Imágenes (mín. 1, máx. {MAX_IMAGES})</Label>
                  {imageFiles.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {imageFiles.map((file, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-gray-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
                            aria-label="Quitar"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="block border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-[#8B0015] dark:hover:border-[#8B0015] transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                      Hasta {MAX_FILE_MB} MB c/u; se optimizan antes de subir.
                    </p>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    * El admin revisa tu solicitud y luego te envía un link de pago.
                  </div>
                  <Button onClick={handleNext} type="button">
                    Siguiente <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pub-end-date">Fecha de fin (contando desde hoy)</Label>
                  <Input
                    id="pub-end-date"
                    type="date"
                    value={endDateValue}
                    min={toInputDateValue(today)}
                    max={toInputDateValue(maxEnd)}
                    onChange={(e) => setEndDateValue(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Si elegís el día de hoy, son <span className="font-medium">1 día</span>. Cada día suma uno más.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pub-promote-lateral">¿Querés promocionarlo también en la barra lateral?</Label>
                  <select
                    id="pub-promote-lateral"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={promoteLateral ? 'si' : 'no'}
                    onChange={(e) => setPromoteLateral(e.target.value === 'si')}
                  >
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Si elegís <span className="font-medium">Sí</span>, se suma el valor lateral al valor diario.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-gray-800 p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Estimación</div>
                  <div className="flex items-baseline justify-between gap-4 mt-1">
                    <div className="text-sm text-slate-700 dark:text-slate-200">
                      {selectedDays} días · valor {perDayPrice} ARS/día
                    </div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">
                      Total: {totalPrice} ARS
                    </div>
                  </div>
                  {promoteLateral && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Incluye adicional lateral: {valorPublicitarioLateral} ARS/día
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(1)} type="button">
                    Atrás
                  </Button>
                  <Button onClick={() => void handleSubmit()} disabled={sending} type="button">
                    {sending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando…
                      </span>
                    ) : (
                      'Enviar publicidad'
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

