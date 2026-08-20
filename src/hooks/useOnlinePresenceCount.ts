'use client'

import { useSyncExternalStore } from 'react'
import {
	getOnlinePresenceCount,
	subscribeOnlinePresenceCount,
} from '@/lib/online-presence'

export function useOnlinePresenceCount(): number {
	return useSyncExternalStore(
		subscribeOnlinePresenceCount,
		getOnlinePresenceCount,
		() => 0
	)
}
