'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Users2,
  Home,
  UserCircle,
  Filter,
  Dog,
  AlertTriangle,
  Megaphone,
  Package,
  Newspaper,
  Tag,
  MessageCircle,
  Settings,
  LogOut,
  LayoutDashboard,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/app/providers'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { CST } from '@/lib/cst-theme'

const ICON_BY_SLUG: Record<string, LucideIcon> = {
  todas: Filter,
  mascotas: Dog,
  alertas: AlertTriangle,
  avisos: Megaphone,
  objetos: Package,
  noticias: Newspaper,
}

function getCategoryCount(
  posts: { category: string; status: string }[],
  slug: string
) {
  const approved = posts.filter((p) => p.status === 'approved')
  if (slug === 'todas') return approved.length
  return approved.filter((p) => p.category === slug).length
}

export function DashboardSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, logout, postCategories, posts } = useApp()
  const [publicidadTotal, setPublicidadTotal] = useState<number | null>(null)

  useEffect(() => {
    if (!currentUser) {
      setPublicidadTotal(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const supabase = (await import('@/lib/supabase/client')).createClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) return
        const res = await fetch('/api/publicidad/mis', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = (await res.json().catch(() => ({}))) as {
          active?: unknown[]
          inactive?: unknown[]
        }
        const n =
          (Array.isArray(data.active) ? data.active.length : 0) +
          (Array.isArray(data.inactive) ? data.inactive.length : 0)
        if (!cancelled) setPublicidadTotal(n)
      } catch {
        if (!cancelled) setPublicidadTotal(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentUser?.id])

  const categoryLinks = useMemo(() => {
    const head = [{ slug: 'todas', label: 'Todas', icon: Filter }]
    const rest = postCategories
      .filter((c) => c != null && typeof c.slug === 'string' && c.slug !== 'propuesta')
      .map((c) => ({
        slug: c.slug,
        label: c.label,
        icon: ICON_BY_SLUG[c.slug] ?? Tag,
      }))
    return [...head, ...rest]
  }, [postCategories])

  const isActivePath = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  const subline = currentUser?.locality
    ? `Vecino/a • ${currentUser.locality}`
    : 'Tu espacio en la comunidad'

  const navInactive =
    'text-[#2B2B2B] hover:bg-[#F4EFEA] dark:text-[#e4e6eb] dark:hover:bg-[#3a3b3c]'
  const navActive = 'text-white shadow-md'
  const iconMuted = 'text-[#7A5C52] dark:text-[#b0b3b8]'
  const iconActive = 'text-white'

  const handleLogout = async () => {
    await logout()
    onNavigate?.()
    router.push('/login')
  }

  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden bg-white dark:bg-[#18191a]">
      <div className="shrink-0 bg-[#F4EFEA] px-4 pb-4 pt-4 dark:bg-[#242526]">
        {currentUser ? (
          <div className="flex flex-col items-center text-center">
            <Avatar className="mb-3 h-[4.5rem] w-[4.5rem] border-4 border-white shadow-md">
              <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
              <AvatarFallback
                className="text-lg font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${CST.bordo}, ${CST.bordoDark})`,
                }}
              >
                {currentUser.name?.[0]?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <p className="w-full truncate font-bold text-[#2B2B2B] font-montserrat-only dark:text-[#e4e6eb]">
              {currentUser.name}
            </p>
            <p className="mt-0.5 text-xs text-[#7A5C52] dark:text-[#b0b3b8]">{subline}</p>
            <Link
              href="/profile"
              onClick={onNavigate}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#8B0015] hover:underline dark:text-[#8B0015]"
            >
              Ver perfil
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-md"
              style={{
                background: `linear-gradient(135deg, ${CST.bordo}, ${CST.bordoDark})`,
              }}
            >
              <Users2 className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-[#2B2B2B] font-montserrat-only dark:text-[#e4e6eb]">
              CST Comunidad
            </p>
            <Link
              href="/login"
              onClick={onNavigate}
              className="mt-1 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5A000E]"
              style={{ backgroundColor: CST.bordo }}
            >
              Iniciar sesión
            </Link>
          </div>
        )}
      </div>

      <nav
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-y-contain bg-white/90 px-0 py-2 dark:bg-[#18191a]"
        aria-label="Navegación principal"
      >
        <Link
          href="/"
          onClick={onNavigate}
          className={`mx-0 flex items-center gap-3 rounded-none px-4 py-2.5 text-sm font-semibold transition-colors ${
            pathname === '/' ? navActive : navInactive
          }`}
          style={pathname === '/' ? { backgroundColor: CST.bordo } : undefined}
        >
          <Home className={`h-5 w-5 shrink-0 ${pathname === '/' ? iconActive : iconMuted}`} />
          Inicio
        </Link>

        <Link
          href="/profile"
          onClick={onNavigate}
          className={`mx-0 flex items-center gap-3 rounded-none px-4 py-2.5 text-sm font-semibold transition-colors ${
            isActivePath('/profile') ? `${navActive}` : navInactive
          }`}
          style={isActivePath('/profile') ? { backgroundColor: CST.bordo } : undefined}
        >
          <UserCircle className={`h-5 w-5 shrink-0 ${isActivePath('/profile') ? iconActive : iconMuted}`} />
          <span className="truncate">Mi perfil</span>
        </Link>

        <Link
          href="/mis-publicidades"
          onClick={onNavigate}
          className={`mx-0 flex items-center justify-between gap-2 rounded-none px-4 py-2.5 text-sm font-semibold transition-colors ${
            isActivePath('/mis-publicidades')
              ? `${navActive}`
              : navInactive
          }`}
          style={
            isActivePath('/mis-publicidades') ? { backgroundColor: CST.bordo } : undefined
          }
        >
          <span className="flex items-center gap-3 min-w-0">
            <Megaphone
              className={`h-5 w-5 shrink-0 ${isActivePath('/mis-publicidades') ? iconActive : iconMuted}`}
            />
            <span className="truncate">Mis publicidades</span>
          </span>
          {currentUser != null && publicidadTotal !== null && (
            <span
              className="flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: CST.acento }}
            >
              {publicidadTotal > 99 ? '99+' : publicidadTotal}
            </span>
          )}
        </Link>

        <div className="pt-4 pb-2">
          <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-[#7A5C52] font-montserrat-only">
            Categorías
          </p>
        </div>

        {categoryLinks.map(({ slug, label, icon: Icon }) => {
          const href = `/categoria/${slug}`
          const active = pathname === href
          const count = getCategoryCount(posts, slug)
          const showDot = (slug === 'mascotas' || slug === 'alertas') && count > 0
          return (
            <Link
              key={slug}
              href={href}
              onClick={onNavigate}
              className={`mx-0 flex items-center justify-between gap-2 rounded-none px-4 py-2 text-sm font-medium transition-colors ${
                active ? navActive : navInactive
              }`}
              style={active ? { backgroundColor: CST.bordo } : undefined}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className={`h-5 w-5 shrink-0 ${active ? iconActive : iconMuted}`} />
                <span className="truncate">{label}</span>
              </span>
              <span
                className={`flex items-center gap-1.5 shrink-0 text-xs font-semibold ${
                  active ? 'text-white/90' : 'text-[#7A5C52]'
                }`}
              >
                {showDot && (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: CST.bordo }}
                    aria-hidden
                  />
                )}
                {count}
              </span>
            </Link>
          )
        })}

        <Link
          href="/cartelera"
          onClick={onNavigate}
          className={`mx-0 flex items-center justify-between gap-2 rounded-none px-4 py-2 text-sm font-medium transition-colors ${
            isActivePath('/cartelera')
              ? navActive
              : 'text-[#8B0015] hover:bg-[#8B0015]/10 dark:text-[#f0a8b8] dark:hover:bg-[#8B0015]/18'
          }`}
          style={isActivePath('/cartelera') ? { backgroundColor: CST.bordo } : undefined}
        >
          <span className="flex min-w-0 items-center gap-3">
            <Megaphone
              className={`h-5 w-5 shrink-0 ${isActivePath('/cartelera') ? iconActive : 'text-[#8B0015] dark:text-[#f0a8b8]'}`}
              strokeWidth={2}
            />
            <span className="truncate">Publicidades</span>
          </span>
        </Link>

        <div className="mt-4 pt-4">
          {currentUser && !currentUser.isAdmin && (
            <Link
              href="/message"
              onClick={onNavigate}
              className={`mx-0 mb-1 flex items-center gap-3 rounded-none px-4 py-2.5 text-sm font-medium transition-colors ${
                isActivePath('/message')
                  ? `${navActive}`
                  : navInactive
              }`}
              style={isActivePath('/message') ? { backgroundColor: CST.bordo } : undefined}
            >
              <MessageCircle
                className={`h-5 w-5 shrink-0 ${isActivePath('/message') ? iconActive : iconMuted}`}
              />
              Chatear
            </Link>
          )}
          <Link
            href="/configuracion"
            onClick={onNavigate}
            className={`mx-0 flex items-center gap-3 rounded-none px-4 py-2.5 text-sm font-medium transition-colors ${
              isActivePath('/configuracion')
                ? `${navActive}`
                : navInactive
            }`}
            style={isActivePath('/configuracion') ? { backgroundColor: CST.bordo } : undefined}
          >
            <Settings
              className={`h-5 w-5 shrink-0 ${isActivePath('/configuracion') ? iconActive : iconMuted}`}
            />
            Configuración
          </Link>
          {currentUser?.isAdmin && (
          <Link
            href="/admin"
            onClick={onNavigate}
            className={`mx-0 mt-1 flex items-center gap-3 rounded-none px-4 py-2.5 text-sm font-medium transition-colors ${
              isActivePath('/admin') ? `${navActive}` : navInactive
            }`}
            style={isActivePath('/admin') ? { backgroundColor: CST.bordo } : undefined}
          >
            <LayoutDashboard
              className={`h-5 w-5 shrink-0 ${isActivePath('/admin') ? iconActive : iconMuted}`}
            />
            Acceso admin
          </Link>
        )}
          {currentUser && (
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="mx-0 flex w-full items-center gap-3 rounded-none px-4 py-2.5 text-left text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-[#3a3b3c]"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              Cerrar sesión
            </button>
          )}
        </div>

       
      </nav>
    </aside>
  )
}
