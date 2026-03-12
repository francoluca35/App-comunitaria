'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useApp, type AdminProfile } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { Badge } from '@/app/components/ui/badge'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { DashboardLayout } from '@/components/DashboardLayout'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { ArrowLeft, Shield, ShieldCheck, UserX, Ban, Trash2, Clock, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

export default function AdminUsersPage() {
  const router = useRouter()
  const {
    currentUser,
    adminProfiles,
    adminProfilesLoading,
    loadAdminProfiles,
    updateUserRole,
    setUserSuspended,
    blockUser,
    unblockUser,
    deleteUser,
  } = useApp()
  const [selected, setSelected] = useState<AdminProfile | null>(null)
  const [suspendDays, setSuspendDays] = useState<string>('7')
  const [acting, setActing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const hasRequestedLoad = useRef(false)

  const filteredProfiles = adminProfiles.filter((p) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    const name = (p.name ?? '').toLowerCase()
    const email = (p.email ?? '').toLowerCase()
    const phone = (p.phone ?? '').replace(/\s/g, '')
    const qNorm = q.replace(/\s/g, '')
    return name.includes(q) || email.includes(q) || phone.includes(qNorm)
  })

  useEffect(() => {
    if (!currentUser?.isAdmin || hasRequestedLoad.current) return
    hasRequestedLoad.current = true
    loadAdminProfiles()
  }, [currentUser?.isAdmin])

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

  const handleRole = async (userId: string, role: 'viewer' | 'moderator' | 'admin') => {
    setActing(true)
    const { ok, error } = await updateUserRole(userId, role)
    setActing(false)
    if (ok) {
      toast.success('Rol actualizado')
      setSelected((p) => (p?.id === userId ? { ...p, role } : p))
    } else toast.error(error ?? 'Error al actualizar')
  }

  const handleSuspend = async (userId: string) => {
    const days = parseInt(suspendDays, 10)
    if (Number.isNaN(days) || days < 1) {
      toast.error('Ingresá una cantidad de días válida')
      return
    }
    setActing(true)
    const { ok, error } = await setUserSuspended(userId, days)
    setActing(false)
    if (ok) {
      toast.success(`Usuario suspendido por ${days} días`)
      loadAdminProfiles()
      setSelected(null)
    } else toast.error(error ?? 'Error al suspender')
  }

  const handleBlock = async (userId: string) => {
    setActing(true)
    const { ok, error } = await blockUser(userId)
    setActing(false)
    if (ok) {
      toast.success('Usuario bloqueado')
      setSelected(null)
    } else toast.error(error ?? 'Error al bloquear')
  }

  const handleUnblock = async (userId: string) => {
    setActing(true)
    const { ok, error } = await unblockUser(userId)
    setActing(false)
    if (ok) {
      toast.success('Usuario desbloqueado')
      setSelected(null)
    } else toast.error(error ?? 'Error al desbloquear')
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Eliminar este usuario de forma permanente? No se puede deshacer.')) return
    setActing(true)
    const { ok, error } = await deleteUser(userId)
    setActing(false)
    if (ok) {
      toast.success('Usuario eliminado')
      setSelected(null)
    } else toast.error(error ?? 'Error al eliminar')
  }

  const isSuspended = (p: AdminProfile) => p.suspended_until && new Date(p.suspended_until) > new Date()

  return (
    <DashboardLayout>
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Todos los usuarios</h1>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Buscar por nombre, email o teléfono"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {adminProfilesLoading ? (
          <p className="text-slate-500 dark:text-slate-400">Cargando usuarios...</p>
        ) : (
          <div className="space-y-3">
            {filteredProfiles.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 py-4 text-center">
                {adminProfiles.length === 0 ? 'No hay usuarios.' : 'Ningún usuario coincide con la búsqueda.'}
              </p>
            ) : null}
            {filteredProfiles.map((profile) => (
              <Card
                key={profile.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelected(profile)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={profile.avatar_url ?? undefined} />
                      <AvatarFallback className="text-sm">{(profile.name ?? profile.email)[0]?.toUpperCase() ?? '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900 dark:text-white">{profile.name ?? profile.email}</span>
                        {profile.role === 'admin' && (
                          <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {profile.role === 'moderator' && (
                          <Badge variant="secondary" className="bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Moderador
                          </Badge>
                        )}
                        {profile.status === 'blocked' && <Badge variant="destructive">Bloqueado</Badge>}
                        {isSuspended(profile) && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            <Clock className="w-3 h-3 mr-1" />
                            Suspendido
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{profile.email}</p>
                      {profile.phone && <p className="text-xs text-slate-500 dark:text-slate-400">Tel: {profile.phone}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            {selected && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 flex-wrap">
                    <span>{selected.name ?? selected.email}</span>
                    {selected.role === 'admin' && <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Admin</Badge>}
                    {selected.role === 'moderator' && <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">Moderador</Badge>}
                    {selected.status === 'blocked' && <Badge variant="destructive">Bloqueado</Badge>}
                    {isSuspended(selected) && <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30">Suspendido</Badge>}
                  </DialogTitle>
                </DialogHeader>
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                  <p><span className="font-medium text-slate-700 dark:text-slate-300">Email:</span> {selected.email}</p>
                  {selected.phone && <p><span className="font-medium text-slate-700 dark:text-slate-300">Teléfono:</span> {selected.phone}</p>}
                  {selected.birth_date && <p><span className="font-medium text-slate-700 dark:text-slate-300">Fecha nac.:</span> {selected.birth_date}</p>}
                  {(selected.province || selected.locality) && (
                    <p><span className="font-medium text-slate-700 dark:text-slate-300">Ubicación:</span> {[selected.province, selected.locality].filter(Boolean).join(', ')}</p>
                  )}
                  <p><span className="font-medium text-slate-700 dark:text-slate-300">Registrado:</span> {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true, locale: es })}</p>
                  {selected.suspended_until && (
                    <p><span className="font-medium text-slate-700 dark:text-slate-300">Suspendido hasta:</span> {new Date(selected.suspended_until).toLocaleDateString('es')}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Cambiar rol</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.role !== 'admin' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={acting}
                        onClick={() => handleRole(selected.id, 'admin')}
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Hacer admin
                      </Button>
                    )}
                    {selected.role !== 'moderator' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={acting}
                        onClick={() => handleRole(selected.id, 'moderator')}
                      >
                        <ShieldCheck className="w-4 h-4 mr-1" />
                        Hacer moderador
                      </Button>
                    )}
                    {selected.role !== 'viewer' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={acting}
                        onClick={() => handleRole(selected.id, 'viewer')}
                      >
                        Quitar rol especial
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Suspender (días sin publicar ni comentar)</Label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={suspendDays}
                      onChange={(e) => setSuspendDays(e.target.value)}
                      className="w-24"
                    />
                    <Button size="sm" variant="outline" disabled={acting} onClick={() => handleSuspend(selected.id)}>
                      <Clock className="w-4 h-4 mr-1" />
                      Suspender
                    </Button>
                    {isSuspended(selected) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={acting}
                        onClick={async () => {
                          setActing(true)
                          const { ok, error } = await setUserSuspended(selected.id, null)
                          setActing(false)
                          if (ok) {
                            toast.success('Suspensión quitada')
                            loadAdminProfiles()
                            setSelected(null)
                          } else toast.error(error ?? 'Error')
                        }}
                      >
                        Quitar suspensión
                      </Button>
                    )}
                  </div>
                </div>

                <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
                  {selected.status !== 'blocked' ? (
                    <Button variant="destructive" size="sm" disabled={acting} onClick={() => handleBlock(selected.id)}>
                      <Ban className="w-4 h-4 mr-1" />
                      Bloquear cuenta
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled={acting} onClick={() => handleUnblock(selected.id)}>
                      <UserX className="w-4 h-4 mr-1" />
                      Desbloquear
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={acting || selected.id === currentUser?.id}
                    onClick={() => handleDelete(selected.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Eliminar cuenta
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
