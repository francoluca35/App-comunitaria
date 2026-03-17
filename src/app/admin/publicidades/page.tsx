'use client'

import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { Card, CardContent } from '@/app/components/ui/card'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/app/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function AdminPublicidadesPage() {
  const router = useRouter()
  const { currentUser } = useApp()

  if (!currentUser?.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-sm w-full shadow-lg">
          <CardContent className="p-8 text-center">
            <p className="text-lg text-slate-700 mb-6">No tenés permisos de administrador.</p>
            <Button onClick={() => router.push('/')}>Volver al inicio</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="w-full max-w-lg mx-auto">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin')} className="mb-4">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Publicidades</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          En la página <strong>Ver todas las publicidades</strong> ya se muestran publicidades demo (con imagen, texto y CTA a WhatsApp o Instagram) para el videodemo. La gestión completa de publicidades llegará más adelante.
        </p>
        <Card>
          <CardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
            Gestión de publicidades (crear, editar, pausar) – Próximamente
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
