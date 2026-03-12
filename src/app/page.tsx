'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useApp, Category } from './providers'
import {
  Dog,
  AlertTriangle,
  Megaphone,
  Package,
  Newspaper,
  Filter,
  Plus,
  Sparkles,
  Upload,
} from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const CATEGORIES: {
  value: Category | 'all'
  slug: string
  label: string
  icon: React.ReactNode
  iconClass: string
}[] = [
  { value: 'all', slug: 'todas', label: 'Todas', icon: <Filter className="w-6 h-6" />, iconClass: 'bg-gradient-to-br from-slate-500 to-slate-600 dark:from-slate-400 dark:to-slate-500' },
  { value: 'mascotas', slug: 'mascotas', label: 'Mascotas', icon: <Dog className="w-6 h-6" />, iconClass: 'bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400' },
  { value: 'alertas', slug: 'alertas', label: 'Alertas', icon: <AlertTriangle className="w-6 h-6" />, iconClass: 'bg-gradient-to-br from-rose-500 to-red-500 dark:from-rose-400 dark:to-red-400' },
  { value: 'avisos', slug: 'avisos', label: 'Avisos', icon: <Megaphone className="w-6 h-6" />, iconClass: 'bg-gradient-to-br from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-indigo-400' },
  { value: 'objetos', slug: 'objetos', label: 'Objetos', icon: <Package className="w-6 h-6" />, iconClass: 'bg-gradient-to-br from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400' },
  { value: 'noticias', slug: 'noticias', label: 'Noticias', icon: <Newspaper className="w-6 h-6" />, iconClass: 'bg-gradient-to-br from-violet-500 to-purple-500 dark:from-violet-400 dark:to-purple-400' },
]

function getCategoryCount(posts: { category: Category }[], value: Category | 'all') {
  if (value === 'all') return posts.length
  return posts.filter((p) => p.category === value).length
}

export default function HomePage() {
  const { posts, currentUser, refreshUser, authLoading } = useApp()
  const approvedPosts = posts.filter((p) => p.status === 'approved')
  const [avatarDismissed, setAvatarDismissed] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showAvatarPrompt =
    !authLoading && !!currentUser && !currentUser.avatar && !avatarDismissed

  const handleAvatarSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setUploadError('Elegí una imagen')
      return
    }
    setUploadError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setUploadError('Sesión expirada. Volvé a iniciar sesión.')
        return
      }
      const formData = new FormData()
      formData.append('avatar', file)
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setUploadError(data.error ?? 'Error al subir la foto')
        return
      }
      await refreshUser()
      toast.success('Foto de perfil actualizada')
      setAvatarDismissed(true)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      setUploadError('Error de conexión. Intentá de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <DashboardLayout>
      {/* Modal: pedir foto de perfil si no tiene (ej. recién registrado) */}
      <Dialog open={showAvatarPrompt} onOpenChange={(open) => !open && setAvatarDismissed(true)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregá tu foto de perfil</DialogTitle>
            <DialogDescription>
              Así te identifican en la comunidad. Podés subir una imagen JPG, PNG o WebP (máx. 2 MB).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAvatarSubmit} className="space-y-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-4 file:py-2 file:text-indigo-700 dark:file:bg-indigo-900/30 dark:file:text-indigo-300"
                onChange={() => setUploadError(null)}
              />
            </div>
            {uploadError && (
              <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAvatarDismissed(true)}
              >
                Más tarde
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Subiendo…' : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir foto
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="w-full">
        {/* CTA Crear Publicación */}
        <Link
          href="/create"
          className="group flex items-center justify-between gap-4 rounded-2xl p-4 sm:p-5 mb-6 text-white overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-purple-500/25 hover:shadow-2xl hover:shadow-purple-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-colors">
              <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
            </span>
            <div>
              <span className="text-xl font-bold block">Crear Publicación</span>
              <span className="text-sm text-white/90">Comparte con tu comunidad</span>
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-white/80 group-hover:animate-pulse" />
        </Link>

        {/* Resumen: acceso rápido por categoría */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Explorar por categoría
          </h2>
          <p className="text-slate-600 dark:text-gray-400 text-sm mb-3">
            Elegí una categoría en el menú o tocá una tarjeta.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {CATEGORIES.map((cat) => {
              const count = getCategoryCount(approvedPosts, cat.value)
              return (
                <Link
                  key={cat.value}
                  href={`/categoria/${cat.slug}`}
                  className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-slate-200/80 dark:border-gray-700/80 shadow-sm hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/20 hover:border-transparent hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  <span
                    className={`flex items-center justify-center w-10 h-10 rounded-lg ${cat.iconClass} text-white shadow-md group-hover:scale-110 transition-transform duration-200`}
                  >
                    {cat.icon}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white text-sm text-center">
                    {cat.label}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-gray-400">
                    {count === 1 ? '1 publicación' : `${count} publicaciones`}
                  </span>
                </Link>
              )
            })}
            <Link
              href="/publicidades"
              className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-gray-800/80 border-2 border-dashed border-indigo-300 dark:border-indigo-600/50 shadow-sm hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-500 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md group-hover:scale-110 transition-transform duration-200">
                <Megaphone className="w-5 h-5" />
              </span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-sm text-center">
                Ver todas las publicidades
              </span>
            </Link>
          </div>
        </section>

        {/* Zona publicitaria: solo móvil, abajo */}
        <section className="lg:hidden mt-8 pt-6 border-t border-slate-200 dark:border-gray-800 px-4 pb-6">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Zona publicitaria
          </h2>
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-100 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 p-3">
              <div className="aspect-[2/1] rounded-lg bg-slate-200 dark:bg-gray-700 mb-2" />
              <p className="text-xs text-slate-500 dark:text-gray-400">Espacio publicitario</p>
            </div>
            <div className="rounded-xl bg-slate-100 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 p-3">
              <div className="aspect-[2/1] rounded-lg bg-slate-200 dark:bg-gray-700 mb-2" />
              <p className="text-xs text-slate-500 dark:text-gray-400">Espacio publicitario</p>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
