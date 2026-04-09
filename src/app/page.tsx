'use client'

import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
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
import { type PublicidadDisplay } from '@/lib/publicidad-display'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { DeleteOwnPostButton } from '@/components/DeleteOwnPostButton'
import { PostPublicationActions } from '@/components/PostPublicationActions'
import { PostImageWithLightbox } from '@/components/PostImageWithLightbox'
import { PublicidadFeedCard } from '@/components/PublicidadFeedCard'
import { PostAuthorNameCategoryRow } from '@/components/PostAuthorNameCategoryRow'
import { Skeleton } from '@/app/components/ui/skeleton'
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
import { CST } from '@/lib/cst-theme'

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

/** Imagen fija del referente en el banner si no hay URL en configuración (`public/Assets/mario.png`). */
const HERO_REFERENT_IMAGE = '/Assets/mario2.png'

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

type CommunityHeroBannerProps = {
  heroTitle: string
  heroSubtitle: string
  heroReferentName: string
  heroReferentPhotoUrl: string
  currentUserFirstName: string | null
}

function CommunityHeroBanner({
  heroTitle,
  heroSubtitle,
  heroReferentName,
  heroReferentPhotoUrl,
  currentUserFirstName,
}: CommunityHeroBannerProps) {
  const referentFirst = firstName(heroReferentName || 'Mario')
  const ctaMobileLabel = `habla con ${referentFirst.toLowerCase()}`

  const welcomeLine =
    currentUserFirstName != null && currentUserFirstName !== ''
      ? `Hola ${currentUserFirstName}, ${heroSubtitle}`
      : heroSubtitle

  const ctaClass =
    'flex w-full items-center justify-center rounded-lg bg-[#8B0015] py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#6d0010] active:scale-[0.99]'

  return (
    <div className="mb-6 overflow-hidden rounded-2xl bg-[#E0E0E0] shadow-sm ring-1 ring-black/[0.07]">
      {/* Mobile: centrado — título, bajada, referente, CTA (diseño mockup) */}
      <div className="px-5 pb-7 pt-7 sm:hidden">
        <div className="mx-auto flex max-w-sm flex-col items-center text-center">
          <h2 className="font-hero-display text-balance text-[1.35rem] font-bold uppercase leading-[1.15] tracking-[0.02em] text-[#8B0015]">
            {heroTitle}
          </h2>
          <p className="mt-3 text-sm font-medium leading-snug text-[#1a1a1a]">{welcomeLine}</p>

          <Avatar className="mt-6 h-[7.25rem] w-[7.25rem] border-4 border-[#8B0015] shadow-md">
            <AvatarImage src={heroReferentPhotoUrl} alt={heroReferentName} />
            <AvatarFallback
              className="text-2xl font-bold text-white"
              style={{ backgroundColor: CST.bordo }}
            >
              {authorInitials(heroReferentName || 'MS')}
            </AvatarFallback>
          </Avatar>
          <p className="mt-4 text-base font-bold text-[#8B0015]">{heroReferentName}</p>
          <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#1a1a1a]">
            Referente oficial
          </p>

          <Link href="/message" className={`${ctaClass} mt-7 max-w-[17.5rem]`}>
            {ctaMobileLabel}
          </Link>
        </div>
      </div>

      {/* Desktop: dos columnas — contenido a la izquierda, referente a la derecha */}
      <div className="hidden gap-10 px-8 py-8 sm:flex sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#1a1a1a]">Tu comunidad</p>
          <h2 className="font-hero-display max-w-xl text-balance text-3xl font-bold uppercase leading-tight tracking-wide text-[#8B0015] lg:text-[2rem]">
            {heroTitle}
          </h2>
          <p className="max-w-lg pt-1 text-base font-medium leading-snug text-[#1a1a1a]">{welcomeLine}</p>
          <Link href="/message" className={`${ctaClass} mt-2 max-w-md`}>
            Habla con {referentFirst}!
          </Link>
        </div>

        <div className="flex w-[13.5rem] shrink-0 flex-col items-center border-l border-black/10 pl-10">
          <Avatar className="h-32 w-32 border-4 border-[#8B0015] shadow-md">
            <AvatarImage src={heroReferentPhotoUrl} alt={heroReferentName} />
            <AvatarFallback
              className="text-3xl font-bold text-white"
              style={{ backgroundColor: CST.bordo }}
            >
              {authorInitials(heroReferentName || 'MS')}
            </AvatarFallback>
          </Avatar>
          <p className="mt-5 text-center text-lg font-bold text-[#8B0015]">{heroReferentName}</p>
          <p className="mt-1 text-center text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#1a1a1a]">
            Referente oficial
          </p>
        </div>
      </div>
    </div>
  )
}

