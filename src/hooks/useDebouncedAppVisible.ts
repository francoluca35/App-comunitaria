'use client'

import { useEffect, useRef } from 'react'

const DEFAULT_MIN_INTERVAL_MS = 5 * 60 * 1000

/**
 * Ejecuta `callback` al volver a la pestaña, como máximo una vez cada `minIntervalMs`.
 * Evita tormentas de refetch al cambiar de app en móvil.
 */
export function useDebouncedAppVisible(callback: () => void, minIntervalMs = DEFAULT_MIN_INTERVAL_MS) {
	const callbackRef = useRef(callback)
	const lastRunRef = useRef(0)

	useEffect(() => {
		callbackRef.current = callback
	}, [callback])

	useEffect(() => {
		let t: ReturnType<typeof setTimeout> | undefined
		const schedule = () => {
			if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
			clearTimeout(t)
			t = setTimeout(() => {
				const now = Date.now()
				if (now - lastRunRef.current < minIntervalMs) return
				lastRunRef.current = now
				callbackRef.current()
			}, 400)
		}
		document.addEventListener('visibilitychange', schedule)
		window.addEventListener('focus', schedule)
		return () => {
			clearTimeout(t)
			document.removeEventListener('visibilitychange', schedule)
			window.removeEventListener('focus', schedule)
		}
	}, [minIntervalMs])
}
