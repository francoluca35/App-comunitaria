'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Banknote, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminGestionPublicitariaPage() {
  const router = useRouter()
  const { currentUser } = useApp()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [valorInput, setValorInput] = useState('')
  const [valorLateralInput, setValorLateralInput] = useState('')

  const loadValor = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/publicidad/valor-publicitario')
      const data = (await res.json()) as { valorPublicitario?: number }
      const v = typeof data.valorPublicitario === 'number' ? data.valorPublicitario : 0
      setValorInput(String(v))

      const res2 = await fetch('/api/publicidad/valor-publicitario-lateral')
      const data2 = (await res2.json()) as { valorPublicitarioLateral?: number }
      const v2 = typeof data2.valorPublicitarioLateral === 'number' ? data2.valorPublicitarioLateral : 0
      setValorLateralInput(String(v2))
    } catch {
      toast.error('No se pudo cargar el valor publicitario')
      setValorInput('0')
      setValorLateralInput('0')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadValor()
  }, [loadValor])

  const handleSave = async () => {
    const normalized = valorInput.replace(',', '.').trim()
    const n = parseFloat(normalized)
    if (!Number.isFinite(n) || n < 0) {
      toast.error('Ingresá un número mayor o igual a 0')
      return
    }
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      toast.error('Sesión expirada')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/valor-publicitario', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ valorPublicitario: n }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? 'No se pudo guardar')
        return
      }
      toast.success('Valor publicitario actualizado')
      setValorInput(String((data as { valorPublicitario?: number }).valorPublicitario ?? n))
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveLateral = async () => {
    const normalized = valorLateralInput.replace(',', '.').trim()
    const n = parseFloat(normalized)
    if (!Number.isFinite(n) || n < 0) {
      toast.error('Ingresá un número mayor o igual a 0')
      return
    }
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      toast.error('Sesión expirada')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/valor-publicitario-lateral', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ valorPublicitarioLateral: n }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? 'No se pudo guardar')
        return
      }
      toast.success('Valor publicitario lateral actualizado')
      setValorLateralInput(String((data as { valorPublicitarioLateral?: number }).valorPublicitarioLateral ?? n))
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

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
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Gestión publicitaria</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle>Valor publicitario</CardTitle>
                <CardDescription>
                  Precio de referencia del espacio publicitario (ARS). Podés cambiarlo cuando quieras; sirve como
                  base comercial para acordar con anunciantes.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="valor-publicitario">Precio (ARS)</Label>
                  <Input
                    id="valor-publicitario"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={valorInput}
                    onChange={(e) => setValorInput(e.target.value)}
                    className="text-lg font-medium"
                  />
                </div>
                <Button type="button" className="w-full" onClick={() => void handleSave()} disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Guardar valor
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-violet-700 dark:text-violet-300" />
              </div>
              <div>
                <CardTitle>Valor publicitario lateral</CardTitle>
                <CardDescription>
                  Precio de referencia del espacio publicitario lateral (ARS). Se puede ajustar igual que el valor publicitario principal.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="valor-publicitario-lateral">Precio (ARS)</Label>
                  <Input
                    id="valor-publicitario-lateral"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={valorLateralInput}
                    onChange={(e) => setValorLateralInput(e.target.value)}
                    className="text-lg font-medium"
                  />
                </div>
                <Button type="button" className="w-full" onClick={() => void handleSaveLateral()} disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Guardar valor lateral
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
