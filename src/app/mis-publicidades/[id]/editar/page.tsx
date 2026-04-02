'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
import {
  instagramLocalFromStored,
  instagramStoredFromLocal,
  phoneDigitsFromStored,
  phoneStoredFromDigits,
} from '@/lib/publicidad-contact-fields'

const BUCKET = 'publicaciones'
const MAX_IMAGES = 5
const MAX_FILE_MB = 5

type PublicidadStatus = 'pending' | 'payment_pending' | 'active' | 'rejected'

type PublicidadRow = {
  id: string
  title: string
  description: string
  phone_number: string | null
  instagram: string | null
  category: string
  images: string[]
  status: PublicidadStatus
  days_active: number
  created_at: string
  start_at: string | null
  end_at: string | null
  price_amount: number
}

function toInputDateValue(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function parseInputDateValue(value: string): Date | null {
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
  return diffDays + 1
}

function endDateFromDaysActive(days: number, today: Date): Date {
  const d = new Date(today)
  d.setDate(d.getDate() + Math.max(0, days - 1))
  return d
}

export default function EditarPublicidadPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = typeof params?.id === 'string' ? params.id : ''
  const { currentUser, publicidadCategories } = useApp()

  const [loading, setLoading] = useState(true)
  const [row, setRow] = useState<PublicidadRow | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [step, setStep] = useState<1 | 2>(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [categorySlug, setCategorySlug] = useState('otros')
  const [existingUrls, setExistingUrls] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])

  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const maxEnd = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() + 364)
    return d
  }, [today])

  const [endDateValue, setEndDateValue] = useState(() => toInputDateValue(endDateFromDaysActive(30, new Date())))
  const [selectedDays, setSelectedDays] = useState(30)

  const [valorPublicitario, setValorPublicitario] = useState(0)
  const totalPrice = useMemo(() => valorPublicitario * selectedDays, [valorPublicitario, selectedDays])

  const [saving, setSaving] = useState(false)

  const newPreviewUrls = useMemo(() => newFiles.map((f) => URL.createObjectURL(f)), [newFiles])

  useEffect(() => {
    return () => {
      for (const u of newPreviewUrls) URL.revokeObjectURL(u)
    }
  }, [newPreviewUrls])

  const isActiveOnly = row?.status === 'active'
  const needsTwoSteps = row && row.status !== 'active'

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const supabase = createClient()
    const { data: sessionData } = await supabase.auth.getSession()
    return sessionData.session?.access_token ?? null
  }, [])

  const loadValor = useCallback(async () => {
    try {
      const res = await fetch('/api/publicidad/valor-publicitario')
      if (!res.ok) return
      const data = (await res.json().catch(() => ({}))) as { valorPublicitario?: number }
      setValorPublicitario(typeof data.valorPublicitario === 'number' ? data.valorPublicitario : 0)
    } catch {
      setValorPublicitario(0)
    }
  }, [])

  useEffect(() => {
    void loadValor()
  }, [loadValor])

  useEffect(() => {
    if (!currentUser) {
      router.replace('/login')
    }
  }, [currentUser, router])

  useEffect(() => {
    if (!id || !currentUser) return

    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const token = await getAccessToken()
        if (!token) {
          setLoadError('Sesión expirada')
          return
        }
        const res = await fetch(`/api/publicidad/mis/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({})) as { publicidad?: PublicidadRow; error?: string }
        if (!res.ok) {
          setLoadError(data.error ?? 'No se pudo cargar')
          return
        }
        if (!data.publicidad) {
          setLoadError('No encontrado')
          return
        }
        const p = data.publicidad
        setRow(p)
        setTitle(p.title)
        setDescription(p.description)
        setPhoneDigits(phoneDigitsFromStored(p.phone_number))
        setInstagramHandle(instagramLocalFromStored(p.instagram))
        setCategorySlug(p.category || 'otros')
        setExistingUrls(Array.isArray(p.images) ? [...p.images] : [])
        setNewFiles([])
        const end = endDateFromDaysActive(p.days_active, today)
        setEndDateValue(toInputDateValue(end))
        setSelectedDays(p.days_active)
        setStep(1)
      } catch {
        setLoadError('Error de conexión')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id, currentUser, getAccessToken, today])

  useEffect(() => {
    const end = parseInputDateValue(endDateValue)
    if (!end) return
    const days = daysInclusiveFromToday(end, today)
    const clamped = Math.max(1, Math.min(365, days))
    setSelectedDays(clamped)
  }, [endDateValue, today])

  const removeImageAt = (index: number) => {
    const nExisting = existingUrls.length
    if (index < nExisting) {
      setExistingUrls((prev) => prev.filter((_, i) => i !== index))
    } else {
      const j = index - nExisting
      setNewFiles((prev) => prev.filter((_, i) => i !== j))
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const list = Array.from(files)
    const total = existingUrls.length + newFiles.length
    if (total + list.length > MAX_IMAGES) {
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
    setNewFiles((prev) => [...prev, ...valid].slice(0, MAX_IMAGES - existingUrls.length))
  }

  const uploadNewFiles = async (): Promise<string[]> => {
    if (!currentUser || !newFiles.length) return []
    const supabase = createClient()
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!baseUrl) {
      toast.error('Configuración de Storage no disponible')
      return []
    }
    const prepared = await compressImagesForCommunityUpload(newFiles)
    const urls: string[] = []
    for (let i = 0; i < prepared.length; i++) {
      const file = prepared[i]
      const label = newFiles[i]?.name ?? file.name
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
    const imgCount = existingUrls.length + newFiles.length
    if (imgCount < 1) return 'Tenés que tener al menos 1 imagen'
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

  const submit = async () => {
    if (!row || !currentUser) return
    const err = validateStep1()
    if (err) {
      toast.error(err)
      return
    }

    if (needsTwoSteps && step === 1) {
      handleNext()
      return
    }

    const accessToken = await getAccessToken()
    if (!accessToken) {
      toast.error('Sesión expirada')
      return
    }

    setSaving(true)
    try {
      let uploaded: string[] = []
      if (newFiles.length) {
        uploaded = await uploadNewFiles()
      }
      const images = [...existingUrls, ...uploaded]

      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        phone_number: phoneStoredFromDigits(phoneDigits),
        instagram: instagramStoredFromLocal(instagramHandle),
        images,
        category: categorySlug,
      }

      if (row.status !== 'active') {
        body.days_active = selectedDays
      }

      const res = await fetch(`/api/publicidad/mis/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? 'No se pudo guardar')
        return
      }

      if (row.status === 'rejected') {
        toast.success('Cambios guardados. La solicitud volvió a revisión.')
      } else {
        toast.success('Publicidad actualizada')
      }
      router.push('/mis-publicidades')
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  if (!currentUser) return null

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </DashboardLayout>
    )
  }

  if (loadError || !row) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto py-12 text-center">
          <p className="text-slate-600 dark:text-gray-400 mb-4">{loadError ?? 'No encontrado'}</p>
          <Button variant="outline" onClick={() => router.push('/mis-publicidades')}>
            Volver
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  if (row.status !== 'active' && row.status !== 'pending' && row.status !== 'rejected' && row.status !== 'payment_pending') {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto py-12 text-center">
          <p className="text-slate-600 dark:text-gray-400 mb-4">No podés editar esta publicidad en su estado actual.</p>
          <Button variant="outline" onClick={() => router.push('/mis-publicidades')}>
            Volver
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const previewItems: { key: string; url: string }[] = [
    ...existingUrls.map((url, i) => ({ key: `e-${i}`, url })),
    ...newPreviewUrls.map((url, i) => ({ key: `n-${i}`, url })),
  ]

  return (
    <DashboardLayout>
      <div className="w-full max-w-lg mx-auto pb-8">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              {isActiveOnly ? 'Editar publicidad activa' : 'Editar publicidad'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {needsTwoSteps ? `Paso ${step} de 2` : 'Los cambios se ven al instante en el listado público.'}
            </p>
          </div>
        </div>

        {isActiveOnly && row.end_at && (
          <p className="text-sm text-slate-600 dark:text-gray-300 mb-4 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50 px-4 py-3">
            Vigente hasta{' '}
            <span className="font-medium">{new Date(row.end_at).toLocaleDateString('es-AR')}</span>. Podés cambiar texto,
            contacto, categoría e imágenes; la duración contratada no cambia.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Datos</CardTitle>
            <CardDescription>
              {needsTwoSteps && step === 1
                ? 'Modificá el contenido y pasá al paso siguiente.'
                : needsTwoSteps && step === 2
                  ? 'Confirmá la vigencia y guardá.'
                  : 'Guardá los cambios cuando termines.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {(step === 1 || !needsTwoSteps) && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-pub-title">
                    Título <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-pub-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-pub-desc">
                    Descripción <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="edit-pub-desc"
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
                  phoneInputId="edit-pub-phone"
                  igInputId="edit-pub-ig"
                />

                <div className="space-y-2">
                  <Label htmlFor="edit-pub-cat">Categoría</Label>
                  <select
                    id="edit-pub-cat"
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
                  {previewItems.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {previewItems.map((item, index) => (
                        <div key={item.key} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-gray-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.url} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImageAt(index)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
                            aria-label="Quitar"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="block border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors">
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

                {needsTwoSteps ? (
                  <div className="flex justify-end pt-2">
                    <Button onClick={() => void handleNext()} type="button">
                      Siguiente <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-end pt-2">
                    <Button onClick={() => void submit()} disabled={saving} type="button">
                      {saving ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Guardando…
                        </span>
                      ) : (
                        'Guardar cambios'
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}

            {needsTwoSteps && step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-pub-end-date">Fecha de fin (contando desde hoy)</Label>
                  <Input
                    id="edit-pub-end-date"
                    type="date"
                    value={endDateValue}
                    min={toInputDateValue(today)}
                    max={toInputDateValue(maxEnd)}
                    onChange={(e) => setEndDateValue(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Equivale a <span className="font-medium">{selectedDays}</span> día{selectedDays === 1 ? '' : 's'} de publicidad.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-gray-800 p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Estimación</div>
                  <div className="flex items-baseline justify-between gap-4 mt-1">
                    <div className="text-sm text-slate-700 dark:text-slate-200">
                      {selectedDays} días · valor {valorPublicitario} ARS/día
                    </div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">Total: {totalPrice} ARS</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(1)} type="button">
                    Atrás
                  </Button>
                  <Button onClick={() => void submit()} disabled={saving} type="button">
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Guardando…
                      </span>
                    ) : (
                      'Guardar cambios'
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
