'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp, Category } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Textarea } from '@/app/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Card, CardContent } from '@/app/components/ui/card'
import { BottomNav } from '@/components/BottomNav'
import { ArrowLeft, Upload, X, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

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
  const [images, setImages] = useState<string[]>([])
  const [whatsappNumber, setWhatsappNumber] = useState('')

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    if (images.length + files.length > config.maxImagesPerPost) {
      toast.error(`Máximo ${config.maxImagesPerPost} imágenes por publicación`)
      return
    }

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImages((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser) {
      toast.error('Debes iniciar sesión para crear publicaciones')
      router.push('/login')
      return
    }

    if (!title.trim() || !description.trim()) {
      toast.error('Completa todos los campos requeridos')
      return
    }

    addPost({
      title: title.trim(),
      description: description.trim(),
      category,
      images,
      whatsappNumber: whatsappNumber.trim() || undefined,
    })

    toast.success('Publicación enviada! Será revisada por un administrador.')
    router.push('/')
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg">Nueva Publicación</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
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
                Si proporcionas tu WhatsApp, otros usuarios podrán contactarte directamente
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Imágenes (opcional, máx. {config.maxImagesPerPost})</Label>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {images.map((image, index) => (
                  <div key={index} className="relative aspect-square">
                    <img src={image} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                      onClick={() => removeImage(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {images.length < config.maxImagesPerPost && (
              <label className="block">
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Haz clic para subir imágenes</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">PNG, JPG hasta 5MB</p>
                </div>
              </label>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg">
            Enviar Publicación
          </Button>
        </form>
      </div>

      <BottomNav />
    </div>
  )
}
