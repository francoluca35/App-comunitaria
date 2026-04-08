'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import Link from 'next/link'
import { House, Menu, Megaphone, Search, Type } from 'lucide-react'
import { DashboardSidebar } from './DashboardSidebar'
import { NotificationBell } from './NotificationBell'
import { PublicidadContactLinks } from '@/components/PublicidadContactLinks'
import { PublicidadModal } from '@/components/PublicidadModal'
import type { PublicidadDisplay } from '@/lib/publicidad-display'
import { useApp } from '@/app/providers'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { CST } from '@/lib/cst-theme'

const LATERAL_AD_INTERVAL_MS = 5000
const LATERAL_ADS_PER_VIEW = 2

/** Búsqueda de publicaciones (título, descripción, autor) en inicio y categorías. No filtra la barra de publicidad. */
type FeedSearchContextValue = {
  query: string
  setQuery: (q: string) => void
}

const FeedSearchContext = createContext<FeedSearchContextValue | null>(null)

export function useFeedSearch() {
  const ctx = useContext(FeedSearchContext)
  return ctx ?? { query: '', setQuery: () => {} }
}

function shortDisplayName(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length <= 1) return parts[0]?.slice(0, 14) ?? 'Usuario'
  return `${parts[0]} ${parts[1]?.[0]?.toUpperCase() ?? ''}.`
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [lateralAds, setLateralAds] = useState<PublicidadDisplay[]>([])
  const [lateralLoaded, setLateralLoaded] = useState(false)
  const [lateralDetail, setLateralDetail] = useState<PublicidadDisplay | null>(null)
  const [lateralPairIndex, setLateralPairIndex] = useState(0)
  const { currentUser } = useApp()

  const [feedQuery, setFeedQuery] = useState('')
  const setQuery = useCallback((q: string) => setFeedQuery(q), [])

  const feedSearchValue = useMemo(
    () => ({ query: feedQuery, setQuery }),
    [feedQuery, setQuery]
  )

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
        const list: PublicidadDisplay[] = rows.map((r) => ({
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
        setLateralAds(list)
      })
      .catch(() => {
        if (!cancelled) setLateralAds([])
      })
      .finally(() => {
        if (!cancelled) setLateralLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const lateralPairCount = useMemo(() => {
    if (lateralAds.length === 0) return 0
    return Math.ceil(lateralAds.length / LATERAL_ADS_PER_VIEW)
  }, [lateralAds.length])

  const visibleLateralAds = useMemo(() => {
    if (lateralAds.length === 0) return []
    const start = lateralPairIndex * LATERAL_ADS_PER_VIEW
    return lateralAds.slice(start, start + LATERAL_ADS_PER_VIEW)
  }, [lateralAds, lateralPairIndex])

  useEffect(() => {
    setLateralPairIndex(0)
  }, [lateralAds])

  useEffect(() => {
    if (lateralPairCount <= 1) return
    const id = window.setInterval(() => {
      setLateralPairIndex((i) => (i + 1) % lateralPairCount)
    }, LATERAL_AD_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [lateralPairCount])

  /** Menú móvil: no scrollear el feed de fondo; solo el panel lateral (iOS incl.). */
  useEffect(() => {
    if (!sidebarOpen) return

    const html = document.documentElement
    const body = document.body
    const scrollY = window.scrollY

    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const prevBodyPosition = body.style.position
    const prevBodyTop = body.style.top
    const prevBodyLeft = body.style.left
    const prevBodyRight = body.style.right
    const prevBodyWidth = body.style.width

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'

    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      body.style.position = prevBodyPosition
      body.style.top = prevBodyTop
      body.style.left = prevBodyLeft
      body.style.right = prevBodyRight
      body.style.width = prevBodyWidth
      window.scrollTo(0, scrollY)
    }
  }, [sidebarOpen])

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false)
    }
    closeOnDesktop()
    window.addEventListener('resize', closeOnDesktop)
    return () => window.removeEventListener('resize', closeOnDesktop)
  }, [])

  const headerIconBtn =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/12 text-white shadow-sm hover:bg-white/22 transition-colors'

  return (
    <FeedSearchContext.Provider value={feedSearchValue}>
      <div className="flex min-h-screen" style={{ backgroundColor: CST.fondo }}>
        <PublicidadModal
          open={!!lateralDetail}
          onOpenChange={(open) => !open && setLateralDetail(null)}
          publicidad={lateralDetail}
        />

        <div
          className={`fixed inset-y-0 left-0 z-40 flex h-[100dvh] w-64 max-h-[100dvh] flex-col overflow-hidden lg:h-auto lg:max-h-none lg:flex-none ${
            sidebarOpen ? 'block' : 'hidden'
          } lg:block`}
        >
          <DashboardSidebar onNavigate={() => setSidebarOpen(false)} />
        </div>

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 z-30 touch-none overscroll-none bg-[#2B2B2B]/45 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col lg:ml-64 xl:mr-[280px]">
          <header
            className="sticky top-0 z-20 border-b border-white/15 backdrop-blur-md"
            style={{ backgroundColor: `${CST.bordo}f0` }}
          >
            <div className="flex flex-col gap-3 px-3 py-3 sm:px-4 lg:px-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-2xl text-white hover:bg-white/12 lg:hidden"
                  aria-label="Abrir menú"
                >
                  <Menu className="h-6 w-6" />
                </button>

                <Link
                  href="/"
                  className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:flex-initial lg:min-w-[200px]"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white shadow-sm"
                  >
                    <House className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span className="font-montserrat-only truncate font-bold tracking-tight text-white text-base sm:text-lg">
                    CST Comunidad
                  </span>
                </Link>

                <div className="hidden min-w-0 flex-1 justify-center px-4 md:flex">
                  <label className="relative w-full max-w-xl">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A5C52]" />
                    <input
                      type="search"
                      value={feedQuery}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar en publicaciones…"
                      className="w-full rounded-2xl border border-[#D8D2CC] bg-white py-2.5 pl-11 pr-4 text-sm placeholder:text-[#7A5C52]/70 shadow-sm outline-none focus:border-[#8B0015] focus:ring-2 focus:ring-[#8B0015]/20 text-[#2B2B2B]"
                    />
                  </label>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                  <Link
                    href="/create"
                    className={`${headerIconBtn} hidden md:flex`}
                    aria-label="Nueva publicación"
                  >
                    <Type className="h-5 w-5" />
                  </Link>
                  {currentUser && (
                    <NotificationBell
                      triggerClassName="rounded-2xl border border-white/25 bg-white text-[#2B2B2B] shadow-sm hover:bg-white/95"
                      badgeClassName="bg-[#8B0015]"
                    />
                  )}
                  {currentUser ? (
                    <Link
                      href="/profile"
                      className="ml-0.5 flex items-center gap-2 rounded-2xl py-1 pl-1 pr-2 hover:bg-white/12 sm:pr-3"
                    >
                      <Avatar className="h-9 w-9 border-2 border-white/40 shadow-sm">
                        <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                        <AvatarFallback
                          className="text-xs font-bold text-white"
                          style={{ backgroundColor: CST.acento }}
                        >
                          {currentUser.name?.[0]?.toUpperCase() ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden text-sm font-semibold text-white sm:inline max-w-[7rem] truncate">
                        {shortDisplayName(currentUser.name)}
                      </span>
                    </Link>
                  ) : (
                    <Link
                      href="/login"
                      className="rounded-2xl px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5A000E]"
                      style={{ backgroundColor: CST.bordo }}
                    >
                      Entrar
                    </Link>
                  )}
                </div>
              </div>

              <div className="md:hidden">
                <label className="relative block w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A5C52]" />
                  <input
                    type="search"
                    value={feedQuery}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar en publicaciones…"
                    className="w-full rounded-2xl border border-[#D8D2CC] bg-white py-2.5 pl-10 pr-3 text-sm placeholder:text-[#7A5C52]/70 shadow-sm outline-none focus:border-[#8B0015] focus:ring-2 focus:ring-[#8B0015]/20 text-[#2B2B2B]"
                  />
                </label>
              </div>
            </div>
          </header>

          <main className="flex flex-1 justify-center overflow-auto px-3 py-5 sm:px-4 lg:px-8">
            <div className="w-full max-w-3xl">{children}</div>
          </main>
        </div>

        <aside
          className="fixed inset-y-0 right-0 z-20 hidden w-[280px] flex-col border-l border-[#D8D2CC] xl:flex"
          style={{ backgroundColor: CST.fondo }}
          aria-label="Publicidad lateral"
        >
          <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto p-4">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <h3 className="font-montserrat-only text-xs font-semibold uppercase tracking-wider text-[#7A5C52]">
                Publicidad
              </h3>
              <Link
                href="/cartelera"
                className="shrink-0 text-xs font-semibold text-[#8B0015] hover:underline"
              >
                Ver todas
              </Link>
            </div>
            <div
              key={lateralPairIndex}
              className="animate-in fade-in-0 zoom-in-95 flex min-h-0 flex-1 flex-col space-y-3 duration-300"
            >
              {!lateralLoaded ? (
                <div className="flex flex-1 items-center justify-center py-8 text-sm text-[#7A5C52]">
                  Cargando…
                </div>
              ) : lateralAds.length === 0 ? (
                <p className="py-2 text-xs text-[#7A5C52]">
                  Todavía no hay publicidades con esta opción activas.
                </p>
              ) : (
                visibleLateralAds.map((p) => (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-2xl border border-[#D8D2CC] bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => setLateralDetail(p)}
                      className="w-full rounded-t-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B0015]/35 focus-visible:ring-offset-2"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-[#D8D2CC]/35">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Megaphone className="h-10 w-10 text-[#7A5C52]/50" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="line-clamp-2 text-xs font-semibold text-[#2B2B2B]">{p.title}</p>
                      </div>
                    </button>
                    <div className="px-2.5 pb-2.5">
                      <PublicidadContactLinks
                        whatsappUrl={p.whatsappUrl}
                        instagramUrl={p.instagramUrl}
                        size="sidebar"
                        stopPropagationOnClick
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </FeedSearchContext.Provider>
  )
}
