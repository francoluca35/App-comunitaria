'use client'

import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useApp, type Category, type Post } from './providers'
import {
  Camera,
  Filter,
  LayoutGrid,
  Megaphone,
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
import { Card, CardContent } from '@/app/components/ui/card'
import { Carousel, CarouselContent, CarouselItem } from '@/app/components/ui/carousel'
import type { CarouselApi } from '@/app/components/ui/carousel'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { PublicidadModal } from '@/components/PublicidadModal'
import { PublicidadCommentsModal } from '@/components/PublicidadCommentsModal'
import { PublicidadContactLinks } from '@/components/PublicidadContactLinks'
import { type PublicidadDisplay } from '@/lib/publicidad-display'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { PublicidadFeedCard } from '@/components/PublicidadFeedCard'
import { PostCard } from '@/components/PostCard'
import { Skeleton } from '@/app/components/ui/skeleton'
import { PostCommentsModal } from '@/components/PostCommentsModal'
import { AvatarImageCropDialog } from '@/components/AvatarImageCropDialog'
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
import { useReferentPublicProfile } from '@/hooks/useReferentPublicProfile'
import { isMarioAccountEmail } from '@/lib/mario-account'

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
  /** Mario o administrador master: atajo para cambiar la foto del banner. */
  canEditReferentPhoto?: boolean
}

