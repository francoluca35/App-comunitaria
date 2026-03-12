'use client'

import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { Card, CardContent } from '@/app/components/ui/card'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/app/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default function AdminRegistrosPage() {
  const router = useRouter()
  const { currentUser, recentRegistrations } = useApp()

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
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Registros recientes</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          {recentRegistrations.length === 0
            ? 'Nadie se registró en esta sesión'
            : `${recentRegistrations.length} nuevo${recentRegistrations.length !== 1 ? 's' : ''} en esta sesión`}
        </p>
        <div className="space-y-3">
          {recentRegistrations.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
                No hay registros nuevos en esta sesión.
              </CardContent>
            </Card>
          ) : (
            recentRegistrations.map((r) => (
              <div
                key={r.id}
                className="rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 shadow-sm"
              >
                <p className="font-semibold text-slate-900 dark:text-white text-lg">{r.name || 'Sin nombre'}</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                  {formatDistanceToNow(r.createdAt, { addSuffix: true, locale: es })}
                </p>
                <p className="text-slate-700 dark:text-slate-300 mt-2">{r.email}</p>
                {r.phone && <p className="text-slate-600 dark:text-slate-400">Tel: {r.phone}</p>}
                {(r.province || r.locality) && (
                  <p className="text-slate-600 dark:text-slate-400">
                    {[r.province, r.locality].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
