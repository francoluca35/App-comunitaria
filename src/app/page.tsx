'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useApp, type Category } from './providers'
import { Megaphone, Plus, Sparkles, Upload } from 'lucide-react'
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
import { Carousel, CarouselContent, CarouselItem } from '@/app/components/ui/carousel'
import type { CarouselApi } from '@/app/components/ui/carousel'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { PublicidadModal } from '@/components/PublicidadModal'
import { PublicidadContactLinks } from '@/components/PublicidadContactLinks'
import type { PublicidadDisplay } from '@/lib/publicidad-display'
import { getPostCategoryVisual } from '@/lib/post-category-visuals'

function getCategoryCount(posts: { category: Category }[], value: Category | 'all') {
  if (value === 'all') return posts.length
  return posts.filter((p) => p.category === value).length
}

function ZonaPublicitariaCarousel() {
  const [api, setApi] = useState<CarouselApi>()
  const [selectedPublicidad, setSelectedPublicidad] = useState<PublicidadDisplay | null>(null)
  const [ads, setAds] = useState<PublicidadDisplay[]>([])
  const [adsLoading, setAdsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/publicidad/activos?lateral=1')
      .then(async (res) => {
        if (!res.ok) return []
        const data = (await res.json().catch(() => [])) as unknown
        if (!Array.isArray(data)) return []
        return data as Record<string, unknown>[]
      })
      .then((rows) => {
        if (cancelled) return
        const mapped: PublicidadDisplay[] = rows.map((r) => ({
          id: String(r.id ?? ''),
          title: String(r.title ?? ''),
          description: String(r.description ?? ''),
          category: String(r.category ?? ''),
          createdAt: new Date(
            typeof r.createdAt === 'string' || typeof r.createdAt === 'number' ? r.createdAt : Date.now()
          ),
          imageUrl: typeof r.imageUrl === 'string' ? r.imageUrl : undefined,
          images: Array.isArray(r.images)
            ? (r.images as unknown[]).filter((x): x is string => typeof x === 'string')
            : undefined,
          whatsappUrl: typeof r.whatsappUrl === 'string' ? r.whatsappUrl : undefined,
          instagramUrl: typeof r.instagramUrl === 'string' ? r.instagramUrl : undefined,
        }))
        setAds(mapped)
      })
      .catch(() => {
        if (!cancelled) setAds([])
      })
      .finally(() => {
        if (!cancelled) setAdsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!api) return
    const t = setInterval(() => api.scrollNext(), 4000)
    return () => clearInterval(t)
  }, [api])

  return (
    <>
      <PublicidadModal
        open={!!selectedPublicidad}
        onOpenChange={(open) => !open && setSelectedPublicidad(null)}
        publicidad={selectedPublicidad}
      />
      {adsLoading ? (
        <div className="text-sm text-slate-500 dark:text-gray-400 py-6 text-center">Cargando publicidades…</div>
      ) : ads.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-gray-400 px-2 py-4 text-center">
          No hay publicidades con la opción de barra lateral activas. Podés ver todas en{' '}
          <Link href="/publicidades" className="text-indigo-600 dark:text-indigo-400 font-medium underline">
            Publicidades
          </Link>
          .
        </p>
      ) : (
        <Carousel
          opts={{ loop: ads.length > 1, align: 'start' }}
          setApi={setApi}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            {ads.map((p) => (
              <CarouselItem key={p.id} className="pl-2 basis-1/2">
                <button
                  type="button"
                  onClick={() => setSelectedPublicidad(p)}
                  className="w-full text-left rounded-xl bg-white dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 overflow-hidden shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-slate-200 dark:bg-gray-700">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Megaphone className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2">{p.title}</p>
                    <PublicidadContactLinks
                      whatsappUrl={p.whatsappUrl}
                      instagramUrl={p.instagramUrl}
                      size="compact"
                      stopPropagationOnClick
                    />
                  </div>
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      )}
    </>
  )
}

export default function HomePage() {
  const { posts, currentUser, refreshUser, authLoading, postCategories } = useApp()
  const approvedPosts = posts.filter((p) => p.status === 'approved')

  const categoryNavItems = useMemo(() => {
    const todasVisual = getPostCategoryVisual('todas')
    const head = [
      {
        value: 'all' as const,
        slug: 'todas',
        label: 'Todas',
        icon: todasVisual.icon,
        iconClass: todasVisual.iconClass,
      },
    ]
    const rest = postCategories.map((cat) => {
      const v = getPostCategoryVisual(cat.slug)
      return {
        value: cat.slug as Category,
        slug: cat.slug,
        label: cat.label,
        icon: v.icon,
        iconClass: v.iconClass,
      }
    })
    return [...head, ...rest]
  }, [postCategories])
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

        {currentUser && (
          <Link
            href="/publicidades/crear"
            className="group flex items-center justify-between gap-4 rounded-2xl p-4 sm:p-5 mb-6 border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800/80 text-slate-900 dark:text-white shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 group-hover:scale-105 transition-transform">
                <Megaphone className="w-6 h-6" />
              </span>
              <div>
                <span className="text-xl font-bold block">Crear publicidad</span>
                <span className="text-sm text-slate-500 dark:text-gray-400">Gestionar anuncios de la comunidad</span>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-indigo-400 group-hover:animate-pulse" />
          </Link>
        )}

        {/* Resumen: acceso rápido por categoría */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Explorar por categoría
          </h2>
          <p className="text-slate-600 dark:text-gray-400 text-sm mb-3">
            Elegí una categoría en el menú o tocá una tarjeta.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {categoryNavItems.map((cat) => {
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

        {/* Zona publicitaria: carrusel doble (4 publicidades selectivas, 2 visibles, loop) – solo móvil */}
        <section className="lg:hidden mt-8 pt-6 border-t border-slate-200 dark:border-gray-800 px-2 pb-6">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
            Zona publicitaria
          </h2>
          <ZonaPublicitariaCarousel />
        </section>
      </div>
    </DashboardLayout>
  )
}
