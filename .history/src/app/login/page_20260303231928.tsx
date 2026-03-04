'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { toast } from 'sonner'
import { Users, Chrome } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login, loginWithGoogle, register } = useAuth()

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [registerName, setRegisterName] = useState('')
  const [registerBirthDate, setRegisterBirthDate] = useState('')
  const [registerPhone, setRegisterPhone] = useState('')
  const [registerProvince, setRegisterProvince] = useState('')
  const [registerLocality, setRegisterLocality] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('')

  const [loading, setLoading] = useState(false)

  const isAtLeast17 = (dateStr: string) => {
    if (!dateStr) return false
    const birth = new Date(dateStr)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age >= 17
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = loginEmail?.trim() ?? ''
    const password = loginPassword ?? ''
    if (!email) {
      toast.error('Ingresá tu email')
      return
    }
    if (!password) {
      toast.error('Ingresá tu contraseña')
      return
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    try {
      const result = await login(email, password)
      if (result.ok) {
        toast.success('¡Bienvenido de vuelta!')
        router.push('/')
      } else {
        toast.error(result.error ?? 'Email o contraseña incorrectos')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const ok = await loginWithGoogle()
      if (ok) toast.success('Redirigiendo a Google...')
      else toast.error('Error al iniciar sesión con Google')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!registerName?.trim() || !registerBirthDate || !registerPhone?.trim() || !registerProvince?.trim() || !registerLocality?.trim() || !registerEmail?.trim() || !registerPassword) {
      toast.error('Por favor completá todos los campos')
      return
    }
    if (!isAtLeast17(registerBirthDate)) {
      toast.error('Debes tener al menos 17 años para registrarte')
      return
    }
    if (registerPassword !== registerPasswordConfirm) {
      toast.error('La contraseña y la confirmación no coinciden')
      return
    }
    if (registerPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    try {
      const result = await register({
        name: registerName.trim(),
        birthDate: registerBirthDate,
        phone: registerPhone.trim(),
        province: registerProvince.trim(),
        locality: registerLocality.trim(),
        email: registerEmail.trim(),
        password: registerPassword,
      })
      if (result.ok) {
        toast.success('¡Cuenta creada exitosamente!')
        router.push('/')
      } else {
        toast.error(result.error ?? 'Error al crear la cuenta (¿email ya registrado?)')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl mb-2">Comunidad</h1>
          <p className="text-gray-600 dark:text-gray-400">Plataforma de difusión comunitaria</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Iniciar Sesión</CardTitle>
                <CardDescription>Ingresa a tu cuenta para ver y crear publicaciones</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Entrando...' : 'Iniciar Sesión'}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300 dark:border-gray-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-gray-950 px-2 text-gray-500">O continuar con</span>
                    </div>
                  </div>

                  <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
                    <Chrome className="w-4 h-4 mr-2" />
                    Google
                  </Button>
                </form>

                <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  ¿Sin cuenta? <strong>Registrarse</strong> arriba.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Crear Cuenta</CardTitle>
                <CardDescription>Completá tus datos (mayor de 17 años)</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nombre completo</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Nombre y apellido"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-birthdate">Fecha de nacimiento</Label>
                    <Input
                      id="register-birthdate"
                      type="date"
                      value={registerBirthDate}
                      onChange={(e) => setRegisterBirthDate(e.target.value)}
                      required
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 17)).toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Debes tener al menos 17 años</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-phone">Número de teléfono</Label>
                    <Input
                      id="register-phone"
                      type="tel"
                      placeholder="Ej. 11 1234-5678"
                      value={registerPhone}
                      onChange={(e) => setRegisterPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="register-province">Provincia</Label>
                      <Input
                        id="register-province"
                        type="text"
                        placeholder="Provincia"
                        value={registerProvince}
                        onChange={(e) => setRegisterProvince(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-locality">Localidad</Label>
                      <Input
                        id="register-locality"
                        type="text"
                        placeholder="Localidad"
                        value={registerLocality}
                        onChange={(e) => setRegisterLocality(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Contraseña</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password-confirm">Confirmar contraseña</Label>
                    <Input
                      id="register-password-confirm"
                      type="password"
                      placeholder="Repetí la contraseña"
                      value={registerPasswordConfirm}
                      onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300 dark:border-gray-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-gray-950 px-2 text-gray-500">O continuar con</span>
                    </div>
                  </div>

                  <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
                    <Chrome className="w-4 h-4 mr-2" />
                    Google
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
