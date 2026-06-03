'use client'

import { useEffect, useState } from 'react'
import { isLikelyAndroid } from '@/lib/push-enrollment'

/**
 * Aviso si el usuario tiene un APK viejo bloqueado por Play Protect.
 * La solución es desinstalar CST y reinstalar (PWA desde Chrome o APK con targetSdk 35).
 */
export function AndroidPlayProtectHint({ className = '' }: { className?: string }) {
	const [show, setShow] = useState(false)

	useEffect(() => {
		setShow(isLikelyAndroid())
	}, [])

	if (!show) return null

	return (
		<p
			className={
				className ||
				'mt-2 text-center text-[10px] leading-snug text-amber-200/90 os-light:text-amber-900/90'
			}
		>
			¿Google dice que CST no es segura? Desinstalá el icono viejo e instalá de nuevo con el botón de arriba
			(Chrome) o el APK actualizado del equipo técnico.
		</p>
	)
}
