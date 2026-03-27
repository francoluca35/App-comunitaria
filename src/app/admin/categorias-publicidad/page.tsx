'use client'

import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { DashboardLayout } from '@/components/DashboardLayout'
import { AdminCategoryManager } from '@/components/admin/AdminCategoryManager'
import { ArrowLeft } from 'lucide-react'

export default function AdminCategoriasPublicidadPage() {
  const router = useRouter()
  const { currentUser, refreshPublicidadCategories } = useApp()

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
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Categorías publicidad</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros de publicidades</CardTitle>
            <CardDescription>
              Lista aparte de las categorías del feed: solo sirven para clasificar y filtrar anuncios en Publicidades.
              No aparecen al crear una publicación normal ni en /categoria/…
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminCategoryManager
              title=""
              categoryKind="publicidad"
              listUrl="/api/categories/publicidad"
              adminUrl="/api/admin/publicidad-categories"
              onListChanged={() => void refreshPublicidadCategories()}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
