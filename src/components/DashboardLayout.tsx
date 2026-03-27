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

const cream = '#F9F5F0'
const accent = '#C06C3B'

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

  const headerIconBtn =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#E8E0D5] bg-white text-[#3D3429] shadow-sm hover:bg-[#FCFAF7] transition-colors'

  return (
    <FeedSearchContext.Provider value={feedSearchValue}>
      <div className="flex min-h-screen" style={{ backgroundColor: cream }}>
        <PublicidadModal
          open={!!lateralDetail}
          onOpenChange={(open) => !open && setLateralDetail(null)}
          publicidad={lateralDetail}
        />

        <div
          className={`fixed inset-y-0 left-0 z-40 w-64 lg:block ${
            sidebarOpen ? 'block' : 'hidden'
          }`}
        >
          <DashboardSidebar onNavigate={() => setSidebarOpen(false)} />
        </div>

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 z-30 bg-[#3D3429]/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col lg:ml-64 xl:mr-[280px]">
          <header
            className="sticky top-0 z-20 border-b border-[#E8E0D5]/80 bg-[#F9F5F0]/95 backdrop-blur-md"
            style={{ backgroundColor: `${cream}f2` }}
          >
            <div className="flex flex-col gap-3 px-3 py-3 sm:px-4 lg:px-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-2xl text-[#3D3429] hover:bg-white/80 lg:hidden"
                  aria-label="Abrir menú"
                >
                  <Menu className="h-6 w-6" />
                </button>

                <Link
                  href="/"
                  className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:flex-initial lg:min-w-[200px]"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E8E0D5] bg-white shadow-sm"
                    style={{ color: accent }}
                  >
                    <House className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span className="truncate font-bold tracking-tight text-[#2C241C] text-base sm:text-lg">
                    CST Comunidad
                  </span>
                </Link>

                <div className="hidden min-w-0 flex-1 justify-center px-4 md:flex">
                  <label className="relative w-full max-w-xl">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A8F84]" />
                    <input
                      type="search"
                      value={feedQuery}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar en publicaciones…"
                      className="w-full rounded-2xl border border-[#E8E0D5] bg-white py-2.5 pl-11 pr-4 text-sm text-[#2C241C] placeholder:text-[#9A8F84] shadow-sm outline-none ring-[#C06C3B]/25 focus:ring-2"
                    />
                  </label>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                  <Link href="/create" className={headerIconBtn} aria-label="Nueva publicación">
                    <Type className="h-5 w-5" />
                  </Link>
                  {currentUser && (
                    <NotificationBell
                      triggerClassName="rounded-2xl border border-[#E8E0D5] bg-white text-[#3D3429] shadow-sm hover:bg-[#FCFAF7]"
                      badgeClassName="bg-[#C06C3B]"
                    />
                  )}
                  {currentUser ? (
                    <Link
                      href="/profile"
                      className="ml-0.5 flex items-center gap-2 rounded-2xl py-1 pl-1 pr-2 hover:bg-white/60 sm:pr-3"
                    >
                      <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                        <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                        <AvatarFallback
                          className="text-xs font-bold text-white"
                          style={{ backgroundColor: accent }}
                        >
                          {currentUser.name?.[0]?.toUpperCase() ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden text-sm font-semibold text-[#2C241C] sm:inline max-w-[7rem] truncate">
                        {shortDisplayName(currentUser.name)}
                      </span>
                    </Link>
                  ) : (
                    <Link
                      href="/login"
                      className="rounded-2xl px-3 py-2 text-sm font-semibold text-white shadow-sm"
                      style={{ backgroundColor: accent }}
                    >
                      Entrar
                    </Link>
                  )}
                </div>
              </div>

              <div className="md:hidden">
                <label className="relative block w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A8F84]" />
                  <input
                    type="search"
                    value={feedQuery}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar en publicaciones…"
                    className="w-full rounded-2xl border border-[#E8E0D5] bg-white py-2.5 pl-10 pr-3 text-sm text-[#2C241C] placeholder:text-[#9A8F84] shadow-sm outline-none ring-[#C06C3B]/25 focus:ring-2"
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
          className="fixed inset-y-0 right-0 z-20 hidden w-[280px] flex-col border-l border-[#E8E0D5] xl:flex"
          style={{ backgroundColor: '#F3EDE6' }}
          aria-label="Publicidad lateral"
        >
          <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto p-4">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B5F54]">
                Publicidad
              </h3>
              <Link
                href="/publicidades"
                className="shrink-0 text-xs font-semibold hover:underline"
                style={{ color: accent }}
              >
                Ver todas
              </Link>
            </div>
            <div
              key={lateralPairIndex}
              className="animate-in fade-in-0 zoom-in-95 flex min-h-0 flex-1 flex-col space-y-3 duration-300"
            >
              {!lateralLoaded ? (
                <div className="flex flex-1 items-center justify-center py-8 text-sm text-[#9A8F84]">
                  Cargando…
                </div>
              ) : lateralAds.length === 0 ? (
                <p className="py-2 text-xs text-[#6B5F54]">
                  Todavía no hay publicidades con esta opción activas.
                </p>
              ) : (
                visibleLateralAds.map((p) => (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-2xl border border-[#E8E0D5] bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setLateralDetail(p)}
                      className="w-full rounded-t-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C06C3B]/40 focus-visible:ring-offset-2"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-[#E8E0D5]">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Megaphone className="h-10 w-10 text-[#9A8F84]" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="line-clamp-2 text-xs font-semibold text-[#2C241C]">{p.title}</p>
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
