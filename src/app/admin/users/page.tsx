'use client'

import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { Badge } from '@/app/components/ui/badge'
import { ArrowLeft, UserX, UserCheck, Shield } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminUsersPage() {
  const router = useRouter()
  const { currentUser, users, toggleBlockUser } = useApp()

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

  const handleToggleBlock = (userId: string, userName: string, isBlocked: boolean) => {
    toggleBlockUser(userId)
    toast.success(isBlocked ? `${userName} desbloqueado` : `${userName} bloqueado`)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-6">
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg">Gestión de Usuarios</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-900 dark:text-blue-300">
          <p>
            Total de usuarios: <strong>{users.length}</strong>
          </p>
          <p className="text-xs mt-1 text-blue-700 dark:text-blue-400">Bloqueados: {users.filter((u) => u.isBlocked).length}</p>
        </div>

        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{user.name}</h3>
                      {user.isAdmin && (
                        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {user.isBlocked && <Badge variant="destructive">Bloqueado</Badge>}
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                  </div>

                  {!user.isAdmin && user.id !== currentUser.id && (
                    <Button
                      variant={user.isBlocked ? 'outline' : 'destructive'}
                      size="sm"
                      onClick={() => handleToggleBlock(user.id, user.name, user.isBlocked)}
                    >
                      {user.isBlocked ? (
                        <>
                          <UserCheck className="w-4 h-4 mr-1" />
                          Desbloquear
                        </>
                      ) : (
                        <>
                          <UserX className="w-4 h-4 mr-1" />
                          Bloquear
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
