'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { BottomNav } from '@/components/BottomNav'
import { PostCard } from '@/components/PostCard'
import { ArrowLeft, Clock, CheckCircle, XCircle, Users, Settings } from 'lucide-react'

export default function AdminDashboardPage() {
  const router = useRouter()
  const { currentUser, posts, users } = useApp()

  if (!currentUser?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">No tienes permisos de administrador</p>
            <Button onClick={() => router.push('/')}>Volver al inicio</Button>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg">Panel de Administrador</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Pendientes</p>
              </div>
              <p className="text-2xl">{pendingPosts.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Aprobadas</p>
              </div>
              <p className="text-2xl">{approvedPosts.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Rechazadas</p>
              </div>
              <p className="text-2xl">{rejectedPosts.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Usuarios</p>
              </div>
              <p className="text-2xl">{users.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3">
          <Button variant="outline" className="justify-start h-auto p-4" asChild>
            <Link href="/admin/moderation">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1 text-left">
                  <p>Moderar Publicaciones</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {pendingPosts.length} publicaciones pendientes
                  </p>
                </div>
              </div>
            </Link>
          </Button>

          <Button variant="outline" className="justify-start h-auto p-4" asChild>
            <Link href="/admin/users">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 text-left">
                  <p>Gestión de Usuarios</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {blockedUsers.length} usuarios bloqueados
                  </p>
                </div>
              </div>
            </Link>
          </Button>

          <Button variant="outline" className="justify-start h-auto p-4" asChild>
            <Link href="/admin/settings">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1 text-left">
                  <p>Configuración</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ajustes de la aplicación</p>
                </div>
              </div>
            </Link>
          </Button>
        </div>

        {pendingPosts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg">Publicaciones Recientes Pendientes</h2>
              <Button variant="link" size="sm" asChild>
                <Link href="/admin/moderation">Ver todas</Link>
              </Button>
            </div>

            <div className="space-y-3">
              {pendingPosts.slice(0, 3).map((post) => (
                <PostCard key={post.id} post={post} showStatus />
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
