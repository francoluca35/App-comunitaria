'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, Search, MessageCircle, Bell } from 'lucide-react'
import { DashboardSidebar } from './DashboardSidebar'
import { useApp } from '@/app/providers'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { currentUser } = useApp()

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-gray-950 lg:bg-slate-50">
      {/* Sidebar izquierdo: oculto en móvil salvo overlay */}
      <div
        className={`fixed inset-y-0 left-0 z-40 lg:static lg:block ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
      >
        <DashboardSidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Centro: feed con ancho acotado */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        {/* Barra superior estilo Facebook (móvil) */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 px-3 py-2 bg-slate-800 dark:bg-gray-950 border-b border-slate-700/50 dark:border-gray-800 lg:hidden">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="font-bold text-white text-lg">Comunidad</span>
          </Link>
          <div className="flex items-center gap-1">
            <button type="button" className="p-2 rounded-full text-slate-300 hover:bg-slate-700/50" aria-label="Buscar">
              <Search className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-full text-slate-300 hover:bg-slate-700/50"
              aria-label="Menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="#" className="relative p-2 rounded-full text-slate-300 hover:bg-slate-700/50" aria-label="Mensajes">
              <MessageCircle className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">0</span>
            </Link>
            <button type="button" className="relative p-2 rounded-full text-slate-300 hover:bg-slate-700/50" aria-label="Notificaciones">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">0</span>
            </button>
            <Link href="/profile" className="p-1 rounded-full ring-2 ring-slate-600">
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser?.avatar} />
                <AvatarFallback className="bg-indigo-600 text-white text-sm">{currentUser ? currentUser.name[0] : '?'}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        {/* Barra desktop (solo lg) */}
        <header className="hidden lg:flex items-center gap-3 px-4 py-3 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-gray-800">
          <button type="button" onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800" aria-label="Abrir menú">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-slate-900 dark:text-white">Difusión Comunitaria</span>
        </header>

        <main className="flex-1 overflow-auto flex justify-center bg-slate-900 dark:bg-gray-950 lg:bg-slate-50 lg:dark:bg-gray-950">
          <div className="w-full max-w-2xl p-0 lg:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Columna fija: publicidad (solo desktop) */}
      <aside className="hidden xl:block w-[280px] shrink-0 border-l border-slate-200/80 dark:border-gray-800 bg-slate-100/50 dark:bg-gray-900/50 overflow-y-auto">
        <div className="sticky top-0 p-4 space-y-4">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">
            Publicidad
          </h3>
          <div className="space-y-3">
            <div className="rounded-xl bg-white dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 p-3 shadow-sm">
              <div className="aspect-[4/3] rounded-lg bg-slate-200 dark:bg-gray-700 mb-2" />
              <p className="text-xs text-slate-500 dark:text-gray-400">Espacio publicitario</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 p-3 shadow-sm">
              <div className="aspect-[4/3] rounded-lg bg-slate-200 dark:bg-gray-700 mb-2" />
              <p className="text-xs text-slate-500 dark:text-gray-400">Espacio publicitario</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
