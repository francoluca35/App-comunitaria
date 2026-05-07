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
import { usePathname } from 'next/navigation'
import { House, Menu, Megaphone, MessageCircle, Search, Type } from 'lucide-react'
import { DashboardSidebar } from './DashboardSidebar'
import { NotificationBell } from './NotificationBell'
import { FloatingChatHub } from './FloatingChatHub'
import { PublicidadContactLinks } from '@/components/PublicidadContactLinks'
import { PublicidadModal } from '@/components/PublicidadModal'
import type { PublicidadDisplay } from '@/lib/publicidad-display'
import { useApp } from '@/app/providers'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { CST } from '@/lib/cst-theme'
import { cn } from '@/app/components/ui/utils'
import { ChatNotificationsProvider, useChatNotifications } from '@/contexts/ChatNotificationsContext'
import { isFullscreenMobileChatPath } from '@/lib/chat-route-utils'

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

function MobileChatInboxShortcut({ headerIconBtn }: { headerIconBtn: string }) {
  const pathname = usePathname()
  const { currentUser } = useApp()
  const { unreadMessageCount } = useChatNotifications()
  if (!currentUser || !isFullscreenMobileChatPath(pathname)) return null
  const inboxHref =
    currentUser.isAdmin || currentUser.isModerator ? '/admin/messages' : '/message/contactos'
  const label =
    unreadMessageCount > 0
      ? `Bandeja de mensajes (${unreadMessageCount} sin leer)`
      : 'Bandeja de mensajes'
  return (
    <Link
      href={inboxHref}
      className={cn(headerIconBtn, 'relative lg:hidden')}
      aria-label={label}
    >
      <MessageCircle className="h-5 w-5" strokeWidth={2} aria-hidden />
      {unreadMessageCount > 0 ? (
        <span
          className="pointer-events-none absolute -right-0.5 -top-0.5 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full border border-black/15 bg-[#00CFC4] px-1 text-[10px] font-bold tabular-nums leading-none text-[#042a28] shadow-sm ring-1 ring-[#00FFF0]/90"
          aria-hidden
        >
          {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
        </span>
      ) : null}
    </Link>
  )
}

export function DashboardLayout({
  children,
  contentClassName,
  fillViewport = false,
}: {
  children: React.ReactNode
  /** Sustituye o amplía el ancho máximo del área de contenido (p. ej. `max-w-5xl` en perfil). */
  contentClassName?: string
  /**
   * Altura fija al viewport: sin scroll en el `main`; el contenido (p. ej. chat) controla el propio overflow.
   * Usar en pantallas de chat para evitar doble barra de desplazamiento.
   */
  fillViewport?: boolean
}) {
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
      <ChatNotificationsProvider>
      <div
        className={cn(
          'bg-[#F4EFEA] dark:bg-[#18191a]',
          fillViewport ? 'flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col' : 'min-h-screen'
        )}
      >
        <PublicidadModal
          open={!!lateralDetail}
          onOpenChange={(open) => !open && setLateralDetail(null)}
          publicidad={lateralDetail}
        />

        <header className="fixed inset-x-0 top-0 z-30 border-b border-white/15 bg-[#8B0015]/94 backdrop-blur-md dark:border-[#3a3b3c] dark:bg-[#242526]/95">
          <div className="flex flex-col gap-2 px-2 py-2.5 sm:gap-2.5 sm:px-3 sm:py-3 lg:px-2 xl:px-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white hover:bg-white/12 lg:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="h-6 w-6" />
              </button>

              <MobileChatInboxShortcut headerIconBtn={headerIconBtn} />

              <Link
                href="/"
                className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:gap-2.5 md:w-[250px] md:flex-none md:justify-start lg:w-[280px]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white shadow-sm sm:h-10 sm:w-10">
                  <House className="h-[1.15rem] w-[1.15rem] sm:h-5 sm:w-5" strokeWidth={2} />
                </span>
                <span className="font-montserrat-only min-w-0 max-w-[calc(100vw-11rem)] truncate text-center font-bold tracking-tight text-white text-[0.92rem] sm:max-w-none sm:text-base md:text-left md:text-lg">
                  CST Comunidad
                </span>
              </Link>

              <div className="hidden min-w-0 flex-1 justify-center px-2 md:flex md:px-4">
                <label className="relative w-full max-w-xl">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A5C52] dark:text-[#b0b3b8]" />
                  <input
                    type="search"
                    value={feedQuery}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar en publicaciones…"
                    className="w-full rounded-2xl border border-[#D8D2CC] bg-white py-2.5 pl-11 pr-4 text-sm text-[#2B2B2B] placeholder:text-[#7A5C52]/70 shadow-sm outline-none focus:border-[#8B0015] focus:ring-2 focus:ring-[#8B0015]/20 dark:border-[#3a3b3c] dark:bg-[#3a3b3c] dark:text-[#e4e6eb] dark:placeholder:text-[#b0b3b8] dark:focus:border-[#8B0015] dark:focus:ring-[#8B0015]/30"
                  />
                </label>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:w-[250px] md:justify-end lg:w-[280px]">
                {currentUser && (
                  <NotificationBell
                    triggerClassName="rounded-2xl border border-white/25 bg-white text-[#2B2B2B] shadow-sm hover:bg-white/95 dark:border-[#3a3b3c] dark:bg-[#3a3b3c] dark:text-[#e4e6eb] dark:hover:bg-[#4e4f50]"
                    badgeClassName="bg-[#8B0015] dark:bg-[#8B0015]"
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
                    <span className="hidden max-w-[7rem] truncate text-sm font-semibold text-white sm:inline">
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
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A5C52] dark:text-[#b0b3b8]" />
                <input
                  type="search"
                  value={feedQuery}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar en publicaciones…"
                    className="h-10 w-full rounded-xl border border-white/25 bg-white/95 py-0 pl-10 pr-3 text-sm text-[#2B2B2B] shadow-sm outline-none ring-1 ring-black/5 placeholder:text-[#7A5C52]/75 focus:border-white focus:ring-2 focus:ring-white/40 dark:border-[#3a3b3c] dark:bg-[#3a3b3c] dark:text-[#e4e6eb] dark:ring-0 dark:placeholder:text-[#b0b3b8] dark:focus:border-[#8B0015] dark:focus:ring-[#8B0015]/30"
                />
              </label>
            </div>
          </div>
        </header>

        <div
          className={`fixed bottom-0 left-0 top-0 z-40 flex w-64 flex-col overflow-hidden overscroll-contain lg:top-16 lg:z-20 lg:bottom-0 lg:h-auto ${
            sidebarOpen ? 'flex' : 'hidden'
          } lg:flex`}
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

        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col pt-24 md:pt-16 lg:ml-64',
            fillViewport ? 'min-h-0 overflow-hidden xl:mr-[292px]' : 'xl:mr-[280px]'
          )}
        >
          <main
            className={cn(
              'flex justify-center px-3 sm:px-4 lg:px-8',
              fillViewport
                ? 'min-h-0 flex-1 flex flex-col overflow-hidden py-3 sm:py-4'
                : 'flex flex-1 overflow-auto py-5'
            )}
          >
            <div
              className={cn(
                'w-full',
                contentClassName ?? 'max-w-3xl',
                fillViewport && 'flex min-h-0 flex-1 flex-col'
              )}
            >
              {children}
            </div>
          </main>
        </div>

        <FloatingChatHub />

        <aside
          className={cn(
            'fixed z-20 hidden w-[280px] flex-col bg-[#F4EFEA] xl:flex dark:bg-[#18191a]',
            fillViewport
              ? 'bottom-4 right-3 top-[4.75rem] overflow-hidden rounded-xl border border-[#D8D2CC]/80 shadow-sm dark:border-[#3a3b3c]/90'
              : 'bottom-0 right-0 top-16 border-transparent shadow-none'
          )}
          aria-label="Publicidad lateral"
        >
          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col overflow-y-auto',
              fillViewport ? 'px-2.5 pb-2 pt-2' : 'px-0 py-0'
            )}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3">
              <h3 className="font-montserrat-only text-xs font-semibold uppercase tracking-wider text-[#7A5C52] dark:text-[#b0b3b8]">
                Publicidad
              </h3>
              <Link
                href="/cartelera"
                className="shrink-0 text-xs font-semibold text-[#8B0015] hover:underline dark:text-[#8B0015]"
              >
                Ver todas
              </Link>
            </div>
            <div
              key={lateralPairIndex}
              className="animate-in fade-in-0 zoom-in-95 flex min-h-0 flex-1 flex-col gap-0 duration-300"
            >
              {!lateralLoaded ? (
                <div className="flex flex-1 items-center justify-center py-8 text-sm text-[#7A5C52] dark:text-[#b0b3b8]">
                  Cargando…
                </div>
              ) : lateralAds.length === 0 ? (
                <p className="py-2 text-xs text-[#7A5C52] dark:text-[#b0b3b8]">
                  Todavía no hay publicidades con esta opción activas.
                </p>
              ) : (
                visibleLateralAds.map((p) => (
                  <div
                    key={p.id}
                    className="overflow-hidden border-y border-[#D8D2CC] bg-white dark:border-[#3a3b3c] dark:bg-[#242526]"
                  >
                    <button
                      type="button"
                      onClick={() => setLateralDetail(p)}
                      className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B0015]/35 focus-visible:ring-offset-2"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-[#D8D2CC]/35 dark:bg-[#3a3b3c]">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Megaphone className="h-10 w-10 text-[#7A5C52]/50 dark:text-[#b0b3b8]/60" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="line-clamp-2 text-xs font-semibold text-[#2B2B2B] dark:text-[#e4e6eb]">
                          {p.title}
                        </p>
                      </div>
                    </button>
                    <div className="px-3 pb-3">
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
      </ChatNotificationsProvider>
    </FeedSearchContext.Provider>
  )
}
