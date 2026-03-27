'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useApp, type Category, type Post } from './providers'
import {
  CircleHelp,
  Filter,
  LayoutGrid,
  Megaphone,
  PenLine,
  Sparkles,
  Tag,
  TrendingUp,
  Upload,
} from 'lucide-react'
import { DashboardLayout, useFeedSearch } from '@/components/DashboardLayout'
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
import { getPublicidadImageUrls, type PublicidadDisplay } from '@/lib/publicidad-display'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { DeleteOwnPostButton } from '@/components/DeleteOwnPostButton'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { matchesPostSearch, matchesPublicidadSearch, searchTokens } from '@/lib/community-search'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'

const FEED_FILTER_ALL = 'all'
const FEED_FILTER_SOLO_PUBLICIDADES = 'publicidades_only'

type FeedItem =
  | { kind: 'post'; post: Post }
  | { kind: 'publicidad'; publicidad: PublicidadDisplay }

/** Cantidad de publicaciones seguidas antes de insertar una publicidad (no usa fecha de la publicidad). */
const POSTS_BEFORE_PUBLICIDAD = 2

/**
 * Publicaciones ordenadas por fecha; entre bloques de N publicaciones se inserta una publicidad rotando el listado.
 * Así las publicidades no quedan agrupadas ni dependen del horario de publicación.
 */
function interleavePostsWithPublicidades(posts: Post[], publicidades: PublicidadDisplay[]): FeedItem[] {
  const t = (d: Date) => {
    const x = d.getTime()
    return Number.isFinite(x) ? x : 0
  }
  const postsDesc = [...posts].sort((a, b) => t(b.createdAt) - t(a.createdAt))

  if (publicidades.length === 0) {
    return postsDesc.map((post) => ({ kind: 'post' as const, post }))
  }

  if (postsDesc.length === 0) {
    return publicidades.map((publicidad) => ({ kind: 'publicidad' as const, publicidad }))
  }

  const ads = [...publicidades].sort((a, b) => a.id.localeCompare(b.id))
  const out: FeedItem[] = []
  let adCursor = 0

  for (let i = 0; i < postsDesc.length; i++) {
    out.push({ kind: 'post', post: postsDesc[i]! })
    if ((i + 1) % POSTS_BEFORE_PUBLICIDAD === 0) {
      out.push({ kind: 'publicidad', publicidad: ads[adCursor % ads.length]! })
      adCursor++
    }
  }

  return out
}

const orange = '#C06C3B'
const sage = '#8EA07E'

function getCategoryCount(posts: { category: Category }[], value: Category | 'all') {
  if (value === 'all') return posts.length
  return posts.filter((p) => p.category === value).length
}

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? full
}

function authorInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
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
    if (ads.length <= 1) return
    const t = setInterval(() => api.scrollNext(), 4000)
    return () => clearInterval(t)
  }, [api, ads.length])

  return (
    <>
      <PublicidadModal
        open={!!selectedPublicidad}
        onOpenChange={(open) => !open && setSelectedPublicidad(null)}
        publicidad={selectedPublicidad}
      />
      {adsLoading ? (
        <div className="py-6 text-center text-sm text-[#6B5F54]">Cargando publicidades…</div>
      ) : ads.length === 0 ? (
        <p className="px-2 py-4 text-center text-xs text-[#6B5F54]">
          No hay publicidades en la barra lateral activas. Podés ver todas en{' '}
          <Link href="/publicidades" className="font-semibold underline" style={{ color: orange }}>
            Publicidades
          </Link>
          .
        </p>
      ) : (
        <Carousel opts={{ loop: ads.length > 1, align: 'start' }} setApi={setApi} className="w-full">
          <CarouselContent className="-ml-2">
            {ads.map((p) => (
              <CarouselItem key={p.id} className="basis-1/2 pl-2">
                <button
                  type="button"
                  onClick={() => setSelectedPublicidad(p)}
                  className="w-full overflow-hidden rounded-2xl border border-[#E8E0D5] bg-white text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C06C3B]/40"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#E8E0D5]">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Megaphone className="h-8 w-8 text-[#9A8F84]" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-xs font-semibold text-[#2C241C]">{p.title}</p>
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
  return (
    <DashboardLayout>
      <HomePageContent />
    </DashboardLayout>
  )
}

function HomePageContent() {
  const { posts, currentUser, refreshUser, authLoading, postCategories, publicidadCategories, refreshPublicidadCategories } =
    useApp()
  const { query: searchQuery } = useFeedSearch()
  const approvedPosts = posts.filter((p) => p.status === 'approved')

  const [feedPublicidades, setFeedPublicidades] = useState<PublicidadDisplay[]>([])
  const [feedPubLoading, setFeedPubLoading] = useState(true)
  const [selectedFeedPublicidad, setSelectedFeedPublicidad] = useState<PublicidadDisplay | null>(null)
  const [feedFilter, setFeedFilter] = useState<string>(FEED_FILTER_ALL)

  useEffect(() => {
    void refreshPublicidadCategories()
    let cancelled = false
    fetch('/api/publicidad/activos')
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
        setFeedPublicidades(mapped)
      })
      .catch(() => {
        if (!cancelled) setFeedPublicidades([])
      })
      .finally(() => {
        if (!cancelled) setFeedPubLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshPublicidadCategories])

  const categoryLabelBySlug = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of postCategories) m.set(c.slug, c.label)
    return m
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
      const {
        data: { session },
      } = await supabase.auth.getSession()
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

  const now = Date.now()
  const twoDaysAgo = now - 48 * 60 * 60 * 1000
  const newPostsCount = approvedPosts.filter((p) => p.createdAt.getTime() >= twoDaysAgo).length

  const hasSearch = searchTokens(searchQuery).length > 0

  const filteredPosts = useMemo(
    () => approvedPosts.filter((p) => matchesPostSearch(p, searchQuery)),
    [approvedPosts, searchQuery]
  )

  const filteredPublicidades = useMemo(
    () =>
      feedPublicidades.filter((p) =>
        matchesPublicidadSearch(
          p,
          searchQuery,
          publicidadCategories.find((c) => c.slug === p.category)?.label
        )
      ),
    [feedPublicidades, searchQuery, publicidadCategories]
  )

  const postsForFeed = useMemo(() => {
    if (feedFilter === FEED_FILTER_SOLO_PUBLICIDADES) return []
    if (feedFilter === FEED_FILTER_ALL) return filteredPosts
    return filteredPosts.filter((p) => p.category === feedFilter)
  }, [filteredPosts, feedFilter])

  const combinedFeed = useMemo(() => {
    if (feedFilter === FEED_FILTER_SOLO_PUBLICIDADES) {
      return filteredPublicidades.map((publicidad) => ({ kind: 'publicidad' as const, publicidad }))
    }
    if (feedFilter !== FEED_FILTER_ALL && postsForFeed.length === 0) {
      return []
    }
    return interleavePostsWithPublicidades(postsForFeed, filteredPublicidades)
  }, [feedFilter, postsForFeed, filteredPublicidades])

  return (
    <>
      <PublicidadModal
        open={!!selectedFeedPublicidad}
        onOpenChange={(open) => !open && setSelectedFeedPublicidad(null)}
        publicidad={selectedFeedPublicidad}
      />
      <Dialog open={showAvatarPrompt} onOpenChange={(open) => !open && setAvatarDismissed(true)}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[#E8E0D5]">
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
                className="block w-full text-sm text-[#6B5F54] file:mr-4 file:rounded-xl file:border-0 file:bg-[#C06C3B] file:px-4 file:py-2 file:font-semibold file:text-white hover:file:opacity-90"
                onChange={() => setUploadError(null)}
              />
            </div>
            {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setAvatarDismissed(true)}>
                Más tarde
              </Button>
              <Button
                type="submit"
                disabled={uploading}
                className="rounded-xl text-white"
                style={{ backgroundColor: orange }}
              >
                {uploading ? (
                  'Subiendo…'
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir foto
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="relative w-full pb-28">
        {/* Banner bienvenida */}
        <div
          className="mb-6 flex flex-col gap-4 rounded-[1.25rem] p-5 text-white shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-6"
          style={{
            background: `linear-gradient(105deg, ${orange} 0%, ${sage} 100%)`,
          }}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Sparkles className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold sm:text-xl">
                {currentUser
                  ? `¡Bienvenido/a, ${firstName(currentUser.name)}!`
                  : '¡Bienvenido/a a la comunidad!'}
              </h2>
              <p className="mt-1 text-sm text-white/90">
                {newPostsCount === 0
                  ? 'No hay publicaciones nuevas en las últimas 48 h.'
                  : newPostsCount === 1
                    ? 'Hay 1 nueva publicación en tu comunidad.'
                    : `Hay ${newPostsCount} nuevas publicaciones en tu comunidad.`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-center self-end sm:self-auto">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <TrendingUp className="h-6 w-6" />
            </span>
          </div>
        </div>

        {/* Tarjetas de acción */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/create"
            className="group flex items-center justify-between gap-4 rounded-[1.25rem] p-5 text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99]"
            style={{ backgroundColor: orange }}
          >
            <div>
              <h3 className="text-lg font-bold">Crear publicación</h3>
              <p className="mt-1 text-sm text-white/90">Compartí con tu comunidad</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <Sparkles className="h-6 w-6" />
            </span>
          </Link>

          {currentUser ? (
            <Link
              href="/publicidades/crear"
              className="group flex items-center justify-between gap-4 rounded-[1.25rem] p-5 text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99]"
              style={{ backgroundColor: sage }}
            >
              <div>
                <h3 className="text-lg font-bold">Crear publicidad</h3>
                <p className="mt-1 text-sm text-white/90">Gestioná anuncios</p>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                <TrendingUp className="h-6 w-6" />
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-between gap-4 rounded-[1.25rem] border-2 border-dashed border-[#E8E0D5] bg-white p-5 text-[#2C241C] shadow-sm"
            >
              <div>
                <h3 className="text-lg font-bold">Crear publicidad</h3>
                <p className="mt-1 text-sm text-[#6B5F54]">Iniciá sesión para publicitar</p>
              </div>
              <Megaphone className="h-8 w-8 shrink-0 text-[#9A8F84]" />
            </Link>
          )}
        </div>

        {/* Filtro: categorías de publicaciones o solo publicidades */}
        <div className="mb-6 rounded-[1.25rem] border border-[#E8E0D5] bg-gradient-to-br from-white to-[#FAF6F1] p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
                style={{ background: `linear-gradient(145deg, ${orange} 0%, ${sage} 100%)` }}
              >
                <Filter className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#2C241C]">¿Qué querés ver en el feed?</p>
                <p className="mt-0.5 text-xs leading-snug text-[#6B5F54]">
                  Filtrá por categoría (ventas, avisos, etc.) o mostrá solo publicidades.
                </p>
              </div>
            </div>
            <Select value={feedFilter} onValueChange={setFeedFilter}>
              <SelectTrigger
                size="default"
                className="h-12 w-full min-w-0 rounded-2xl border-2 border-[#E8E0D5] bg-white px-4 text-left font-semibold text-[#2C241C] shadow-sm transition-[border-color,box-shadow] hover:border-[#C06C3B]/40 hover:shadow data-[size=default]:h-12 focus-visible:border-[#C06C3B]/55 focus-visible:ring-[3px] focus-visible:ring-[#C06C3B]/20 sm:max-w-[min(100%,22rem)]"
              >
                <SelectValue placeholder="Elegí una opción" />
              </SelectTrigger>
              <SelectContent className="max-h-[min(70vh,24rem)] rounded-xl border-[#E8E0D5] shadow-xl">
                <SelectGroup>
                  <SelectLabel className="px-2 text-[11px] font-bold uppercase tracking-wider text-[#9A8F84]">
                    General
                  </SelectLabel>
                  <SelectItem value={FEED_FILTER_ALL} className="cursor-pointer rounded-lg py-2.5 pl-2">
                    <span className="flex items-center gap-2.5">
                      <LayoutGrid className="h-4 w-4 shrink-0 text-[#8EA07E]" aria-hidden />
                      Todas las categorías
                    </span>
                  </SelectItem>
                  <SelectItem value={FEED_FILTER_SOLO_PUBLICIDADES} className="cursor-pointer rounded-lg py-2.5 pl-2">
                    <span className="flex items-center gap-2.5">
                      <Megaphone className="h-4 w-4 shrink-0 text-[#8EA07E]" aria-hidden />
                      Solo publicidades
                    </span>
                  </SelectItem>
                </SelectGroup>
                <SelectSeparator className="my-1 bg-[#E8E0D5]/90" />
                <SelectGroup>
                  <SelectLabel className="px-2 text-[11px] font-bold uppercase tracking-wider text-[#9A8F84]">
                    Por categoría
                  </SelectLabel>
                  {postCategories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug} className="cursor-pointer rounded-lg py-2.5">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Feed: solo publicaciones; el buscador no filtra la barra de publicidad */}
        <section>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-base font-bold text-[#2C241C]">
              {feedFilter === FEED_FILTER_SOLO_PUBLICIDADES ? 'Publicidades' : 'Últimas publicaciones'}
            </h2>
            {hasSearch ? (
              <span className="text-xs font-medium text-[#6B5F54]">
                {combinedFeed.length} resultado{combinedFeed.length === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>

          {feedPubLoading && combinedFeed.length === 0 && !hasSearch ? (
            <div className="rounded-[1.25rem] border border-[#E8E0D5] bg-white p-8 text-center text-sm text-[#6B5F54] shadow-sm">
              Cargando publicaciones…
            </div>
          ) : combinedFeed.length === 0 ? (
            <div className="rounded-[1.25rem] border border-[#E8E0D5] bg-white p-8 text-center shadow-sm">
              <p className="text-[#6B5F54]">
                {hasSearch
                  ? 'No encontramos publicaciones ni publicidades con todas las palabras de tu búsqueda.'
                  : feedFilter === FEED_FILTER_SOLO_PUBLICIDADES
                    ? 'No hay publicidades activas por ahora.'
                    : feedFilter !== FEED_FILTER_ALL
                      ? 'No hay publicaciones aprobadas en esta categoría. Probá con otra opción en el selector de arriba.'
                      : 'Todavía no hay publicaciones aprobadas ni publicidades activas.'}
              </p>
              {!hasSearch && feedFilter === FEED_FILTER_ALL && (
                <Link
                  href="/create"
                  className="mt-4 inline-flex font-semibold hover:underline"
                  style={{ color: orange }}
                >
                  Sé el primero en publicar
                </Link>
              )}
            </div>
          ) : (
            <ul className="space-y-5">
              {combinedFeed.map((item, feedIndex) => {
                if (item.kind === 'post') {
                  const post = item.post
                  const catLabel = categoryLabelBySlug.get(post.category) ?? post.category
                  const when = formatDistanceToNow(post.createdAt, { addSuffix: true, locale: es })
                  const mainImage = post.images[0]
                  const isMine = currentUser?.id === post.authorId
                  return (
                    <li key={`post-${post.id}`} className="relative">
                      {isMine ? (
                        <div className="absolute right-3 top-3 z-10">
                          <DeleteOwnPostButton postId={post.id} authorId={post.authorId} size="icon" />
                        </div>
                      ) : null}
                      <Link
                        href={`/post/${post.id}`}
                        className="block overflow-hidden rounded-[1.25rem] border border-[#E8E0D5] bg-white shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className={`flex items-start gap-3 p-4 pb-3 ${isMine ? 'pr-14' : ''}`}>
                          <Avatar className="h-11 w-11 border-2 border-[#F9F5F0]">
                            <AvatarImage src={post.authorAvatar} alt={post.authorName} />
                            <AvatarFallback
                              className="text-xs font-bold text-white"
                              style={{ backgroundColor: sage }}
                            >
                              {authorInitials(post.authorName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[#2C241C]">{post.authorName}</p>
                            <p className="text-xs text-[#6B5F54]">
                              {when}
                              <span className="mx-1.5 text-[#C4B8A8]">•</span>
                              Vecino/a • {catLabel}
                            </p>
                          </div>
                        </div>
                        <div className="px-4 pb-3">
                          <h3 className="font-bold text-[#2C241C]">{post.title}</h3>
                          {post.description ? (
                            <p className="mt-1 line-clamp-3 text-sm text-[#3D3429]">{post.description}</p>
                          ) : null}
                        </div>
                        {mainImage ? (
                          <div className="aspect-[16/10] w-full overflow-hidden bg-[#E8E0D5]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={mainImage} alt="" className="h-full w-full object-cover" />
                          </div>
                        ) : null}
                      </Link>
                    </li>
                  )
                }

                const pub = item.publicidad
                const pubCatLabel =
                  publicidadCategories.find((c) => c.slug === pub.category)?.label ?? pub.category
                const when = formatDistanceToNow(pub.createdAt, { addSuffix: true, locale: es })
                const pubImages = getPublicidadImageUrls(pub)
                const mainPubImage = pubImages[0]

                return (
                  <li key={`pub-${pub.id}-${feedIndex}`}>
                    <div className="overflow-hidden rounded-[1.25rem] border-2 border-[#C06C3B]/45 bg-gradient-to-br from-[#FFF8F0] via-[#FDF6EE] to-[#E8F0E4] shadow-md ring-2 ring-[#8EA07E]/20">
                      <div className="flex items-center justify-between gap-2 border-b border-[#C06C3B]/25 bg-[#C06C3B]/12 px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8EA07E] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                          <Megaphone className="h-3.5 w-3.5" aria-hidden />
                          Publicidad
                        </span>
                        <span className="text-xs font-medium text-[#5C5348]">{when}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFeedPublicidad(pub)}
                        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C06C3B]/50 focus-visible:ring-offset-2"
                      >
                        <div className="flex items-start gap-3 p-4 pb-2">
                          <span
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-[#C06C3B]/35 bg-white shadow-sm"
                            aria-hidden
                          >
                            <Megaphone className="h-5 w-5" style={{ color: sage }} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-[#2C241C]">{pub.title}</h3>
                            <p className="mt-0.5 text-xs text-[#6B5F54]">
                              {pubCatLabel}
                              <span className="mx-1.5 text-[#C4B8A8]">•</span>
                              Tocá para ver más
                            </p>
                          </div>
                        </div>
                        {pub.description ? (
                          <div className="px-4 pb-3">
                            <p className="line-clamp-3 text-sm text-[#3D3429]">{pub.description}</p>
                          </div>
                        ) : null}
                        {mainPubImage ? (
                          <div className="aspect-[16/10] w-full overflow-hidden bg-[#E8E0D5]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={mainPubImage} alt="" className="h-full w-full object-cover" />
                          </div>
                        ) : null}
                      </button>
                      <div className="border-t border-[#C06C3B]/15 bg-white/60 px-4 py-3">
                        <PublicidadContactLinks
                          whatsappUrl={pub.whatsappUrl}
                          instagramUrl={pub.instagramUrl}
                          pulse
                          stopPropagationOnClick
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="mt-10 border-t border-[#E8E0D5] pt-6 lg:hidden">
          <h2 className="mb-3 px-1 text-[10px] font-bold uppercase tracking-widest text-[#9A8F84]">
            Zona publicitaria
          </h2>
          <ZonaPublicitariaCarousel />
        </section>

        {/* FABs */}
        <div className="pointer-events-none fixed bottom-6 right-4 z-30 flex flex-col items-end gap-3 sm:right-6 lg:right-8">
          <Link
            href="/publicidades"
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: sage }}
            aria-label="Publicidades"
          >
            <Megaphone className="h-5 w-5" />
          </Link>
          <Link
            href="/create"
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: orange }}
            aria-label="Crear publicación"
          >
            <PenLine className="h-6 w-6" />
          </Link>
          <Link
            href="/configuracion"
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#4A4540] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            aria-label="Ayuda y configuración"
          >
            <CircleHelp className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </>
  )
}
