'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ONLINE_PRESENCE_ADMIN_POLL_MS } from '@/lib/online-presence'

/** Conteo global de usuarios conectados (solo útil en pantallas admin). */
export function useOnlinePresenceCount(enabled = true): number {
	const [count, setCount] = useState(0)

	const refresh = useCallback(async () => {
		if (!enabled) return
		try {
			const supabase = createClient()
			const {
				data: { session },
			} = await supabase.auth.getSession()
			const token = session?.access_token
			if (!token) {
				setCount(0)
				return
			}

			const res = await fetch('/api/admin/online-count', {
				headers: { Authorization: `Bearer ${token}` },
				cache: 'no-store',
			})
			if (!res.ok) return
			const data = (await res.json()) as { count?: number }
			if (typeof data.count === 'number') setCount(data.count)
		} catch {
			// Mantener último valor conocido.
		}
	}, [enabled])

	useEffect(() => {
		if (!enabled) {
			setCount(0)
			return
		}

		void refresh()
		const intervalId = window.setInterval(() => {
			void refresh()
		}, ONLINE_PRESENCE_ADMIN_POLL_MS)

		const onVisible = () => {
			if (document.visibilityState === 'visible') void refresh()
		}
		document.addEventListener('visibilitychange', onVisible)

		return () => {
			window.clearInterval(intervalId)
			document.removeEventListener('visibilitychange', onVisible)
		}
	}, [enabled, refresh])

	return count
}
