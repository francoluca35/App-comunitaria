'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/app/providers/auth-context'
import { createClient } from '@/lib/supabase/client'
import { ONLINE_PRESENCE_HEARTBEAT_MS } from '@/lib/online-presence'

/**
 * Envía heartbeats periódicos para alimentar el conteo global de conectados (admin).
 */
export function OnlinePresenceTracker() {
	const { currentUser } = useAuth()
	const inFlightRef = useRef(false)

	const sendHeartbeat = useCallback(async () => {
		if (!currentUser?.id || inFlightRef.current) return
		if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return

		inFlightRef.current = true
		try {
			const supabase = createClient()
			const {
				data: { session },
			} = await supabase.auth.getSession()
			const token = session?.access_token
			if (!token) return

			await fetch('/api/presence/heartbeat', {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
			})
		} catch {
			// Silencioso: el admin verá un conteo menor hasta el próximo heartbeat.
		} finally {
			inFlightRef.current = false
		}
	}, [currentUser?.id])

	useEffect(() => {
		if (!currentUser?.id) return

		void sendHeartbeat()
		const intervalId = window.setInterval(() => {
			void sendHeartbeat()
		}, ONLINE_PRESENCE_HEARTBEAT_MS)

		const onVisible = () => {
			if (document.visibilityState === 'visible') void sendHeartbeat()
		}
		document.addEventListener('visibilitychange', onVisible)
		window.addEventListener('focus', onVisible)

		return () => {
			window.clearInterval(intervalId)
			document.removeEventListener('visibilitychange', onVisible)
			window.removeEventListener('focus', onVisible)
		}
	}, [currentUser?.id, sendHeartbeat])

	return null
}
