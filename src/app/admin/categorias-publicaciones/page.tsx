'use client'

import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { DashboardLayout } from '@/components/DashboardLayout'
import { AdminCategoryManager } from '@/components/admin/AdminCategoryManager'
import { ArrowLeft } from 'lucide-react'

export default function AdminCategoriasPublicacionesPage() {
  const router = useRouter()
  const { currentUser, refreshPostCategories } = useApp()

  if (!currentUser?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">No tenés permisos de administrador</p>
            <Button onClick={() => router.push('/')}>Volver al inicio</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="w-full max-w-lg mx-auto pb-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Categorías de publicaciones</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Feed y nueva publicación</CardTitle>
            <CardDescription>
              Solo para el feed de novedades y el formulario “Nueva publicación”. Independientes de las categorías de
              Publicidades.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminCategoryManager
              title=""
              categoryKind="posts"
              listUrl="/api/categories/posts"
              adminUrl="/api/admin/post-categories"
              onListChanged={() => void refreshPostCategories()}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              No podés eliminar una categoría si hay publicaciones que la usan. Al crear, solo escribís el nombre: la URL
              (ej. <span className="font-mono">/categoria/perdida-de-mascotas</span>) se arma sola.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
