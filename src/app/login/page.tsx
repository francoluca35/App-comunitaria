'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePwaInstallPrompt } from '@/hooks/usePwaInstallPrompt'
import { Button } from '@/app/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { toast } from 'sonner'
import { Chrome, Download, Facebook, Share2 } from 'lucide-react'
import { LoginLegalLinks, LoginOAuthTrustNote } from '@/components/login/LoginTrustFooter'

export default function LoginPage() {
	const { login, register, loginWithGoogle, loginWithFacebook } = useAuth()
	const { canOfferInstall, canOfferIosInstallHint, install } = usePwaInstallPrompt()
	const [iosInstallDialogOpen, setIosInstallDialogOpen] = useState(false)
	const [loading, setLoading] = useState(false)
	const [mode, setMode] = useState<'signup' | 'signin'>('signin')
	const [mobileStep, setMobileStep] = useState<'welcome' | 'signin' | 'signup'>('welcome')
	const [panelAnimation, setPanelAnimation] = useState<'slide-left' | 'slide-right'>('slide-right')
	const [swapPhase, setSwapPhase] = useState<'idle' | 'out' | 'in'>('idle')
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

	const handleAuth = async (provider: 'google' | 'facebook') => {
		setLoading(true)
		try {
			const ok = provider === 'google' ? await loginWithGoogle() : await loginWithFacebook()
			if (!ok) {
				toast.error(`Error al iniciar con ${provider === 'google' ? 'Google' : 'Facebook'}`)
				return
			}
			toast.success(`Redirigiendo a ${provider === 'google' ? 'Google' : 'Facebook'}...`)
		} finally {
			setLoading(false)
		}
	}

	const handlePasswordLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		try {
			const result = await login(loginEmail, loginPassword)
			if (!result.ok) {
				toast.error(result.error ?? 'Email o contraseña incorrectos')
				return
			}
			toast.success('¡Bienvenido de vuelta!')
			window.location.href = '/'
		} finally {
			setLoading(false)
		}
	}

	const isAtLeast17 = (dateStr: string) => {
		if (!dateStr) return false
		const birth = new Date(dateStr)
		const today = new Date()
		let age = today.getFullYear() - birth.getFullYear()
		const monthDiff = today.getMonth() - birth.getMonth()
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--
		return age >= 17
	}

	const handleRegister = async (e: React.FormEvent) => {
		e.preventDefault()
		if (
			!registerName.trim() ||
			!registerBirthDate ||
			!registerPhone.trim() ||
			!registerProvince.trim() ||
			!registerLocality.trim() ||
			!registerEmail.trim() ||
			!registerPassword
		) {
			toast.error('Por favor completá todos los campos')
			return
		}
		if (!isAtLeast17(registerBirthDate)) {
			toast.error('Debes tener al menos 17 años para registrarte')
			return
		}
		if (registerPassword.length < 6) {
			toast.error('La contraseña debe tener al menos 6 caracteres')
			return
		}
		if (registerPassword !== registerPasswordConfirm) {
			toast.error('La contraseña y la confirmación no coinciden')
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
			if (!result.ok) {
				toast.error(result.error ?? 'No se pudo crear la cuenta')
				return
			}
			toast.success('Cuenta creada correctamente')
			window.location.href = '/'
		} finally {
			setLoading(false)
		}
	}

	const toggleMode = () => {
		if (swapPhase !== 'idle') return
		const nextMode = mode === 'signup' ? 'signin' : 'signup'
		setSwapPhase('out')
		window.setTimeout(() => {
			setPanelAnimation(nextMode === 'signup' ? 'slide-left' : 'slide-right')
			setMode(nextMode)
			setSwapPhase('in')
			window.setTimeout(() => {
				setSwapPhase('idle')
			}, 360)
		}, 220)
		setMobileStep(nextMode)
	}

	return (
		<div className="min-h-screen w-screen bg-[#e8e7f2]">
			<div className="min-h-screen w-full overflow-hidden bg-[#f4f3f8] md:relative md:h-screen">
				<section className="relative min-h-screen overflow-hidden bg-[#0f1014] text-white os-light:bg-[#f6f4f1] os-light:text-[#2B2B2B] md:hidden">
					<div className="absolute inset-0 bg-[url('/Assets/fondo-login-mobile-n.png')] bg-cover bg-center opacity-95 os-light:bg-[url('/Assets/fondo-login-mobile-b.png')] os-light:opacity-100" />
					<div className="absolute inset-0 bg-black/30 os-light:bg-white/20" />

					<div className="relative z-10 flex min-h-screen flex-col px-6 pb-8 pt-10">
						<div className="mb-8 flex flex-col items-center text-center">
							<img src="/Assets/cst.png" alt="Logo CST" className="w-52 max-w-full" />
							<h1 className="mt-4 text-2xl font-semibold tracking-tight text-white os-light:text-[#2B2B2B]">Bienvenidos</h1>
							{canOfferInstall || canOfferIosInstallHint ? (
								<div className="mt-4 w-full max-w-[280px] rounded-xl border border-[#8B0015]/55 bg-black/25 p-3 os-light:border-[#8B0015]/35 os-light:bg-white/80">
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											if (canOfferInstall) void install()
											else setIosInstallDialogOpen(true)
										}}
										className="h-11 w-full gap-2 rounded-lg border-[#8B0015]/60 bg-[#8B0015]/90 text-sm font-semibold text-white hover:bg-[#8B0015] hover:text-white os-light:border-[#8B0015] os-light:bg-[#8B0015] os-light:hover:bg-[#5A000E]"
									>
										{canOfferInstall ? (
											<>
												<Download className="h-4 w-4 shrink-0" aria-hidden />
												Instalar app
											</>
										) : (
											<>
												<Share2 className="h-4 w-4 shrink-0" aria-hidden />
												Cómo instalar la app
											</>
										)}
									</Button>
									<p className="mt-2 text-center text-[11px] leading-snug text-white/70 os-light:text-[#5c5652]">
										{canOfferInstall
											? 'Instalá CST en tu teléfono para abrirla como aplicación.'
											: 'En iPhone o iPad: añadí CST a la pantalla de inicio desde Safari.'}
									</p>
								</div>
							) : null}
						</div>

						{mobileStep === 'welcome' ? (
							<div className="mt-auto rounded-lg border border-white/10 bg-black/30 p-5 os-light:border-[#D8D2CC] os-light:bg-white/92 os-light:shadow-sm">
								<h2 className="text-center text-lg font-semibold text-white os-light:text-[#2B2B2B]">Entrá o registrate</h2>
								<p className="mt-2 text-center text-sm leading-relaxed text-white/65 os-light:text-[#5c5652]">
									Si ya tenés cuenta, iniciá sesión. Si no, podés crear una en unos pasos.
								</p>
								<div className="mt-5 space-y-2.5">
									<Button
										type="button"
										variant="default"
										onClick={() => {
											setMode('signin')
											setMobileStep('signin')
										}}
										className="h-11 w-full rounded-lg text-sm font-medium"
									>
										Tengo cuenta
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											setMode('signup')
											setMobileStep('signup')
										}}
										className="h-11 w-full rounded-lg border-white/25 bg-transparent text-sm font-medium text-white hover:bg-white/5 hover:text-white dark:border-white/25 dark:bg-transparent dark:hover:bg-white/5 os-light:border-[#8B0015]/40 os-light:text-[#8B0015] os-light:hover:bg-[#8B0015]/8 os-light:hover:text-[#5A000E]"
									>
										Crear cuenta
									</Button>
								</div>
							</div>
						) : mobileStep === 'signin' ? (
							<div className="mt-auto rounded-lg border border-white/10 bg-black/30 p-5 os-light:border-[#D8D2CC] os-light:bg-white/92 os-light:shadow-sm">
								<h2 className="text-center text-lg font-semibold text-white os-light:text-[#2B2B2B]">Iniciar sesión</h2>
								<form onSubmit={handlePasswordLogin} className="mt-4 space-y-3.5">
									<div className="space-y-1.5">
										<Label htmlFor="mobile-login-email" className="text-xs font-medium text-white/60 os-light:text-[#5c5652]">
											Usuario o correo
										</Label>
										<Input
											id="mobile-login-email"
											type="email"
											value={loginEmail}
											onChange={(e) => setLoginEmail(e.target.value)}
											placeholder="ejemplo@ejemplo.com"
											className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 focus-visible:border-[#8B0015] focus-visible:ring-1 focus-visible:ring-[#8B0015]/25 os-light:border-[#D8D2CC] os-light:bg-white os-light:text-[#2B2B2B] os-light:placeholder:text-[#9a918a]"
											required
										/>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="mobile-login-password" className="text-xs font-medium text-white/60 os-light:text-[#5c5652]">
											Contraseña
										</Label>
										<Input
											id="mobile-login-password"
											type="password"
											value={loginPassword}
											onChange={(e) => setLoginPassword(e.target.value)}
											placeholder="••••••••"
											className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 focus-visible:border-[#8B0015] focus-visible:ring-1 focus-visible:ring-[#8B0015]/25 os-light:border-[#D8D2CC] os-light:bg-white os-light:text-[#2B2B2B] os-light:placeholder:text-[#9a918a]"
											required
										/>
									</div>
									<Button type="submit" variant="default" disabled={loading} className="h-11 w-full rounded-lg text-sm font-medium">
										{loading ? 'Ingresando...' : 'Entrar'}
									</Button>
								</form>
								<div className="my-4 flex items-center gap-3">
									<div className="h-px flex-1 bg-white/10 os-light:bg-[#D8D2CC]" />
									<span className="text-xs text-white/45 os-light:text-[#7A5C52]">o con</span>
									<div className="h-px flex-1 bg-white/10 os-light:bg-[#D8D2CC]" />
								</div>
								<LoginOAuthTrustNote variant="mobile-dark" />
								<div className="mt-3 grid grid-cols-2 gap-2.5">
									<button
										type="button"
										onClick={() => {
											void handleAuth('google')
										}}
										className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-white hover:bg-white/10 os-light:border-[#E8E4E0] os-light:bg-white os-light:text-[#2B2B2B] os-light:hover:bg-[#F4EFEA]"
										aria-label="Google"
										title="Google"
									>
										<Chrome className="h-4 w-4 text-[#ea4335]" />
										<span>Google</span>
									</button>
									<button
										type="button"
										onClick={() => {
											void handleAuth('facebook')
										}}
										className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-white hover:bg-white/10 os-light:border-[#E8E4E0] os-light:bg-white os-light:text-[#2B2B2B] os-light:hover:bg-[#F4EFEA]"
										aria-label="Facebook"
										title="Facebook"
									>
										<Facebook className="h-4 w-4 text-[#8B0015]" />
										<span>Facebook</span>
									</button>
								</div>
								<div className="mt-4">
									<LoginLegalLinks variant="mobile-dark" />
								</div>
								<div className="mt-4 flex flex-col items-center gap-2 text-sm">
									<button
										type="button"
										onClick={() => {
											setMode('signup')
											setMobileStep('signup')
										}}
										className="text-white/75 underline underline-offset-2 hover:text-white os-light:text-[#8B0015] os-light:hover:text-[#5A000E]"
									>
										No tengo cuenta, crear una
									</button>
									<button
										type="button"
										onClick={() => setMobileStep('welcome')}
										className="text-xs text-white/45 hover:text-white/65 os-light:text-[#7A5C52] os-light:hover:text-[#5c5652]"
									>
										Volver
									</button>
								</div>
							</div>
						) : (
							<div className="mt-auto rounded-lg border border-white/10 bg-black/30 p-5 os-light:border-[#D8D2CC] os-light:bg-white/92 os-light:shadow-sm">
								<h2 className="text-center text-lg font-semibold text-white os-light:text-[#2B2B2B]">Crear cuenta</h2>
								<form onSubmit={handleRegister} className="mt-4 space-y-3">
									<div className="space-y-1.5">
										<Label htmlFor="mobile-register-name" className="text-xs font-medium text-white/60 os-light:text-[#5c5652]">
											Nombre completo
										</Label>
										<Input
											id="mobile-register-name"
											type="text"
											value={registerName}
											onChange={(e) => setRegisterName(e.target.value)}
											placeholder="Nombre y apellido"
											className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 focus-visible:border-[#8B0015] focus-visible:ring-1 focus-visible:ring-[#8B0015]/25 os-light:border-[#D8D2CC] os-light:bg-white os-light:text-[#2B2B2B] os-light:placeholder:text-[#9a918a]"
											required
										/>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="mobile-register-birthdate" className="text-xs font-medium text-white/60 os-light:text-[#5c5652]">
											Fecha de nacimiento
										</Label>
										<Input
											id="mobile-register-birthdate"
											type="date"
											value={registerBirthDate}
											onChange={(e) => setRegisterBirthDate(e.target.value)}
											className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus-visible:border-[#8B0015] focus-visible:ring-1 focus-visible:ring-[#8B0015]/25 os-light:border-[#D8D2CC] os-light:bg-white os-light:text-[#2B2B2B]"
											required
										/>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="mobile-register-phone" className="text-xs font-medium text-white/60 os-light:text-[#5c5652]">
											Teléfono
										</Label>
										<Input
											id="mobile-register-phone"
											type="tel"
											value={registerPhone}
											onChange={(e) => setRegisterPhone(e.target.value)}
											placeholder="Ej: 11 1234-5678"
											className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 focus-visible:border-[#8B0015] focus-visible:ring-1 focus-visible:ring-[#8B0015]/25 os-light:border-[#D8D2CC] os-light:bg-white os-light:text-[#2B2B2B] os-light:placeholder:text-[#9a918a]"
											required
										/>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="mobile-register-province" className="text-xs font-medium text-white/60 os-light:text-[#5c5652]">
											Provincia
										</Label>
										<Input
											id="mobile-register-province"
											type="text"
											value={registerProvince}
											onChange={(e) => setRegisterProvince(e.target.value)}
											className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus-visible:border-[#8B0015] focus-visible:ring-1 focus-visible:ring-[#8B0015]/25 os-light:border-[#D8D2CC] os-light:bg-white os-light:text-[#2B2B2B]"
											required
										/>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="mobile-register-locality" className="text-xs font-medium text-white/60 os-light:text-[#5c5652]">
											Localidad
										</Label>
										<Input
											id="mobile-register-locality"
											type="text"
											value={registerLocality}
											onChange={(e) => setRegisterLocality(e.target.value)}
											className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus-visible:border-[#8B0015] focus-visible:ring-1 focus-visible:ring-[#8B0015]/25 os-light:border-[#D8D2CC] os-light:bg-white os-light:text-[#2B2B2B]"
											required
										/>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="mobile-register-email" className="text-xs font-medium text-white/60 os-light:text-[#5c5652]">
											Correo electrónico
										</Label>
										<Input
											id="mobile-register-email"
											type="email"
											value={registerEmail}
											onChange={(e) => setRegisterEmail(e.target.value)}
											placeholder="ejemplo@ejemplo.com"
											className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 focus-visible:border-[#8B0015] focus-visible:ring-1 focus-visible:ring-[#8B0015]/25 os-light:border-[#D8D2CC] os-light:bg-white os-light:text-[#2B2B2B] os-light:placeholder:text-[#9a918a]"
											required
										/>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="mobile-register-password" className="text-xs font-medium text-white/60 os-light:text-[#5c5652]">
											Contraseña
										</Label>
										<Input
											id="mobile-register-password"
											type="password"
											value={registerPassword}
											onChange={(e) => setRegisterPassword(e.target.value)}
											placeholder="Mínimo 6 caracteres"
											className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 focus-visible:border-[#8B0015] focus-visible:ring-1 focus-visible:ring-[#8B0015]/25 os-light:border-[#D8D2CC] os-light:bg-white os-light:text-[#2B2B2B] os-light:placeholder:text-[#9a918a]"
											required
										/>
									</div>
									<div className="space-y-1.5">
										<Label
											htmlFor="mobile-register-password-confirm"
											className="text-xs font-medium text-white/60 os-light:text-[#5c5652]"
										>
											Confirmar contraseña
										</Label>
										<Input
											id="mobile-register-password-confirm"
											type="password"
											value={registerPasswordConfirm}
											onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
											placeholder="Repetí la contraseña"
											className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 focus-visible:border-[#8B0015] focus-visible:ring-1 focus-visible:ring-[#8B0015]/25 os-light:border-[#D8D2CC] os-light:bg-white os-light:text-[#2B2B2B] os-light:placeholder:text-[#9a918a]"
											required
										/>
									</div>
									<Button type="submit" variant="default" disabled={loading} className="h-11 w-full rounded-lg text-sm font-medium">
										{loading ? 'Creando cuenta...' : 'Registrarme'}
									</Button>
								</form>
								<div className="my-4 flex items-center gap-3">
									<div className="h-px flex-1 bg-white/10 os-light:bg-[#D8D2CC]" />
									<span className="text-xs text-white/45 os-light:text-[#7A5C52]">o con</span>
									<div className="h-px flex-1 bg-white/10 os-light:bg-[#D8D2CC]" />
								</div>
								<LoginOAuthTrustNote variant="mobile-dark" />
								<div className="mt-3 grid grid-cols-2 gap-2.5">
									<button
										type="button"
										onClick={() => {
											void handleAuth('google')
										}}
										className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-white hover:bg-white/10 os-light:border-[#E8E4E0] os-light:bg-white os-light:text-[#2B2B2B] os-light:hover:bg-[#F4EFEA]"
										aria-label="Google"
										title="Google"
									>
										<Chrome className="h-4 w-4 text-[#ea4335]" />
										<span>Google</span>
									</button>
									<button
										type="button"
										onClick={() => {
											void handleAuth('facebook')
										}}
										className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-white hover:bg-white/10 os-light:border-[#E8E4E0] os-light:bg-white os-light:text-[#2B2B2B] os-light:hover:bg-[#F4EFEA]"
										aria-label="Facebook"
										title="Facebook"
									>
										<Facebook className="h-4 w-4 text-[#8B0015]" />
										<span>Facebook</span>
									</button>
								</div>
								<div className="mt-4">
									<LoginLegalLinks variant="mobile-dark" />
								</div>
								<div className="mt-4 flex flex-col items-center gap-2 text-sm">
									<button
										type="button"
										onClick={() => {
											setMode('signin')
											setMobileStep('signin')
										}}
										className="text-white/75 underline underline-offset-2 hover:text-white os-light:text-[#8B0015] os-light:hover:text-[#5A000E]"
									>
										Ya tengo cuenta
									</button>
									<button
										type="button"
										onClick={() => setMobileStep('welcome')}
										className="text-xs text-white/45 hover:text-white/65 os-light:text-[#7A5C52] os-light:hover:text-[#5c5652]"
									>
										Volver
									</button>
								</div>
							</div>
						)}
					</div>
				</section>
				<section
					className={`relative hidden overflow-hidden transition-[opacity,transform] duration-300 ease-out md:absolute md:top-0 md:block md:h-full md:w-[56%] md:p-3 lg:p-4 ${
						mode === 'signup' ? 'md:left-[44%]' : 'md:left-0'
					} ${swapPhase === 'out' ? 'opacity-0 md:translate-y-2 md:scale-[0.985]' : 'opacity-100 md:translate-y-0 md:scale-100'} ${
						swapPhase === 'in' ? 'duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]' : ''
					}`}
				>
					<div
						className={`relative h-[230px] w-full overflow-hidden bg-[#0d1222] bg-cover bg-center sm:h-[280px] md:h-full ${
							mode === 'signup'
								? 'md:rounded-l-none md:rounded-r-[22px]'
								: 'md:rounded-l-[22px] md:rounded-r-none'
						} bg-[url('/Assets/fondo-login.jpeg')] [background-position:0%_center] md:bg-[url('/Assets/fondo-login2.jpg')] md:[background-position:center]`}
					>
						<div
							className={`hidden md:block absolute inset-0 bg-gradient-to-b from-black/5 via-black/25 to-black/75 ${
								mode === 'signup'
									? 'md:rounded-l-none md:rounded-r-[22px]'
									: 'md:rounded-l-[22px] md:rounded-r-none'
							}`}
						/>
						<div
							className={`hidden md:block absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(255,255,255,0.22),transparent_40%),radial-gradient(circle_at_85%_70%,rgba(255,116,152,0.15),transparent_36%)] ${
								mode === 'signup'
									? 'md:rounded-l-none md:rounded-r-[22px]'
									: 'md:rounded-l-[22px] md:rounded-r-none'
							}`}
						/>
						<img
							src="/Assets/cst.png"
							alt="CST"
							className="hidden md:block absolute left-1/2 top-4 z-10 w-[170px] -translate-x-1/2 lg:top-6 lg:w-[340px]"
						/>
						<img
							src="/Assets/escudo-st.png"
							alt="Escudo Santo Tomé"
							className={`hidden md:block absolute bottom-3 z-10 w-[74px] md:bottom-5 md:w-[110px] lg:w-[140px] ${
								mode === 'signup' ? 'left-3 md:left-5' : 'right-3 md:right-5'
							}`}
						/>
						<div className="relative z-10 hidden h-full flex-col justify-end p-6 text-white md:flex md:p-7 lg:p-8">
							<div className={`max-w-[280px] lg:max-w-xs ${mode === 'signup' ? 'md:ml-auto md:text-right' : ''}`}>
					
								<h2 className="text-2xl font-semibold leading-tight text-[#efedee] drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] lg:text-5xl">
									Tu lugar en la red, nuestra ciudad conectada.
								</h2>
							</div>
						</div>
					</div>
				</section>

				<section
					className={`hidden items-center justify-center px-4 py-6 transition-[opacity,transform] duration-300 ease-out sm:px-7 sm:py-8 md:absolute md:top-0 md:flex md:h-full md:w-[44%] md:justify-center md:px-6 lg:px-10 ${
						mode === 'signup' ? 'md:left-0' : 'md:left-[56%]'
					} ${swapPhase === 'out' ? 'opacity-0 md:-translate-y-2 md:scale-[0.985]' : 'opacity-100 md:translate-y-0 md:scale-100'} ${
						swapPhase === 'in' ? 'duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]' : ''
					}`}
				>
					<div className="w-full max-w-[560px] md:mx-auto">
						<div key={mode} className={panelAnimation}>
							<div className="mb-5 sm:mb-6">
								<h1 className="text-[30px] font-bold leading-tight text-slate-900 sm:text-[38px] lg:text-[42px]">
									{mode === 'signup' ? 'Crea tu cuenta' : 'Bienvenido de vuelta'}
								</h1>
								<p className="mt-2 text-[13px] leading-5 text-slate-500 sm:mt-3 sm:text-[15px] sm:leading-6">
									{mode === 'signup'
										? 'Continuá con Google o Facebook para crear tu cuenta en segundos.'
										: 'Ingresá con Google o Facebook para continuar en la comunidad.'}
								</p>
								{canOfferInstall || canOfferIosInstallHint ? (
									<div className="mt-4 rounded-xl border border-[#8B0015]/30 bg-[#8B0015]/5 p-3">
										<Button
											type="button"
											variant="outline"
											onClick={() => {
												if (canOfferInstall) void install()
												else setIosInstallDialogOpen(true)
											}}
											className="h-10 w-full gap-2 rounded-lg border-[#8B0015] bg-[#8B0015] text-sm font-semibold text-white hover:bg-[#5A000E] hover:text-white"
										>
											{canOfferInstall ? (
												<>
													<Download className="h-4 w-4 shrink-0" aria-hidden />
													Instalar app
												</>
											) : (
												<>
													<Share2 className="h-4 w-4 shrink-0" aria-hidden />
													Cómo instalar la app
												</>
											)}
										</Button>
										<p className="mt-2 text-center text-[11px] leading-snug text-slate-600">
											{canOfferInstall
												? 'Instalá CST como aplicación en este dispositivo.'
												: 'En iPhone o iPad usá “Añadir a pantalla de inicio” desde Safari.'}
										</p>
									</div>
								) : null}
							</div>

							{mode === 'signin' ? (
								<form onSubmit={handlePasswordLogin} className="mb-5 space-y-3.5 sm:mb-6 sm:space-y-4">
								<div className="space-y-1.5">
									<Label htmlFor="login-email" className="text-sm font-medium text-slate-600 sm:text-base">
										Correo electrónico
									</Label>
									<Input
										id="login-email"
										type="email"
										value={loginEmail}
										onChange={(e) => setLoginEmail(e.target.value)}
										placeholder="ejemplo@ejemplo.com"
										className="h-10 rounded-none border-0 border-b border-slate-300 bg-transparent px-0 text-sm shadow-none focus-visible:border-[#7c281d] focus-visible:ring-0 sm:h-11 sm:text-base"
										required
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="login-password" className="text-sm font-medium text-slate-600 sm:text-base">
										Contraseña
									</Label>
									<Input
										id="login-password"
										type="password"
										value={loginPassword}
										onChange={(e) => setLoginPassword(e.target.value)}
										placeholder="••••••••"
										className="h-10 rounded-none border-0 border-b border-slate-300 bg-transparent px-0 text-sm shadow-none focus-visible:border-[#7c281d] focus-visible:ring-0 sm:h-11 sm:text-base"
										required
									/>
								</div>
								<Button
									type="submit"
									disabled={loading}
									className="h-10 w-full rounded-lg bg-[#7c281d] text-sm font-semibold text-white shadow-[0_8px_18px_rgba(79,70,229,0.35)] hover:bg-[#7c281ddb] sm:h-11 sm:text-base"
								>
									{loading ? 'Ingresando...' : 'Iniciar sesión'}
								</Button>
								</form>
							) : (
								<form onSubmit={handleRegister} className="mb-5 space-y-3 sm:mb-6">
								<div className="space-y-1.5">
									<Label htmlFor="register-name" className="text-sm font-medium text-slate-600">
										Nombre completo
									</Label>
									<Input
										id="register-name"
										type="text"
										value={registerName}
										onChange={(e) => setRegisterName(e.target.value)}
										placeholder="Nombre y apellido"
										className="h-10 rounded-none border-0 border-b border-slate-300 bg-transparent px-0 text-sm shadow-none focus-visible:border-[#7c281d] focus-visible:ring-0 sm:text-base"
										required
									/>
								</div>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
									<div className="space-y-1.5">
										<Label htmlFor="register-birthdate" className="text-sm font-medium text-slate-600">
											Fecha de nacimiento
										</Label>
										<Input
											id="register-birthdate"
											type="date"
											value={registerBirthDate}
											onChange={(e) => setRegisterBirthDate(e.target.value)}
											className="h-10 rounded-none border-0 border-b border-slate-300 bg-transparent px-0 text-sm shadow-none focus-visible:border-[#7c281d] focus-visible:ring-0 sm:text-base"
											required
										/>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="register-phone" className="text-sm font-medium text-slate-600">
											Teléfono
										</Label>
										<Input
											id="register-phone"
											type="tel"
											value={registerPhone}
											onChange={(e) => setRegisterPhone(e.target.value)}
											placeholder="Ej: 11 1234-5678"
											className="h-10 rounded-none border-0 border-b border-slate-300 bg-transparent px-0 text-sm shadow-none focus-visible:border-[#7c281d] focus-visible:ring-0 sm:text-base"
											required
										/>
									</div>
								</div>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
									<div className="space-y-1.5">
										<Label htmlFor="register-province" className="text-sm font-medium text-slate-600">
											Provincia
										</Label>
										<Input
											id="register-province"
											type="text"
											value={registerProvince}
											onChange={(e) => setRegisterProvince(e.target.value)}
											className="h-10 rounded-none border-0 border-b border-slate-300 bg-transparent px-0 text-sm shadow-none focus-visible:border-[#7c281d] focus-visible:ring-0 sm:text-base"
											required
										/>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="register-locality" className="text-sm font-medium text-slate-600">
											Localidad
										</Label>
										<Input
											id="register-locality"
											type="text"
											value={registerLocality}
											onChange={(e) => setRegisterLocality(e.target.value)}
											className="h-10 rounded-none border-0 border-b border-slate-300 bg-transparent px-0 text-sm shadow-none focus-visible:border-[#7c281d] focus-visible:ring-0 sm:text-base"
											required
										/>
									</div>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="register-email" className="text-sm font-medium text-slate-600">
										Correo electrónico
									</Label>
									<Input
										id="register-email"
										type="email"
										value={registerEmail}
										onChange={(e) => setRegisterEmail(e.target.value)}
										placeholder="ejemplo@ejemplo.com"
										className="h-10 rounded-none border-0 border-b border-slate-300 bg-transparent px-0 text-sm shadow-none focus-visible:border-[#7c281d] focus-visible:ring-0 sm:text-base"
										required
									/>
								</div>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
									<div className="space-y-1.5">
										<Label htmlFor="register-password" className="text-sm font-medium text-slate-600">
											Contraseña
										</Label>
										<Input
											id="register-password"
											type="password"
											value={registerPassword}
											onChange={(e) => setRegisterPassword(e.target.value)}
											placeholder="Mínimo 6 caracteres"
											className="h-10 rounded-none border-0 border-b border-slate-300 bg-transparent px-0 text-sm shadow-none focus-visible:border-[#7c281d] focus-visible:ring-0 sm:text-base"
											required
										/>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="register-password-confirm" className="text-sm font-medium text-slate-600">
											Confirmar contraseña
										</Label>
										<Input
											id="register-password-confirm"
											type="password"
											value={registerPasswordConfirm}
											onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
											placeholder="Repetí la contraseña"
											className="h-10 rounded-none border-0 border-b border-slate-300 bg-transparent px-0 text-sm shadow-none focus-visible:border-[#7c281d] focus-visible:ring-0 sm:text-base"
											required
										/>
									</div>
								</div>
								<Button
									type="submit"
									disabled={loading}
									className="h-10 w-full rounded-lg bg-[#7c281d] text-sm font-semibold text-white shadow-[0_8px_18px_rgba(79,70,229,0.35)] hover:bg-[#7c281ddb] sm:h-11 sm:text-base"
								>
									{loading ? 'Creando cuenta...' : 'Crear cuenta'}
								</Button>
								</form>
							)}

							<div className="mb-4 flex items-center gap-2.5 sm:gap-3">
								<div className="h-px flex-1 bg-slate-300" />
								<span className="text-[10px] text-slate-400 sm:text-[11px]">
									{mode === 'signup' ? 'Registrarte con' : 'Iniciar sesión con'}
								</span>
								<div className="h-px flex-1 bg-slate-300" />
							</div>

							<LoginOAuthTrustNote variant="desktop" />

							<div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3">
						
								<button
									type="button"
									onClick={() => {
										void handleAuth('google')
									}}
									className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#ececef] px-3 text-sm font-semibold text-slate-700 sm:h-11 sm:text-base"
									aria-label="Google"
									title="Google"
								>
									<Chrome className="h-4 w-4 text-[#ea4335] sm:h-5 sm:w-5" />
									<span>Google</span>
								</button>
								<button
									type="button"
									onClick={() => {
										void handleAuth('facebook')
									}}
									className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#ececef] px-3 text-sm font-semibold text-slate-700 sm:h-11 sm:text-base"
									aria-label="Facebook"
									title="Facebook"
								>
									<Facebook className="h-4 w-4 text-[#8B0015] sm:h-5 sm:w-5" />
									<span>Facebook</span>
								</button>
							</div>

							<div className="mt-4">
								<LoginLegalLinks variant="desktop" />
							</div>

							<div className="mt-4 text-center text-[13px] text-slate-500 sm:mt-5 sm:text-[14px]">
								{mode === 'signup' ? 'Ya tenés una cuenta?' : "Aun no tenés una cuenta?"}{' '}
								<button
									type="button"
									onClick={toggleMode}
									className="font-semibold text-[#871303] hover:text-[#7c281ddb]"
								>
									{mode === 'signup' ? 'Accede' : 'Registrate'}
								</button>
							</div>
						</div>
					</div>
				</section>
			</div>
			<Dialog open={iosInstallDialogOpen} onOpenChange={setIosInstallDialogOpen}>
				<DialogContent className="max-w-md border-[#D8D2CC] sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-[#2B2B2B]">Instalar CST en iPhone o iPad</DialogTitle>
						<DialogDescription className="text-left text-slate-600">
							Apple no permite el mismo botón de instalación que Android; hay que añadir el sitio a la pantalla de
							inicio desde Safari.
						</DialogDescription>
					</DialogHeader>
					<ol className="list-decimal space-y-3 pl-4 text-sm leading-relaxed text-slate-800">
						<li>
							Abrí esta página en <strong>Safari</strong> (si estás en Chrome u otro navegador, abrí el enlace en
							Safari).
						</li>
						<li>
							Tocá el botón <strong>Compartir</strong>{' '}
							<span className="whitespace-nowrap text-slate-600">(cuadrado con flecha hacia arriba)</span> en la
							barra inferior o junto a la barra de direcciones.
						</li>
						<li>
							En el menú, elegí <strong>«Añadir a pantalla de inicio»</strong> (puede estar más abajo: deslizá la
							lista).
						</li>
						<li>
							Tocá <strong>«Añadir»</strong>. Vas a ver el ícono de CST en tu inicio como una app más.
						</li>
					</ol>
					<DialogFooter className="sm:justify-end">
						<Button
							type="button"
							className="w-full bg-[#8B0015] text-white hover:bg-[#5A000E] sm:w-auto"
							onClick={() => setIosInstallDialogOpen(false)}
						>
							Entendido
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<style jsx>{`
				.slide-left {
					animation: slideLeft 280ms ease;
				}
				.slide-right {
					animation: slideRight 280ms ease;
				}
				@keyframes slideLeft {
					0% {
						opacity: 0;
						transform: translateX(18px);
					}
					100% {
						opacity: 1;
						transform: translateX(0);
					}
				}
				@keyframes slideRight {
					0% {
						opacity: 0;
						transform: translateX(-18px);
					}
					100% {
						opacity: 1;
						transform: translateX(0);
					}
				}
			`}</style>
		</div>
	)
}
