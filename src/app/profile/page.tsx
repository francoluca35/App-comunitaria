'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useApp } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { BottomNav } from '@/components/BottomNav'
import { Switch } from '@/app/components/ui/switch'
import { Label } from '@/app/components/ui/label'
import { LogOut, Mail, Shield } from 'lucide-react'
import { toast } from 'sonner'

export default function ProfilePage() {
  const router = useRouter()
  const { currentUser, authLoading, logout } = useApp()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login')
    }
  }, [authLoading, currentUser, router])

  if (!currentUser) {
    return null
  }

  const handleLogout = () => {
    logout()
    toast.success('Sesión cerrada')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-2xl text-center">Perfil</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage src={currentUser.avatar} />
                <AvatarFallback className="text-2xl">{currentUser.name[0]}</AvatarFallback>
              </Avatar>

              <h2 className="text-2xl mb-1">{currentUser.name}</h2>

              {currentUser.isAdmin && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm mb-3">
                  <Shield className="w-3.5 h-3.5" />
                  Administrador
                </div>
              )}

              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{currentUser.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode" className="flex items-center gap-2 cursor-pointer">
                <span>Modo oscuro</span>
              </Label>
              <Switch
                id="dark-mode"
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>

        {currentUser.isAdmin && (
          <Card className="border-blue-200 dark:border-blue-800">
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

      <BottomNav />
    </div>
  )
}
