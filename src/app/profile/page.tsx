'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { DashboardLayout } from '@/components/DashboardLayout'
import { LogOut, Mail, Shield, Trash2, Upload, Phone, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const router = useRouter()
  const { currentUser, authLoading, logout, refreshUser } = useApp()
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editProvince, setEditProvince] = useState('')
  const [editLocality, setEditLocality] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login')
    }
  }, [authLoading, currentUser, router])

  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name ?? '')
      setEditPhone(currentUser.phone ?? '')
      setEditProvince(currentUser.province ?? '')
      setEditLocality(currentUser.locality ?? '')
    }
  }, [currentUser])

  if (!currentUser) {
    return null
  }

  const handleLogout = async () => {
    await logout()
    toast.success('Sesión cerrada')
    router.push('/login')
  }

  const handleAvatarClick = () => {
    setAvatarModalOpen(true)
  }

  const handleChangePhoto = () => {
    setAvatarModalOpen(false)
    fileInputRef.current?.click()
  }

  const handleDeletePhoto = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      toast.error('Sesión expirada. Volvé a iniciar sesión.')
      return
    }
    setDeleting(true)
    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Error al eliminar la foto')
        return
      }
      await refreshUser()
      toast.success('Foto eliminada')
      setAvatarModalOpen(false)
    } catch {
      toast.error('Error de conexión. Intentá de nuevo.')
    } finally {
      setDeleting(false)
    }
  }

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('Sesión expirada. Volvé a iniciar sesión.')
        return
      }
      const formData = new FormData()
      formData.append('avatar', file)
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Error al subir la foto')
        return
      }
      await refreshUser()
      toast.success('Foto de perfil actualizada')
      setAvatarModalOpen(false)
    } catch {
      toast.error('Error de conexión. Intentá de nuevo.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      toast.error('Sesión expirada. Volvé a iniciar sesión.')
      return
    }
    setSavingProfile(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName.trim() || undefined,
          phone: editPhone.trim() || undefined,
          province: editProvince.trim() || undefined,
          locality: editLocality.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Error al guardar')
        return
      }
      await refreshUser()
      toast.success('Datos actualizados')
    } catch {
      toast.error('Error de conexión. Intentá de nuevo.')
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <DashboardLayout>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarFileChange}
      />
      <Dialog open={avatarModalOpen} onOpenChange={setAvatarModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Foto de perfil</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6">
            <div className="w-48 h-48 rounded-full overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-gray-700 ring-2 ring-slate-200 dark:ring-gray-600">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name ?? 'Foto de perfil'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-semibold text-slate-500 dark:text-gray-400">
                  {currentUser.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
            <DialogFooter className="flex flex-col gap-2 w-full sm:flex-col">
              <Button type="button" className="w-full" onClick={handleChangePhoto} disabled={uploading}>
                <Upload className="w-4 h-4 mr-2" />
                Cambiar foto
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleDeletePhoto}
                disabled={deleting || !currentUser.avatar}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? 'Eliminando…' : 'Eliminar foto'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Perfil</h1>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <div
                role="button"
                tabIndex={0}
                onClick={handleAvatarClick}
                onKeyDown={(e) => e.key === 'Enter' && handleAvatarClick()}
                className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 cursor-pointer ring-2 ring-slate-200 dark:ring-gray-700 hover:ring-[#8B0015] dark:hover:ring-[#8B0015] focus:outline-none focus:ring-2 focus:ring-[#8B0015] focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-60 mb-4"
                aria-label="Ver o cambiar foto de perfil"
              >
                <Avatar className="w-full h-full rounded-none">
                  <AvatarImage src={currentUser.avatar} className="object-cover" />
                  <AvatarFallback className="text-2xl rounded-none">{currentUser.name?.[0] ?? '?'}</AvatarFallback>
                </Avatar>
              </div>
              {uploading && (
                <p className="text-sm text-slate-500 dark:text-gray-400 mb-2">Subiendo…</p>
              )}

              <h2 className="text-2xl mb-1">{currentUser.name}</h2>

              {currentUser.isAdmin && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#8B0015]/10 dark:bg-[#8B0015]/25 text-[#8B0015] dark:text-[#F3C9D0] rounded-full text-sm mb-3">
                  <Shield className="w-3.5 h-3.5" />
                  Administrador
                </div>
              )}

              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="text-sm">{currentUser.email}</span>
              </div>
              {currentUser.phone && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{currentUser.phone}</span>
                </div>
              )}
              {(currentUser.province || currentUser.locality) && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="text-sm">
                    {[currentUser.locality, currentUser.province].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Modificar datos</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Tu nombre"
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Teléfono</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Ej. +54 9 11 1234-5678"
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-province">Provincia</Label>
                <Input
                  id="edit-province"
                  value={editProvince}
                  onChange={(e) => setEditProvince(e.target.value)}
                  placeholder="Provincia"
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-locality">Localidad</Label>
                <Input
                  id="edit-locality"
                  value={editLocality}
                  onChange={(e) => setEditLocality(e.target.value)}
                  placeholder="Localidad"
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <Button type="submit" className="w-full" disabled={savingProfile}>
                {savingProfile ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {currentUser.isAdmin && (
          <Card className="border-[#8B0015]/25 dark:border-[#8B0015]/50">
            <CardContent className="p-4">
              <Button variant="outline" className="w-full" onClick={() => router.push('/admin')}>
                <Shield className="w-4 h-4 mr-2" />
                Ir al Panel de Administrador
              </Button>
            </CardContent>
          </Card>
        )}

        <Button variant="destructive" className="w-full" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </DashboardLayout>
  )
}
