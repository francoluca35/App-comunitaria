'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, Megaphone } from 'lucide-react'
import { DashboardSidebar } from './DashboardSidebar'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="relative flex min-h-screen bg-slate-50 dark:bg-[#84041c] ">

    <img
      src="/assets/logocst.png"
      alt="logo"
      className="absolute w-64 opacity-20"
    />
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
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 px-3 py-3 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-gray-800 lg:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800"
              aria-label="Abrir menú"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-semibold text-slate-900 dark:text-white">Difusión Comunitaria</span>
          </div>
          <Link
            href="/publicidades"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/25 text-sm font-medium"
            aria-label="Publicidades"
          >
            <Megaphone className="w-4 h-4" />
            <span>Publicidades</span>
          </Link>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto flex justify-center">
          <div className="w-full max-w-2xl">
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
