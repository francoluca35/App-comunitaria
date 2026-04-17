'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useApp, type Post } from '@/app/providers'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Skeleton } from '@/app/components/ui/skeleton'
import { DashboardLayout } from '@/components/DashboardLayout'
import { AvatarImageCropDialog } from '@/components/AvatarImageCropDialog'
import { PostCard } from '@/components/PostCard'
import { PostCommentsModal } from '@/components/PostCommentsModal'
import {
  LogOut,
  Mail,
  Shield,
  Trash2,
  Upload,
  Phone,
  MapPin,
  PenLine,
  Megaphone,
  Loader2,
  ChevronRight,
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { CST } from '@/lib/cst-theme'

type PublicidadStatus = 'pending' | 'payment_pending' | 'active' | 'rejected'

type MisPublicidad = {
  id: string
  title: string
  description: string
  category: string
  images: string[]
  status: PublicidadStatus
  created_at: string
  start_at: string | null
  end_at: string | null
  payment_link_url: string | null
  days_left: number
}

function formatPublicidadStatus(status: PublicidadStatus) {
  if (status === 'active') return 'Activa'
  if (status === 'payment_pending') return 'Pendiente de pago'
  if (status === 'rejected') return 'Rechazada'
  return 'En revisión'
}

function publicidadDetailHref(p: MisPublicidad, isActiveNow: boolean) {
  if (isActiveNow) return `/cartelera/${p.id}`
  return `/mis-publicidades/${p.id}/editar`
}

export default function ProfilePage() {
  const router = useRouter()
  const { currentUser, authLoading, logout, refreshUser, posts, postsLoading, publicidadCategories } = useApp()
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editProvince, setEditProvince] = useState('')
  const [editLocality, setEditLocality] = useState('')
  const [selectedPostModal, setSelectedPostModal] = useState<Post | null>(null)
  const [pubLoading, setPubLoading] = useState(true)
  const [pubActive, setPubActive] = useState<MisPublicidad[]>([])
  const [pubInactive, setPubInactive] = useState<MisPublicidad[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categoryBySlug = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of publicidadCategories) map.set(c.slug, c.label)
    return map
  }, [publicidadCategories])

  const myPosts = useMemo(() => {
    if (!currentUser) return []
    return posts
      .filter((p) => p.authorId === currentUser.id)
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [posts, currentUser])

  const pubTotal = pubActive.length + pubInactive.length

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

  useEffect(() => {
    if (!currentUser) return
    let cancelled = false
    ;(async () => {
      setPubLoading(true)
      try {
        const supabase = createClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) return
        const res = await fetch('/api/publicidad/mis', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('fail')
        const data = (await res.json().catch(() => ({}))) as {
          active?: MisPublicidad[]
          inactive?: MisPublicidad[]
        }
        if (cancelled) return
        setPubActive(Array.isArray(data.active) ? data.active : [])
        setPubInactive(Array.isArray(data.inactive) ? data.inactive : [])
      } catch {
        if (!cancelled) toast.error('No se pudieron cargar tus publicidades')
      } finally {
        if (!cancelled) setPubLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentUser?.id])

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

  const uploadAvatarFile = async (file: File) => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) {
      toast.error('Sesión expirada. Volvé a iniciar sesión.')
      throw new Error('Sin sesión')
    }
    setUploading(true)
    try {
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
        throw new Error('Subida rechazada')
      }
      await refreshUser()
      toast.success('Foto de perfil actualizada')
      setAvatarModalOpen(false)
    } catch (err) {
      const known =
        err instanceof Error && (err.message === 'Subida rechazada' || err.message === 'Sin sesión')
      if (!known) {
        toast.error('Error de conexión. Intentá de nuevo.')
      }
      throw err
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePhoto = async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
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

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCropFile(file)
    setCropOpen(true)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
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

  const renderPostsList = () => (
    <div className="space-y-3">
      {postsLoading ? (
        <>
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </>
      ) : myPosts.length === 0 ? (
        <Card className="border-[#D8D2CC] bg-white dark:border-gray-700 dark:bg-[#242526]">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-[#7A5C52] dark:text-[#b0b3b8]">Todavía no publicaste nada en la comunidad.</p>
            <Button asChild style={{ backgroundColor: CST.bordo }} className="text-white hover:bg-[#5A000E]">
              <Link href="/create">
                <PenLine className="mr-2 h-4 w-4" />
                Crear publicación
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        myPosts.map((post) => (
          <PostCard key={post.id} post={post} onOpenComments={(p) => setSelectedPostModal(p)} />
        ))
      )}
    </div>
  )

  const previewPublicidades = [...pubActive, ...pubInactive].slice(0, 4)

  const renderPublicidadesBlock = (compact: boolean) => (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#7A5C52] dark:text-[#b0b3b8]">
          Mis publicidades
        </h2>
        <Button asChild variant="outline" size="sm" className="shrink-0 rounded-xl border-[#D8D2CC]">
          <Link href="/mis-publicidades">
            Gestionar
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
      {pubLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-7 w-7 animate-spin text-[#7A5C52]" />
        </div>
      ) : pubTotal === 0 ? (
        <Card className="border-[#D8D2CC] dark:border-gray-700">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <Megaphone className="h-10 w-10 text-[#7A5C52]" />
            <p className="text-sm text-[#7A5C52] dark:text-[#b0b3b8]">No tenés publicidades en la cartelera.</p>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/cartelera/crear">Crear publicidad</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className={compact ? 'space-y-2' : 'space-y-3'}>
            {previewPublicidades.map((p) => {
              const isActiveNow =
                p.status === 'active' && p.end_at && new Date(p.end_at).getTime() > Date.now()
              const href = publicidadDetailHref(p, isActiveNow)
              return (
                <Link
                  key={p.id}
                  href={href}
                  className="flex gap-3 rounded-xl border border-[#D8D2CC] bg-white p-3 transition-colors hover:border-[#8B0015]/40 hover:bg-[#FDFCFB] dark:border-gray-700 dark:bg-[#242526] dark:hover:bg-[#2d2f31]"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#E8E4E0] dark:bg-gray-700">
                    {p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Megaphone className="h-6 w-6 text-[#7A5C52]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#2B2B2B] dark:text-[#e4e6eb]">{p.title}</p>
                    <p className="mt-0.5 text-xs text-[#7A5C52] dark:text-[#b0b3b8]">
                      {categoryBySlug.get(p.category) ?? p.category}
                      {isActiveNow ? ` · ${p.days_left} días` : ` · ${formatPublicidadStatus(p.status)}`}
                    </p>
                  </div>
                  <Pencil className="mt-1 h-4 w-4 shrink-0 text-[#8B0015]" aria-hidden />
                </Link>
              )
            })}
          </div>
          {pubTotal > previewPublicidades.length ? (
            <Button asChild variant="ghost" className="w-full text-[#8B0015] hover:text-[#5A000E]">
              <Link href="/mis-publicidades">Ver las {pubTotal} publicidades</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" className="w-full rounded-xl border-[#D8D2CC]">
            <Link href="/cartelera/crear">
              <Megaphone className="mr-2 h-4 w-4" />
              Nueva publicidad
            </Link>
          </Button>
        </>
      )}
    </div>
  )

  const renderDatosCard = (formIdSuffix: string) => (
    <Card className="border-[#D8D2CC] dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-[#2B2B2B] dark:text-white">Datos personales</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`edit-name-${formIdSuffix}`}>Nombre</Label>
            <Input
              id={`edit-name-${formIdSuffix}`}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Tu nombre"
              className="bg-white dark:bg-gray-800"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-phone-${formIdSuffix}`}>Teléfono</Label>
            <Input
              id={`edit-phone-${formIdSuffix}`}
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="Ej. +54 9 11 1234-5678"
              className="bg-white dark:bg-gray-800"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-province-${formIdSuffix}`}>Provincia</Label>
            <Input
              id={`edit-province-${formIdSuffix}`}
              value={editProvince}
              onChange={(e) => setEditProvince(e.target.value)}
              placeholder="Provincia"
              className="bg-white dark:bg-gray-800"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-locality-${formIdSuffix}`}>Localidad</Label>
            <Input
              id={`edit-locality-${formIdSuffix}`}
              value={editLocality}
              onChange={(e) => setEditLocality(e.target.value)}
              placeholder="Localidad"
              className="bg-white dark:bg-gray-800"
            />
          </div>
          <Button type="submit" className="w-full rounded-xl text-white hover:bg-[#5A000E]" style={{ backgroundColor: CST.bordo }} disabled={savingProfile}>
            {savingProfile ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )

  const subline = currentUser.locality
    ? `${[currentUser.locality, currentUser.province].filter(Boolean).join(', ')}`
    : currentUser.province ?? 'Vecino/a de la comunidad'

  return (
    <DashboardLayout contentClassName="max-w-5xl">
      <PostCommentsModal post={selectedPostModal} onClose={() => setSelectedPostModal(null)} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarFileChange}
      />
      <AvatarImageCropDialog
        open={cropOpen}
        onOpenChange={(open) => {
          setCropOpen(open)
          if (!open) setCropFile(null)
        }}
        file={cropFile}
        onConfirm={(file) => uploadAvatarFile(file)}
      />
      <Dialog open={avatarModalOpen} onOpenChange={setAvatarModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Foto de perfil</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6">
            <div className="flex h-48 w-48 shrink-0 overflow-hidden rounded-full bg-slate-200 ring-2 ring-[#D8D2CC] dark:bg-gray-700 dark:ring-gray-600">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name ?? ''} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-slate-500 dark:text-gray-400">
                  {currentUser.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
            <DialogFooter className="w-full flex-col gap-2 sm:flex-col">
              <Button type="button" className="w-full rounded-xl" onClick={handleChangePhoto} disabled={uploading}>
                <Upload className="mr-2 h-4 w-4" />
                Cambiar foto
              </Button>
              <Button type="button" variant="outline" className="w-full rounded-xl" onClick={handleDeletePhoto} disabled={deleting || !currentUser.avatar}>
                <Trash2 className="mr-2 h-4 w-4" />
                {deleting ? 'Eliminando…' : 'Eliminar foto'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Portada + avatar (estilo red social) */}
      <div className="relative mb-2">
        <div className="relative h-36 overflow-hidden rounded-b-2xl bg-[#1a1520] sm:h-44">
          <Image
            src="/Assets/fondo-perfil.png"
            alt="Portada del perfil CST Comunidad"
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 1024px"
          />
        </div>
        <div className="absolute -bottom-10 left-4 sm:-bottom-12 sm:left-6">
          <button
            type="button"
            onClick={handleAvatarClick}
            className="relative block h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-[#E8E4E0] shadow-lg ring-0 transition hover:ring-2 hover:ring-[#8B0015] focus:outline-none focus:ring-2 focus:ring-[#8B0015] focus:ring-offset-2 dark:border-[#242526] sm:h-28 sm:w-28"
            aria-label="Ver o cambiar foto de perfil"
          >
            <Avatar className="h-full w-full rounded-none border-0">
              <AvatarImage src={currentUser.avatar} className="object-cover" />
              <AvatarFallback className="rounded-none text-2xl">{currentUser.name?.[0] ?? '?'}</AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>

      <div className="mt-12 px-0 sm:mt-14 sm:px-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 pl-1 sm:pl-2">
            <h1 className="font-montserrat-only text-2xl font-bold text-[#2B2B2B] dark:text-white sm:text-3xl">{currentUser.name}</h1>
            {currentUser.isAdmin && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#8B0015]/10 px-3 py-1 text-xs font-medium text-[#8B0015] dark:bg-[#8B0015]/25 dark:text-[#F3C9D0]">
                <Shield className="h-3.5 w-3.5" />
                Administrador
              </div>
            )}
            <p className="mt-0.5 text-sm text-[#7A5C52] dark:text-[#b0b3b8]">{subline}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#7A5C52] dark:text-[#b0b3b8]">
              <span>
                <strong className="text-[#2B2B2B] dark:text-[#e4e6eb]">{myPosts.length}</strong> publicaciones
              </span>
              <span>
                <strong className="text-[#2B2B2B] dark:text-[#e4e6eb]">{pubTotal}</strong> publicidades
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pl-1 sm:justify-end">
            <Button asChild size="sm" className="rounded-xl text-white hover:bg-[#5A000E]" style={{ backgroundColor: CST.bordo }}>
              <Link href="/create">
                <PenLine className="mr-2 h-4 w-4" />
                Publicar
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-xl border-[#D8D2CC]">
              <Link href="/cartelera/crear">
                <Megaphone className="mr-2 h-4 w-4" />
                Publicidad
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 border-b border-[#D8D2CC] pb-4 text-sm dark:border-gray-700">
          <div className="flex items-center gap-2 text-[#7A5C52] dark:text-[#b0b3b8]">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="truncate">{currentUser.email}</span>
          </div>
          {currentUser.phone ? (
            <div className="flex items-center gap-2 text-[#7A5C52] dark:text-[#b0b3b8]">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{currentUser.phone}</span>
            </div>
          ) : null}
          {(currentUser.province || currentUser.locality) && (
            <div className="flex items-center gap-2 text-[#7A5C52] dark:text-[#b0b3b8]">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{[currentUser.locality, currentUser.province].filter(Boolean).join(', ')}</span>
            </div>
          )}
        </div>

        {currentUser.isAdmin && (
          <div className="mt-4">
            <Button variant="outline" className="w-full rounded-xl border-[#8B0015]/30 sm:w-auto" onClick={() => router.push('/admin')}>
              <Shield className="mr-2 h-4 w-4" />
              Panel de administrador
            </Button>
          </div>
        )}
      </div>

      {/* Móvil: pestañas */}
      <div className="mt-6 lg:hidden">
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-[#E8E4E0] p-1 dark:bg-[#3a3b3c]">
            <TabsTrigger value="posts" className="rounded-lg text-xs sm:text-sm">
              Publicaciones
            </TabsTrigger>
            <TabsTrigger value="pubs" className="rounded-lg text-xs sm:text-sm">
              Publicidades
            </TabsTrigger>
            <TabsTrigger value="datos" className="rounded-lg text-xs sm:text-sm">
              Datos
            </TabsTrigger>
          </TabsList>
          <TabsContent value="posts" className="mt-4 space-y-1">
            <h2 className="mb-2 font-montserrat-only text-lg font-semibold text-[#2B2B2B] dark:text-white">Tus publicaciones</h2>
            {renderPostsList()}
          </TabsContent>
          <TabsContent value="pubs" className="mt-4">
            {renderPublicidadesBlock(true)}
          </TabsContent>
          <TabsContent value="datos" className="mt-4 space-y-4">
            {renderDatosCard('movil')}
            <Button variant="destructive" className="w-full rounded-xl" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      {/* Escritorio: columna publicaciones + barra lateral */}
      <div className="mt-8 hidden gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          <h2 className="mb-3 font-montserrat-only text-lg font-semibold text-[#2B2B2B] dark:text-white">Publicaciones</h2>
          {renderPostsList()}
        </section>
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-20 lg:self-start">
          {renderPublicidadesBlock(false)}
          {renderDatosCard('escritorio')}
          <Button variant="destructive" className="w-full rounded-xl" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </aside>
      </div>
    </DashboardLayout>
  )
}
