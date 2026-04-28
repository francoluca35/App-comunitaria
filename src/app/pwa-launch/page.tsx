'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PwaLaunchPage() {
	const router = useRouter()

	useEffect(() => {
		const t = window.setTimeout(() => {
			router.replace('/')
		}, 450)
		return () => window.clearTimeout(t)
	}, [router])

	return (
		<div
			className="relative min-h-screen bg-[#180008] bg-cover bg-center bg-no-repeat"
			style={{ backgroundImage: "url('/Assets/fondo-inicio-app.png')" }}
		>
			<div className="absolute inset-0 bg-black/20" aria-hidden />
		</div>
	)
}
