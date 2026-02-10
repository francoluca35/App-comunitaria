'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PlusCircle, User, LayoutDashboard } from 'lucide-react'
import { useApp } from '@/app/providers'

export function BottomNav() {
  const pathname = usePathname()
  const { currentUser } = useApp()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50">
      <div className="max-w-md mx-auto px-4 py-2">
        <div className="flex justify-around items-center">
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors ${
              isActive('/') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs">Inicio</span>
          </Link>

       

          {currentUser?.isAdmin && (
            <Link
              href="/admin"
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors ${
                isActive('/admin') || pathname.startsWith('/admin')
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <LayoutDashboard className="w-6 h-6" />
              <span className="text-xs">Panel</span>
            </Link>
          )}

          <Link
            href="/profile"
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors ${
              isActive('/profile') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <User className="w-6 h-6" />
            <span className="text-xs">Perfil</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
