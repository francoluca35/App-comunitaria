'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Users2,
  Home,
  FileText,
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

const ICON_BY_SLUG: Record<string, LucideIcon> = {
  todas: Filter,
  mascotas: Dog,
  alertas: AlertTriangle,
  avisos: Megaphone,
  objetos: Package,
  noticias: Newspaper,
}

const orange = '#C06C3B'
const sage = '#8EA07E'
const creamPanel = '#FFFCF8'

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
    const rest = postCategories.map((c) => ({
      slug: c.slug,
      label: c.label,
      icon: ICON_BY_SLUG[c.slug] ?? Tag,
    }))
    return [...head, ...rest]
  }, [postCategories])

  const myPostsCount = useMemo(() => {
    if (!currentUser) return 0
    return posts.filter((p) => p.authorId === currentUser.id).length
  }, [currentUser, posts])

  const isActivePath = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  const subline = currentUser?.locality
    ? `Vecino/a • ${currentUser.locality}`
    : 'Tu espacio en la comunidad'

  return (
    <aside
      className="flex h-full min-h-screen w-64 shrink-0 flex-col border-r border-[#E8E0D5]"
      style={{ backgroundColor: creamPanel }}
    >
      <div className="border-b border-[#E8E0D5] p-4">
        {currentUser ? (
          <div className="flex flex-col items-center text-center">
            <Avatar className="mb-3 h-[4.5rem] w-[4.5rem] border-4 border-white shadow-md">
              <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
              <AvatarFallback
                className="text-lg font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${orange}, ${sage})` }}
              >
                {currentUser.name?.[0]?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <p className="w-full truncate font-bold text-[#2C241C]">{currentUser.name}</p>
            <p className="mt-0.5 text-xs text-[#6B5F54]">{subline}</p>
            <Link
              href="/profile"
              onClick={onNavigate}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
              style={{ color: orange }}
            >
              Ver perfil
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-md"
              style={{ background: `linear-gradient(135deg, ${orange}, ${sage})` }}
            >
              <Users2 className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-[#2C241C]">CST Comunidad</p>
            <Link
              href="/login"
              onClick={onNavigate}
              className="mt-1 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm"
              style={{ backgroundColor: orange }}
            >
              Iniciar sesión
            </Link>
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        <Link
          href="/"
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ${
            pathname === '/'
              ? 'text-white shadow-md'
              : 'text-[#3D3429] hover:bg-white/80'
          }`}
          style={pathname === '/' ? { backgroundColor: orange } : undefined}
        >
          <Home className="h-5 w-5 shrink-0" />
          Inicio
        </Link>

        <Link
          href="/mis-publicaciones"
          onClick={onNavigate}
          className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ${
            isActivePath('/mis-publicaciones') ? 'bg-white shadow-sm text-[#2C241C]' : 'text-[#3D3429] hover:bg-white/80'
          }`}
        >
          <span className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 shrink-0 text-[#6B5F54]" />
            <span className="truncate">Mis publicaciones</span>
          </span>
          {currentUser != null && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white shrink-0" style={{ backgroundColor: sage }}>
              {myPostsCount > 99 ? '99+' : myPostsCount}
            </span>
          )}
        </Link>

        <Link
          href="/mis-publicidades"
          onClick={onNavigate}
          className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ${
            isActivePath('/mis-publicidades') ? 'bg-white shadow-sm text-[#2C241C]' : 'text-[#3D3429] hover:bg-white/80'
          }`}
        >
          <span className="flex items-center gap-3 min-w-0">
            <Megaphone className="h-5 w-5 shrink-0 text-[#6B5F54]" />
            <span className="truncate">Mis publicidades</span>
          </span>
          {currentUser != null && publicidadTotal !== null && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white shrink-0" style={{ backgroundColor: sage }}>
              {publicidadTotal > 99 ? '99+' : publicidadTotal}
            </span>
          )}
        </Link>

        <div className="pt-4 pb-2">
          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-[#9A8F84]">Categorías</p>
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
              className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition-colors ${
                active ? 'bg-white shadow-sm text-[#2C241C]' : 'text-[#3D3429] hover:bg-white/80'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className="h-5 w-5 shrink-0 text-[#6B5F54]" />
                <span className="truncate">{label}</span>
              </span>
              <span className="flex items-center gap-1.5 shrink-0 text-xs font-semibold text-[#6B5F54]">
                {showDot && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: orange }} aria-hidden />}
                {count}
              </span>
            </Link>
          )
        })}

        <Link
          href="/publicidades"
          onClick={onNavigate}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold text-white shadow-md transition-all hover:brightness-105 active:scale-[0.98] ${
            isActivePath('/publicidades') ? 'ring-2 ring-[#5a6d4e] ring-offset-2 ring-offset-[#FFFCF8]' : ''
          }`}
          style={{
            background: `linear-gradient(145deg, ${sage} 0%, #6d8a5e 55%, #5c7550 100%)`,
            boxShadow: '0 4px 16px rgba(109, 138, 94, 0.42)',
          }}
        >
          <Megaphone className="h-5 w-5 shrink-0" strokeWidth={2.25} />
          Publicidades
        </Link>

        <div className="mt-4 border-t border-[#E8E0D5] pt-4">
          {currentUser && !currentUser.isAdmin && (
            <Link
              href="/chat"
              onClick={onNavigate}
              className={`mb-1 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActivePath('/chat') ? 'bg-white shadow-sm text-[#2C241C]' : 'text-[#3D3429] hover:bg-white/80'
              }`}
            >
              <MessageCircle className="h-5 w-5 shrink-0 text-[#6B5F54]" />
              Chatear
            </Link>
          )}
          <Link
            href="/configuracion"
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActivePath('/configuracion') ? 'bg-white shadow-sm text-[#2C241C]' : 'text-[#3D3429] hover:bg-white/80'
            }`}
          >
            <Settings className="h-5 w-5 shrink-0 text-[#6B5F54]" />
            Configuración
          </Link>
        </div>

        {currentUser?.isAdmin && (
          <Link
            href="/admin"
            onClick={onNavigate}
            className={`mt-1 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActivePath('/admin') ? 'bg-white shadow-sm text-[#2C241C]' : 'text-[#3D3429] hover:bg-white/80'
            }`}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0 text-[#6B5F54]" />
            Acceso admin
          </Link>
        )}
      </nav>

      {currentUser && (
        <div className="border-t border-[#E8E0D5] p-3">
          <button
            type="button"
            onClick={async () => {
              await logout()
              onNavigate?.()
              router.push('/login')
            }}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  )
}
