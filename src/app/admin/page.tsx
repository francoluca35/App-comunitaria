'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { Card, CardContent } from '@/app/components/ui/card'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Clock, CheckCircle, Users, Settings, Bell, MessageCircle, Megaphone } from 'lucide-react'

export default function AdminDashboardPage() {
  const router = useRouter()
  const { currentUser, posts, users, recentRegistrations } = useApp()

  if (!currentUser?.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-sm w-full shadow-lg">
          <CardContent className="p-8 text-center">
            <p className="text-lg text-slate-700 mb-6">No tenés permisos de administrador.</p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full py-4 px-5 rounded-xl bg-indigo-600 text-white text-lg font-medium"
            >
              Volver al inicio
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pendingPosts = posts.filter((p) => p.status === 'pending')
  const approvedPosts = posts.filter((p) => p.status === 'approved')
  const rejectedPosts = posts.filter((p) => p.status === 'rejected')
  const blockedUsers = users.filter((u) => u.isBlocked)

  return (
    <DashboardLayout>
      <div className="w-full max-w-lg mx-auto">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Panel de administración
        </h1>

      <div className="space-y-6">
        {/* Acción principal: revisar publicaciones */}
        {pendingPosts.length > 0 ? (
          <section className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-5">
            <p className="text-slate-700 dark:text-slate-300 text-base mb-1">Hay publicaciones esperando tu revisión</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mb-4">{pendingPosts.length} pendiente{pendingPosts.length !== 1 ? 's' : ''}</p>
            <Link
              href="/admin/moderation"
              className="flex items-center justify-center gap-2 w-full py-4 px-5 rounded-xl bg-amber-500 dark:bg-amber-600 text-white text-lg font-semibold hover:bg-amber-600 dark:hover:bg-amber-500 shadow-md"
            >
              <Clock className="w-6 h-6" />
              Revisar ahora
            </Link>
          </section>
        ) : (
          <section className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-2xl p-5 text-center">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <p className="text-lg font-medium text-green-800 dark:text-green-300">No hay publicaciones pendientes</p>
            <p className="text-slate-600 dark:text-slate-400 text-base mt-1">Todo al día.</p>
          </section>
        )}

        {/* Números claros */}
        <section>
          <h2 className="text-base font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Resumen</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-0.5">Pendientes</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{pendingPosts.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-0.5">Aprobadas</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{approvedPosts.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-0.5">Rechazadas</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{rejectedPosts.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-0.5">Usuarios</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{users.length}</p>
            </div>
          </div>
        </section>

        {/* Menú de acciones: botonera cuadrada una al lado del otro */}
        <section>
          <h2 className="text-base font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Acciones</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Link
              href="/admin/moderation"
              className="aspect-square flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 active:bg-slate-100 dark:active:bg-slate-700"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-amber-700 dark:text-amber-400" />
              </div>
              <span className="text-sm font-medium text-slate-900 dark:text-white text-center">Moderar</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{pendingPosts.length} pend.</span>
            </Link>

            <Link
              href="/admin/users"
              className="aspect-square flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 active:bg-slate-100 dark:active:bg-slate-700"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-blue-700 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-slate-900 dark:text-white text-center">Usuarios</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{blockedUsers.length} bloq.</span>
            </Link>

            <Link
              href="/admin/messages"
              className="aspect-square flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 active:bg-slate-100 dark:active:bg-slate-700"
            >
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                <MessageCircle className="w-6 h-6 text-green-700 dark:text-green-400" />
              </div>
              <span className="text-sm font-medium text-slate-900 dark:text-white text-center">Chatear</span>
            </Link>

            <Link
              href="/admin/publicidades"
              className="aspect-square flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 active:bg-slate-100 dark:active:bg-slate-700"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0">
                <Megaphone className="w-6 h-6 text-violet-700 dark:text-violet-400" />
              </div>
              <span className="text-sm font-medium text-slate-900 dark:text-white text-center">Publicidades</span>
            </Link>

            <Link
              href="/admin/registros"
              className="aspect-square flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 active:bg-slate-100 dark:active:bg-slate-700"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0">
                <Bell className="w-6 h-6 text-violet-700 dark:text-violet-400" />
              </div>
              <span className="text-sm font-medium text-slate-900 dark:text-white text-center">Registros recientes</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{recentRegistrations.length} nuevo{recentRegistrations.length !== 1 ? 's' : ''}</span>
            </Link>

            <Link
              href="/admin/settings"
              className="aspect-square flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 active:bg-slate-100 dark:active:bg-slate-700"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-600 flex items-center justify-center shrink-0">
                <Settings className="w-6 h-6 text-slate-700 dark:text-slate-200" />
              </div>
              <span className="text-sm font-medium text-slate-900 dark:text-white text-center">Configuración</span>
            </Link>
          </div>
        </section>
      </div>
      </div>
    </DashboardLayout>
  )
}
