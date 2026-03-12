'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, User, LayoutDashboard } from 'lucide-react'
import { useApp } from '@/app/providers'

export function BottomNav() {
  const pathname = usePathname()
  const { currentUser } = useApp()

  const isActive = (path: string) => pathname === path

  const linkClass = (active: boolean) =>
    `flex flex-col items-center gap-1 py-2.5 px-4 rounded-xl transition-all duration-200 ${
      active
        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50'
        : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800/50'
    }`

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl">
      <div className="max-w-md mx-auto px-3 py-2">
        <div className="flex justify-around items-center">
          <Link href="/" className={linkClass(isActive('/'))}>
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">Inicio</span>
          </Link>

          {currentUser?.isAdmin && (
            <Link
              href="/admin"
              className={linkClass(isActive('/admin') || pathname.startsWith('/admin'))}
            >
              <LayoutDashboard className="w-6 h-6" />
              <span className="text-xs font-medium">Panel</span>
            </Link>
          )}

          <Link href="/profile" className={linkClass(isActive('/profile'))}>
            <User className="w-6 h-6" />
            <span className="text-xs font-medium">Perfil</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
