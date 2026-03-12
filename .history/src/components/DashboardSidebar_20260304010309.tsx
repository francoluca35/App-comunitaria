'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Users2,
  Home,
  User,
  FileText,
  Filter,
  Dog,
  AlertTriangle,
  Megaphone,
  Package,
  Newspaper,
  MessageCircle,
  Settings,
  LogOut,
  LayoutDashboard,
} from 'lucide-react'
import { useApp } from '@/app/providers'

const CATEGORIES = [
  { slug: 'todas', label: 'Todas', icon: Filter },
  { slug: 'mascotas', label: 'Mascotas', icon: Dog },
  { slug: 'alertas', label: 'Alertas', icon: AlertTriangle },
  { slug: 'avisos', label: 'Avisos', icon: Megaphone },
  { slug: 'objetos', label: 'Objetos', icon: Package },
  { slug: 'noticias', label: 'Noticias', icon: Newspaper },
] as const

export function DashboardSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, logout } = useApp()

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      active
        ? 'bg-indigo-500/20 text-indigo-300 dark:text-indigo-200'
        : 'text-slate-300 dark:text-gray-400 hover:bg-white/5 hover:text-white dark:hover:text-gray-200'
    }`

  return (
    <aside className="flex flex-col w-64 min-h-full bg-slate-900 dark:bg-gray-950 border-r border-slate-700/50 dark:border-gray-800 shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-slate-700/50 dark:border-gray-800">
        <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <Users2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-white font-bold tracking-tight block">Difusión</span>
            <span className="text-slate-400 dark:text-gray-500 text-xs">Comunitaria</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <Link href="/" className={linkClass(pathname === '/')} onClick={onNavigate}>
          <Home className="w-5 h-5 shrink-0" />
          Inicio
        </Link>
        <Link href="/profile" className={linkClass(isActive('/profile'))} onClick={onNavigate}>
          <User className="w-5 h-5 shrink-0" />
          Perfil
        </Link>
        <Link href="/mis-publicaciones" className={linkClass(isActive('/mis-publicaciones'))} onClick={onNavigate}>
          <FileText className="w-5 h-5 shrink-0" />
          Mis publicaciones
        </Link>

        <div className="pt-4 pb-2">
          <p className="px-3 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">
            Categorías
          </p>
        </div>
        {CATEGORIES.map(({ slug, label, icon: Icon }) => {
          const href = `/categoria/${slug}`
          const active = pathname === href
          return (
            <Link key={slug} href={href} className={linkClass(active)} onClick={onNavigate}>
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </Link>
          )
        })}

        <div className="pt-4 border-t border-slate-700/50 dark:border-gray-800 mt-4">
          <Link href="#" className={linkClass(false)} onClick={onNavigate}>
            <MessageCircle className="w-5 h-5 shrink-0" />
            Mensajes
          </Link>
          <Link href="/profile" className={linkClass(isActive('/profile'))} onClick={onNavigate}>
            <Settings className="w-5 h-5 shrink-0" />
            Configuración
          </Link>
        </div>

        {currentUser?.isAdmin && (
          <Link href="/admin" className={linkClass(isActive('/admin'))} onClick={onNavigate}>
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            Acceso Admin
          </Link>
        )}
      </nav>

      {/* Cerrar sesión */}
      <div className="p-3 border-t border-slate-700/50 dark:border-gray-800">
        <button
          type="button"
          onClick={async () => {
            await logout()
            onNavigate?.()
            router.push('/login')
          }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
