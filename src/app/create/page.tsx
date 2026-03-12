'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp, Category } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Textarea } from '@/app/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Card, CardContent } from '@/app/components/ui/card'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ArrowLeft, AlertCircle, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

const BUCKET = 'publicaciones'
const MAX_IMAGES = 5
const MAX_FILE_MB = 5

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'mascotas', label: 'Mascotas' },
  { value: 'alertas', label: 'Alertas' },
  { value: 'avisos', label: 'Avisos' },
  { value: 'objetos', label: 'Objetos' },
  { value: 'noticias', label: 'Noticias' },
]

export default function CreatePostPage() {
  const router = useRouter()
  const { addPost, currentUser, config } = useApp()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category>('noticias')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)

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
    if (!currentUser || imageFiles.length === 0) return []
    const supabase = createClient()
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!baseUrl) {
      toast.error('Configuración de Storage no disponible')
      return []
    }
    const urls: string[] = []
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${currentUser.id}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
      if (error) {
        toast.error(`Error al subir ${file.name}: ${error.message}`)
        throw error
      }
      // URL pública explícita (el bucket "publicaciones" debe estar en Public en Supabase Dashboard)
      const publicUrl = `${baseUrl.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${path}`
      urls.push(publicUrl)
    }
    return urls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser) {
      toast.error('Debes iniciar sesión para crear publicaciones')
      router.push('/login')
      return
    }

    if (!title.trim() || !description.trim()) {
      toast.error('Completa título y descripción')
      return
    }

    setSending(true)
    try {
      const imageUrls = imageFiles.length > 0 ? await uploadImages() : []
      const result = await addPost({
        title: title.trim(),
        description: description.trim(),
        category,
        images: imageUrls,
        whatsappNumber: whatsappNumber.trim() || undefined,
      })
      if (!result.ok) {
        toast.error(result.error ?? 'Error al enviar')
        return
      }
      toast.success('Publicación enviada. Será revisada por un administrador.')
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
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Nueva Publicación</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-300">
                  <p className="mb-1">Tu publicación será revisada por un administrador antes de hacerse pública.</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">{config.termsOfService}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="title">
              Título <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Ej: Perro perdido en zona centro"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">{title.length}/100 caracteres</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">
              Categoría <span className="text-red-500">*</span>
            </Label>
            <Select value={category} onValueChange={(value) => setCategory(value as Category)}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Descripción <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe tu publicación con el mayor detalle posible..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
              maxLength={1000}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">{description.length}/1000 caracteres</p>
          </div>

          <div className="space-y-2">
            <Label>Imágenes (opcional, máx. {MAX_IMAGES})</Label>
            {imageFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {imageFiles.map((file, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-gray-800">
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
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
            {imageFiles.length < MAX_IMAGES && (
              <label className="block border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors">
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-gray-400">Agregar fotos (máx. {MAX_FILE_MB} MB c/u)</p>
              </label>
            )}
          </div>

          {config.whatsappEnabled && (
            <div className="space-y-2">
              <Label htmlFor="whatsapp">Número de WhatsApp (opcional)</Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="+54 9 11 1234-5678"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Si lo agregás, otros podrán contactarte por WhatsApp
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={sending}>
            {sending ? 'Enviando…' : 'Enviar publicación'}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  )
}