function CommunityHeroBanner({
  heroTitle: _heroTitle,
  heroSubtitle: _heroSubtitle,
  heroReferentName,
  heroReferentPhotoUrl,
  currentUserFirstName: _currentUserFirstName,
  canEditReferentPhoto = false,
}: CommunityHeroBannerProps) {
	return (
		<div className="relative mb-0 w-full overflow-hidden rounded-[1.25rem]">
			{/*
				Mismo ancho que las tarjetas y el feed (columna max-w-3xl con px del main). Imagen: w-full h-auto.
			*/}
			<div className="relative w-full overflow-hidden">
				<picture className="relative z-[1] block w-full leading-none">
					<source media="(min-width: 1024px)" srcSet="/Assets/fondo-inicio1.png" />
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src="/Assets/fondo-banner.jpeg"
						alt=""
						className="block h-auto w-full max-w-full select-none align-bottom"
					/>
				</picture>
				<div
					className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-black/35 via-black/15 to-black/45 lg:from-black/40 lg:via-black/20 lg:to-black/50"
					aria-hidden
				/>
				<div className="absolute inset-0 z-[3] flex flex-col items-center justify-center px-4 py-6 max-[360px]:px-3 max-[360px]:py-5 sm:px-6 sm:py-8 md:px-8 lg:py-10">
						<div className="mx-auto flex w-full max-w-[min(100%,16.25rem)] items-center gap-1.5 rounded-lg border border-white/45 bg-black/35 px-2 py-1.5 text-white shadow-[0_5px_14px_rgba(0,0,0,0.38)] backdrop-blur-md supports-[backdrop-filter]:bg-black/25 max-[360px]:gap-1 max-[360px]:px-1.5 max-[360px]:py-1 sm:max-w-[17rem] sm:gap-1.5 sm:px-2.5 sm:py-1.5 md:max-w-[17.5rem] lg:max-w-[18.25rem] lg:gap-2 lg:px-3 lg:py-2">
							<div className="relative shrink-0">
								<Avatar className="h-7 w-7 border border-white/45 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10">
									<AvatarImage src={heroReferentPhotoUrl} alt={heroReferentName} />
									<AvatarFallback
										className="text-[8px] text-white sm:text-[9px] lg:text-[10px]"
										style={{ backgroundColor: CST.bordo }}
									>
										{authorInitials(heroReferentName || 'MS')}
									</AvatarFallback>
								</Avatar>
								{canEditReferentPhoto ? (
									<Link
										href="/referente/foto"
										className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-white ring-1 ring-white/45 backdrop-blur-sm transition hover:bg-black/90 sm:h-5 sm:w-5 lg:h-6 lg:w-6"
										aria-label="Cambiar foto del referente"
									>
										<Camera className="h-2 w-2 sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3" strokeWidth={2.25} />
									</Link>
								) : null}
							</div>
							<Link
								href="/message/mario"
								className="min-w-0 flex-1 text-center text-[clamp(0.68rem,2.9vw,0.9rem)] font-medium leading-tight transition hover:opacity-95 active:scale-[0.99] md:text-[0.9rem] lg:text-[0.95rem]"
							>
								Habla con Mario Stebler
							</Link>
						</div>
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
  const { referent: referentPublic } = useReferentPublicProfile()
  const { query: searchQuery } = useFeedSearch()
  const approvedPosts = posts.filter((p) => p.status === 'approved')

  const heroReferentPhotoEffective =
    referentPublic?.avatar_url?.trim() || config.heroReferentPhotoUrl.trim() || HERO_REFERENT_IMAGE
  const canEditReferentPhoto = !!(
    currentUser &&
    (currentUser.isAdminMaster || isMarioAccountEmail(currentUser.email))
  )

  const [feedPublicidades, setFeedPublicidades] = useState<PublicidadDisplay[]>([])
  const [feedPubLoading, setFeedPubLoading] = useState(true)
  const [selectedFeedPublicidad, setSelectedFeedPublicidad] = useState<PublicidadDisplay | null>(null)
  const [selectedPublicidadComments, setSelectedPublicidadComments] = useState<PublicidadDisplay | null>(null)
  const [feedFilter, setFeedFilter] = useState<string>(FEED_FILTER_ALL)
  const [selectedPostModal, setSelectedPostModal] = useState<Post | null>(null)

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
  const [cropOpen, setCropOpen] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showAvatarPrompt =
    !authLoading && !!currentUser && !currentUser.avatar && !avatarDismissed

  const uploadAvatarFile = async (file: File) => {
    setUploadError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        const msg = 'Sesión expirada. Volvé a iniciar sesión.'
        setUploadError(msg)
        toast.error(msg)
        throw new Error('Sin sesión')
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
        const msg = typeof data.error === 'string' ? data.error : 'Error al subir la foto'
        setUploadError(msg)
        toast.error(msg)
        throw new Error('Subida rechazada')
      }
      await refreshUser()
      toast.success('Foto de perfil actualizada')
      setAvatarDismissed(true)
    } catch (err) {
      const known =
        err instanceof Error && (err.message === 'Subida rechazada' || err.message === 'Sin sesión')
      if (!known) {
        setUploadError('Error de conexión. Intentá de nuevo.')
        toast.error('Error de conexión. Intentá de nuevo.')
      }
      throw err
    } finally {
      setUploading(false)
    }
  }

  const handleAvatarFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadError(null)
    setCropFile(file)
    setCropOpen(true)
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
      <PublicidadCommentsModal
        open={!!selectedPublicidadComments}
        onOpenChange={(open) => !open && setSelectedPublicidadComments(null)}
        publicidad={selectedPublicidadComments}
        isLoggedIn={!!currentUser}
      />
			<PostCommentsModal post={selectedPostModal} onClose={() => setSelectedPostModal(null)} />
      <AvatarImageCropDialog
        open={cropOpen}
        onOpenChange={(open) => {
          setCropOpen(open)
          if (!open) setCropFile(null)
        }}
        file={cropFile}
        onConfirm={(file) => uploadAvatarFile(file)}
      />
      <Dialog open={showAvatarPrompt && !cropOpen} onOpenChange={(open) => !open && setAvatarDismissed(true)}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[#D8D2CC]">
          <DialogHeader>
            <DialogTitle>Agregá tu foto de perfil</DialogTitle>
            <DialogDescription>
              Así te identifican en la comunidad. Elegí una imagen JPG, PNG o WebP (máx. 2 MB); vas a poder moverla para
              encuadrarla antes de guardar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarFilePicked}
            />
            {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                type="button"
                className="w-full rounded-xl text-white hover:bg-[#5A000E]"
                style={{ backgroundColor: CST.bordo }}
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Elegir imagen
              </Button>
              <Button type="button" variant="outline" className="w-full rounded-xl" onClick={() => setAvatarDismissed(true)}>
                Más tarde
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <div className="relative w-full pb-28">
        {/* Banner: mismo ancho que tarjetas/feed + pastilla centrada */}
        <CommunityHeroBanner
          heroTitle={config.heroTitle}
          heroSubtitle={config.heroSubtitle}
          heroReferentName={config.heroReferentName}
          heroReferentPhotoUrl={heroReferentPhotoEffective}
          currentUserFirstName={currentUser ? firstName(currentUser.name) : null}
          canEditReferentPhoto={canEditReferentPhoto}
        />

        {/* Tarjetas de acción (separación solo respecto al banner, que va pegado al bloque superior) */}
        <div className="mt-5 mb-6 grid grid-cols-1 gap-5 max-sm:gap-5 sm:mt-6 sm:mb-7 sm:grid-cols-2 sm:gap-5 md:gap-6">
          <Link
            href="/create"
            className="group flex items-center justify-between gap-4 rounded-[1.25rem] p-5 max-sm:p-[1.35rem] text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99] hover:brightness-105 sm:p-6"
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
              className="group flex items-center justify-between gap-4 rounded-[1.25rem] p-5 max-sm:p-[1.35rem] text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99] hover:brightness-105 sm:p-6"
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
              className="flex items-center justify-between gap-4 rounded-[1.25rem] border-2 border-dashed border-[#8B0015]/20 bg-white p-5 max-sm:p-[1.35rem] text-[#2B2B2B] shadow-sm sm:p-6"
            >
              <div>
                <h3 className="text-lg font-bold text-[#8B0015]">Crear publicidad</h3>
                <p className="mt-1 text-sm text-[#7A5C52]">Iniciá sesión para publicitar</p>
              </div>
              <Megaphone className="h-8 w-8 shrink-0 text-[#7A5C52]" />
            </Link>
          )}
        </div>

        {/* Feed: solo publicaciones; el buscador no filtra la barra de publicidad */}
        <section>
          <div className="mb-4 flex items-center justify-between max-sm:mb-5 sm:mb-5">
            <h2 className="font-montserrat-only text-base font-bold text-[#8B0015]">
              {feedFilter === FEED_FILTER_SOLO_PUBLICIDADES ? 'Publicidades' : 'Últimas publicaciones'}
            </h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Select value={feedFilter} onValueChange={setFeedFilter}>
                <SelectTrigger
                  size="default"
                  aria-label="Filtrar el feed por categoría o solo publicidades"
                  className="h-11 w-11 shrink-0 justify-center rounded-2xl border-2 border-[#D8D2CC] bg-white p-0 shadow-sm transition-[border-color,box-shadow] hover:border-[#8B0015]/35 hover:shadow focus-visible:border-[#8B0015] focus-visible:ring-[3px] focus-visible:ring-[#8B0015]/20 data-[size=default]:h-11 [&>svg:last-child]:hidden"
                >
                  <Filter className="h-5 w-5 text-[#8B0015]" aria-hidden />
                  <span className="sr-only">
                    <SelectValue />
                  </span>
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
              {hasSearch ? (
                <span className="text-xs font-medium text-[#7A5C52]">
                  {combinedFeed.length} resultado{combinedFeed.length === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
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
                      ? 'No hay publicaciones aprobadas en esta categoría. Probá con otra opción en el filtro.'
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
            <ul className="-mx-3 m-0 flex w-[calc(100%+1.5rem)] list-none flex-col gap-5 p-0 sm:mx-0 sm:w-full sm:gap-5">
              {combinedFeed.map((item, feedIndex) => {
                if (item.kind === 'post') {
                  const post = item.post
                  return (
                    <li key={`post-${post.id}`}>
                      <PostCard
                        post={post}
                        onOpenComments={(p) => setSelectedPostModal(p)}
                        priority={feedIndex < 2}
                      />
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
                      onOpenComments={() => setSelectedPublicidadComments(pub)}
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
      </div>
    </>
  )
}
