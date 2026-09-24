'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/app/providers/auth-context'
import { createClient } from '@/lib/supabase/client'
import { ONLINE_PRESENCE_HEARTBEAT_MS } from '@/lib/online-presence'

/**
 * Registra presencia global en `user_presence` (Supabase) para el conteo del admin.
 * Escribe directo al bucket con RLS (sin depender solo del API route).
 */
export function OnlinePresenceTracker() {
	const { currentUser } = useAuth()
	const inFlightRef = useRef(false)

	const sendHeartbeat = useCallback(async () => {
		if (!currentUser?.id || inFlightRef.current) return

		inFlightRef.current = true
		try {
			const supabase = createClient()
			const userId = currentUser.id
			const now = new Date().toISOString()

			const { error } = await supabase.from('user_presence').upsert(
				{ user_id: userId, last_seen_at: now },
				{ onConflict: 'user_id' }
			)

			// Fallback si el cliente no puede escribir (RLS / schema cache): API con service role.
			if (error) {
				const {
					data: { session },
				} = await supabase.auth.getSession()
				const token = session?.access_token
				if (!token) return
				await fetch('/api/presence/heartbeat', {
					method: 'POST',
					headers: { Authorization: `Bearer ${token}` },
					keepalive: true,
				})
			}
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
