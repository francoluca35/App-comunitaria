'use client'

import { useEffect, useMemo } from 'react'
import { useAuth } from '@/app/providers/auth-context'
import { createClient } from '@/lib/supabase/client'
import {
	ONLINE_PRESENCE_CHANNEL,
	countUniquePresenceKeys,
	setOnlinePresenceCount,
} from '@/lib/online-presence'

/**
 * Mantiene a cada usuario logueado en el canal de presencia compartido.
 * El conteo se actualiza en sync para el panel admin (y cualquier listener).
 */
export function OnlinePresenceTracker() {
	const { currentUser } = useAuth()
	const supabase = useMemo(() => createClient(), [])

	useEffect(() => {
		if (!currentUser?.id) {
			setOnlinePresenceCount(0)
			return
		}

		const userId = currentUser.id
		const channel = supabase.channel(ONLINE_PRESENCE_CHANNEL, {
			config: {
				presence: {
					key: userId,
				},
			},
		})

		const publishCount = () => {
			setOnlinePresenceCount(countUniquePresenceKeys(channel.presenceState()))
		}

		channel
			.on('presence', { event: 'sync' }, publishCount)
			.on('presence', { event: 'join' }, publishCount)
			.on('presence', { event: 'leave' }, publishCount)
			.subscribe(async (status) => {
				if (status !== 'SUBSCRIBED') return
				try {
					await channel.track({
						user_id: userId,
						online_at: new Date().toISOString(),
					})
				} catch {
					// Sin presencia el card admin queda en 0; no bloquea la app.
				}
			})

		return () => {
			void channel.untrack()
			void supabase.removeChannel(channel)
			setOnlinePresenceCount(0)
		}
	}, [currentUser?.id, supabase])

	return null
}
