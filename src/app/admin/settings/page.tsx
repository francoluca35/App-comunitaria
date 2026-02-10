'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Label } from '@/app/components/ui/label'
import { Switch } from '@/app/components/ui/switch'
import { Input } from '@/app/components/ui/input'
import { Textarea } from '@/app/components/ui/textarea'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminSettingsPage() {
  const router = useRouter()
  const { currentUser, config, updateConfig } = useApp()

  const [commentsEnabled, setCommentsEnabled] = useState(config.commentsEnabled)
  const [whatsappEnabled, setWhatsappEnabled] = useState(config.whatsappEnabled)
  const [maxPostsPerUser, setMaxPostsPerUser] = useState(config.maxPostsPerUser)
  const [maxImagesPerPost, setMaxImagesPerPost] = useState(config.maxImagesPerPost)
  const [termsOfService, setTermsOfService] = useState(config.termsOfService)

  if (!currentUser?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">No tienes permisos de administrador</p>
            <Button onClick={() => router.push('/')}>Volver al inicio</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSave = () => {
    updateConfig({
      commentsEnabled,
      whatsappEnabled,
      maxPostsPerUser,
      maxImagesPerPost,
      termsOfService,
    })
    toast.success('Configuración guardada')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-6">
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg">Configuración de la App</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Funcionalidades</CardTitle>
            <CardDescription>Activar o desactivar características de la aplicación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="comments">Comentarios</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Permitir a los usuarios comentar publicaciones</p>
              </div>
              <Switch id="comments" checked={commentsEnabled} onCheckedChange={setCommentsEnabled} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="whatsapp">Contacto por WhatsApp</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Permitir compartir número de WhatsApp</p>
              </div>
              <Switch id="whatsapp" checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Límites</CardTitle>
            <CardDescription>Configurar límites de contenido</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxPosts">Máximo de publicaciones por usuario</Label>
              <Input
                id="maxPosts"
                type="number"
                min="1"
                max="50"
                value={maxPostsPerUser}
                onChange={(e) => setMaxPostsPerUser(parseInt(e.target.value) || 5)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">Límite actual: {maxPostsPerUser}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxImages">Máximo de imágenes por publicación</Label>
              <Input
                id="maxImages"
                type="number"
                min="1"
                max="10"
                value={maxImagesPerPost}
                onChange={(e) => setMaxImagesPerPost(parseInt(e.target.value) || 5)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">Límite actual: {maxImagesPerPost}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Términos y Condiciones</CardTitle>
            <CardDescription>Texto legal mostrado al crear publicaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={termsOfService}
              onChange={(e) => setTermsOfService(e.target.value)}
              rows={6}
              className="resize-none"
              placeholder="Ingresa los términos de uso..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorías</CardTitle>
            <CardDescription>Gestión de categorías de publicaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span className="text-sm">🐕 Mascotas</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span className="text-sm">⚠️ Alertas</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span className="text-sm">📢 Avisos</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span className="text-sm">📦 Objetos</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span className="text-sm">📰 Noticias</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Las categorías están predefinidas</p>
          </CardContent>
        </Card>

        <Button className="w-full" size="lg" onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Guardar Configuración
        </Button>
      </div>
    </div>
  )
}
