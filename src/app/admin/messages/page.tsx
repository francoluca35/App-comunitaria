'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useApp, type AdminProfile } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ArrowLeft, Search, MessageSquare, ExternalLink } from 'lucide-react'
import Link from 'next/link'

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchProfile(profile: AdminProfile, query: string): boolean {
  if (!query.trim()) return true
  const q = normalize(query)
  const name = normalize(profile.name ?? '')
  const email = normalize(profile.email ?? '')
  const phone = (profile.phone ?? '').replace(/\D/g, '')
  const queryDigits = query.replace(/\D/g, '')
  return (
    name.includes(q) ||
    email.includes(q) ||
    (queryDigits.length >= 2 && phone.includes(queryDigits))
  )
}

export default function AdminMessagesPage() {
  const router = useRouter()
  const { currentUser, adminProfiles, adminProfilesLoading, loadAdminProfiles } = useApp()
  const [search, setSearch] = useState('')
  const hasRequestedLoad = useRef(false)

  useEffect(() => {
    if (!currentUser?.isAdmin || hasRequestedLoad.current) return
    hasRequestedLoad.current = true
    loadAdminProfiles()
  }, [currentUser?.isAdmin])

  const filtered = useMemo(() => {
    return adminProfiles.filter((p) => matchProfile(p, search))
  }, [adminProfiles, search])

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

  return (
    <DashboardLayout>
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Enviar mensaje / Chatear</h1>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Buscá por nombre completo, email o número de teléfono para encontrar a un usuario.
        </p>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Nombre, email o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-2">
          {adminProfilesLoading ? (
            <p className="text-slate-500 dark:text-slate-400 py-6 text-center">Cargando usuarios...</p>
          ) : filtered.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 py-6 text-center">
              {adminProfiles.length === 0 ? 'No hay usuarios cargados.' : 'Ningún usuario coincide con la búsqueda.'}
            </p>
          ) : (
            filtered.map((profile) => (
              <Card key={profile.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 shrink-0">
                      <AvatarImage src={profile.avatar_url ?? undefined} />
                      <AvatarFallback className="text-sm">{(profile.name ?? profile.email)[0]?.toUpperCase() ?? '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">{profile.name ?? profile.email}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{profile.email}</p>
                      {profile.phone && <p className="text-xs text-slate-500 dark:text-slate-400">Tel: {profile.phone}</p>}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                      <Button size="sm" variant="outline" asChild className="text-[#8B0015] dark:text-[#F3C9D0] border-[#8B0015]/30 dark:border-[#8B0015]/60 hover:bg-[#8B0015]/10 dark:hover:bg-[#8B0015]/20">
                        <Link href={`/admin/messages/chat/${profile.id}`}>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Por la app
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        <a
                          href={profile.phone ? `https://wa.me/${profile.phone.replace(/\D/g, '')}` : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-disabled={!profile.phone}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          WhatsApp
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