/** Placeholder del feed mientras llegan publicaciones / publicidades (servidor lento o red). */
function FeedListSkeleton() {
  return (
    <ul
      className="-mx-3 m-0 flex w-[calc(100%+1.5rem)] list-none flex-col gap-8 p-0 sm:mx-0 sm:w-full sm:gap-5"
      aria-busy="true"
      aria-label="Cargando publicaciones"
    >
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <div className="overflow-hidden bg-white sm:rounded-none sm:border sm:border-[#D8D2CC]">
            <div className="flex items-start gap-3 p-4 pb-3">
              <Skeleton className="h-11 w-11 shrink-0 rounded-full border-2 border-[#D8D2CC]/40 bg-[#D4CEC8]/55" />
              <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                <Skeleton className="h-4 w-[40%] max-w-[180px] rounded-md bg-[#D4CEC8]/50" />
                <Skeleton className="h-3 w-[55%] max-w-[220px] rounded-md bg-[#D4CEC8]/45" />
              </div>
            </div>
            <div className="space-y-2 px-4 pb-3">
              <Skeleton className="h-5 w-full rounded-md bg-[#D4CEC8]/55" />
              <Skeleton className="h-4 w-[92%] rounded-md bg-[#D4CEC8]/45" />
              <Skeleton className="h-4 w-[68%] rounded-md bg-[#D4CEC8]/40" />
            </div>
            <Skeleton className="mx-0 h-[min(280px,52vw)] w-full rounded-none border-y border-[#CED0D4]/40 bg-[#D4CEC8]/60" />
            <div className="bg-white px-0 py-0">
              <Skeleton className="h-10 w-full rounded-none border-t border-[#CED0D4] bg-[#E9EBEE] sm:h-11 sm:bg-[#E9EBEE]" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
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
        <div className="py-6 text-center text-sm text-[#7A5C52]">Cargando publicidades…</div>
      ) : ads.length === 0 ? (
        <p className="px-2 py-4 text-center text-xs text-[#7A5C52]">
          No hay publicidades en la barra lateral activas. Podés ver todas en{' '}
          <Link href="/cartelera" className="font-semibold underline" style={{ color: CST.bordo }}>
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
                  className="w-full overflow-hidden rounded-2xl border border-[#D8D2CC] bg-white text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B0015]/35"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#D8D2CC]/30">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Megaphone className="h-8 w-8 text-[#7A5C52]/50" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-xs font-semibold text-[#2B2B2B]">{p.title}</p>
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
  const {
    posts,
    currentUser,
    refreshUser,
    authLoading,
    postCategories,
    publicidadCategories,
    refreshPublicidadCategories,
    config,
    postsLoading,
    postsHasMore,
    postsLoadingMore,
    loadMorePosts,
    commentCountByPostId,
  } = useApp()
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

  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null)
  const onLoadMore = useCallback(() => {
    void loadMorePosts()
  }, [loadMorePosts])

  useEffect(() => {
    if (feedFilter === FEED_FILTER_SOLO_PUBLICIDADES) return
    if (!postsHasMore || postsLoadingMore) return
    const el = loadMoreSentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting)
        if (hit) onLoadMore()
      },
      { root: null, rootMargin: '280px', threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [feedFilter, postsHasMore, postsLoadingMore, onLoadMore, combinedFeed.length])

  return (
    <>
      <PublicidadModal
        open={!!selectedFeedPublicidad}
        onOpenChange={(open) => !open && setSelectedFeedPublicidad(null)}
        publicidad={selectedFeedPublicidad}
      />
      <Dialog open={showAvatarPrompt} onOpenChange={(open) => !open && setAvatarDismissed(true)}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[#D8D2CC]">
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
                className="block w-full text-sm text-[#7A5C52] file:mr-4 file:rounded-xl file:border-0 file:bg-[#8B0015] file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-[#5A000E]"
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
                className="rounded-xl text-white hover:bg-[#5A000E]"
                style={{ backgroundColor: CST.bordo }}
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
        {/* Banner: layout distinto en mobile (centrado) vs desktop (dos columnas), según diseño */}
        <CommunityHeroBanner
          heroTitle={config.heroTitle}
          heroSubtitle={config.heroSubtitle}
          heroReferentName={config.heroReferentName}
          heroReferentPhotoUrl={config.heroReferentPhotoUrl.trim() || HERO_REFERENT_IMAGE}
          currentUserFirstName={currentUser ? firstName(currentUser.name) : null}
        />

        {/* Tarjetas de acción */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/create"
            className="group flex items-center justify-between gap-4 rounded-[1.25rem] p-5 text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99] hover:brightness-105"
            style={{ backgroundColor: CST.bordo }}
          >
            <div>
              <h3 className="text-lg font-bold text-white">Crear publicación</h3>
              <p className="mt-1 text-sm text-white/90">Compartí con tu comunidad</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <Sparkles className="h-6 w-6" />
            </span>
          </Link>

          {currentUser ? (
            <Link
              href="/cartelera/crear"
              className="group flex items-center justify-between gap-4 rounded-[1.25rem] p-5 text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99] hover:brightness-105"
              style={{ backgroundColor: CST.acento }}
            >
              <div>
                <h3 className="text-lg font-bold text-white">Crear publicidad</h3>
                <p className="mt-1 text-sm text-white/90">Gestioná anuncios</p>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                <TrendingUp className="h-6 w-6" />
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-between gap-4 rounded-[1.25rem] border-2 border-dashed border-[#8B0015]/20 bg-white p-5 text-[#2B2B2B] shadow-sm"
            >
              <div>
                <h3 className="text-lg font-bold text-[#8B0015]">Crear publicidad</h3>
                <p className="mt-1 text-sm text-[#7A5C52]">Iniciá sesión para publicitar</p>
              </div>
              <Megaphone className="h-8 w-8 shrink-0 text-[#7A5C52]" />
            </Link>
          )}
        </div>

        {/* Filtro: categorías de publicaciones o solo publicidades */}
        <div
          className="mb-6 rounded-[1.25rem] border border-[#8B0015]/12 p-4 shadow-sm sm:p-5"
          style={{ backgroundColor: CST.fondo }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
                style={{ background: `linear-gradient(145deg, ${CST.bordo} 0%, ${CST.bordoDark} 100%)` }}
              >
                <Filter className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#8B0015] font-montserrat-only">¿Qué querés ver en el feed?</p>
                <p className="mt-0.5 text-xs leading-snug text-[#7A5C52]">
                  Filtrá por categoría (ventas, avisos, etc.) o mostrá solo publicidades.
                </p>
              </div>
            </div>
            <Select value={feedFilter} onValueChange={setFeedFilter}>
              <SelectTrigger
                size="default"
                className="h-12 w-full min-w-0 rounded-2xl border-2 border-[#D8D2CC] bg-white px-4 text-left font-semibold text-[#2B2B2B] shadow-sm transition-[border-color,box-shadow] hover:border-[#8B0015]/35 hover:shadow data-[size=default]:h-12 focus-visible:border-[#8B0015] focus-visible:ring-[3px] focus-visible:ring-[#8B0015]/20 sm:max-w-[min(100%,22rem)]"
              >
                <SelectValue placeholder="Elegí una opción" />
              </SelectTrigger>
              <SelectContent className="max-h-[min(70vh,24rem)] rounded-xl border-[#D8D2CC] shadow-xl">
                <SelectGroup>
                  <SelectLabel className="px-2 text-[11px] font-bold uppercase tracking-wider text-[#7A5C52]/90">
                    General
                  </SelectLabel>
                  <SelectItem value={FEED_FILTER_ALL} className="cursor-pointer rounded-lg py-2.5 pl-2">
                    <span className="flex items-center gap-2.5">
                      <LayoutGrid className="h-4 w-4 shrink-0 text-[#7A5C52]" aria-hidden />
                      Todas las categorías
                    </span>
                  </SelectItem>
                  <SelectItem value={FEED_FILTER_SOLO_PUBLICIDADES} className="cursor-pointer rounded-lg py-2.5 pl-2">
                    <span className="flex items-center gap-2.5">
                      <Megaphone className="h-4 w-4 shrink-0 text-[#7A5C52]" aria-hidden />
                      Solo publicidades
                    </span>
                  </SelectItem>
                </SelectGroup>
                <SelectSeparator className="my-1 bg-[#D8D2CC]" />
                <SelectGroup>
                  <SelectLabel className="px-2 text-[11px] font-bold uppercase tracking-wider text-[#7A5C52]/90">
                    Por categoría
                  </SelectLabel>
                  {postCategories
                    .filter((c) => c.slug !== 'propuesta')
                    .map((c) => (
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
            <h2 className="font-montserrat-only text-base font-bold text-[#8B0015]">
              {feedFilter === FEED_FILTER_SOLO_PUBLICIDADES ? 'Publicidades' : 'Últimas publicaciones'}
            </h2>
            {hasSearch ? (
              <span className="text-xs font-medium text-[#7A5C52]">
                {combinedFeed.length} resultado{combinedFeed.length === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>

          {(feedPubLoading || postsLoading) && combinedFeed.length === 0 && !hasSearch ? (
            <FeedListSkeleton />
          ) : combinedFeed.length === 0 ? (
            <div className="rounded-[1.25rem] border border-[#D8D2CC] bg-white p-8 text-center shadow-sm">
              <p className="text-[#7A5C52]">
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
                  style={{ color: CST.bordo }}
                >
                  Sé el primero en publicar
                </Link>
              )}
            </div>
          ) : (
            <ul className="-mx-3 m-0 flex w-[calc(100%+1.5rem)] list-none flex-col gap-8 p-0 sm:mx-0 sm:w-full sm:gap-5">
              {combinedFeed.map((item, feedIndex) => {
                if (item.kind === 'post') {
                  const post = item.post
                  const when = formatDistanceToNow(post.createdAt, { addSuffix: true, locale: es })
                  const isMine = currentUser?.id === post.authorId
                  const feedCommentCount =
                    config.commentsEnabled &&
                    Object.prototype.hasOwnProperty.call(commentCountByPostId, post.id)
                      ? commentCountByPostId[post.id]
                      : undefined
                  return (
                    <li key={`post-${post.id}`} className="relative">
                      {isMine ? (
                        <div className="absolute right-2 top-3 z-10 sm:right-3">
                          <DeleteOwnPostButton postId={post.id} authorId={post.authorId} size="icon" />
                        </div>
                      ) : null}
                      <div className="overflow-hidden bg-white sm:rounded-none sm:border sm:border-[#D8D2CC]">
                        <Link
                          href={`/post/${post.id}`}
                          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8B0015]/25"
                        >
                          <div className={`flex items-start gap-3 p-4 pb-2 ${isMine ? 'pr-14' : ''}`}>
                            <Avatar className="h-11 w-11 shrink-0 border-2 border-[#D8D2CC]">
                              <AvatarImage src={post.authorAvatar} alt={post.authorName} />
                              <AvatarFallback
                                className="text-xs font-bold text-white"
                                style={{ backgroundColor: CST.acento }}
                              >
                                {authorInitials(post.authorName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <PostAuthorNameCategoryRow
                                authorName={post.authorName}
                                category={post.category}
                                nameClassName="font-semibold"
                              />
                              <p className="mt-0.5 text-xs leading-tight text-[#7A5C52]">{when}</p>
                            </div>
                          </div>
                          <div className="px-4 pb-3 pt-0">
                            <h3 className="font-montserrat-only font-bold leading-snug text-[#2B2B2B]">{post.title}</h3>
                            {post.description ? (
                              <p className="mt-0.5 line-clamp-3 text-sm text-[#2B2B2B]">{post.description}</p>
                            ) : null}
                          </div>
                        </Link>
                        {post.media.length > 0 ? (
                          <PostImageWithLightbox
                            media={post.media}
                            alt={post.title}
                            variant="feed"
                            priority={feedIndex < 2}
                          />
                        ) : null}
                        <div className="bg-white px-0 py-0">
                          <PostPublicationActions
                            postId={post.id}
                            whatsappNumber={config.whatsappEnabled ? post.whatsappNumber : undefined}
                            showComments={config.commentsEnabled}
                            commentCount={feedCommentCount}
                          />
                        </div>
                      </div>
                    </li>
                  )
                }

                const pub = item.publicidad
                const pubCatLabel =
                  publicidadCategories.find((c) => c.slug === pub.category)?.label ?? pub.category

                return (
                  <li key={`pub-${pub.id}-${feedIndex}`}>
                    <PublicidadFeedCard
                      publicidad={pub}
                      categoryLabel={pubCatLabel}
                      onOpenDetail={() => setSelectedFeedPublicidad(pub)}
                      imagePriority={feedIndex < 2}
                    />
                  </li>
                )
              })}
              {feedFilter !== FEED_FILTER_SOLO_PUBLICIDADES && postsHasMore ? (
                <li className="flex flex-col items-center gap-2 py-4" aria-live="polite">
                  <div ref={loadMoreSentinelRef} className="h-1 w-full shrink-0" />
                  {postsLoadingMore ? (
                    <span className="text-xs font-medium text-[#7A5C52]">Cargando más publicaciones…</span>
                  ) : null}
                </li>
              ) : null}
            </ul>
          )}
        </section>

        <section className="mt-10 border-t border-[#8B0015]/12 pt-6 lg:hidden">
          <h2 className="mb-3 px-1 text-[10px] font-bold uppercase tracking-widest text-[#7A5C52]/90 font-montserrat-only">
            Zona publicitaria
          </h2>
          <ZonaPublicitariaCarousel />
        </section>

        {/* FABs */}
        <div className="pointer-events-none fixed bottom-6 right-4 z-30 flex flex-col items-end gap-3 sm:right-6 lg:right-8">
          <Link
            href="/cartelera"
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#634942] active:scale-95"
            style={{ backgroundColor: CST.acento }}
            aria-label="Publicidades"
          >
            <Megaphone className="h-5 w-5" />
          </Link>
          <Link
            href="/create"
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#5A000E] active:scale-95"
            style={{ backgroundColor: CST.bordo }}
            aria-label="Crear publicación"
          >
            <PenLine className="h-6 w-6" />
          </Link>
          <Link
            href="/configuracion"
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: CST.bordoDark }}
            aria-label="Ayuda y configuración"
          >
            <CircleHelp className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </>
  )
}
