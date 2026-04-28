'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PwaLaunchPage() {
	const router = useRouter()

	useEffect(() => {
		const t = window.setTimeout(() => {
			router.replace('/')
		}, 700)
		return () => window.clearTimeout(t)
	}, [router])

	return (
		<div
			className="flex min-h-screen items-center justify-center p-6 bg-cover bg-center bg-no-repeat"
			style={{ backgroundImage: "url('/Assets/fondo-inicio-app.png')" }}
		>
			<div className="absolute inset-0 bg-black/25" aria-hidden />
			<div className="flex flex-col items-center gap-4">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src="/Assets/logo-mobil.png"
					alt="CST Comunidad"
					className="relative z-10 h-32 w-32 rounded-[1.8rem] shadow-[0_12px_35px_rgba(0,0,0,0.35)]"
				/>
				<p className="relative z-10 text-xs font-semibold tracking-[0.22em] text-white/85">CST COMUNIDAD</p>
			</div>
		</div>
	)
}
