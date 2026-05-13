'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
	fetchServerPushStatus,
	getBrowserPushPermission,
	isPushApiAvailable,
} from '@/lib/push-enrollment'
import { PUSH_ENROLLMENT_CHANGED_EVENT } from '@/lib/push-enrollment-events'
import type { BrowserPushPermission } from '@/lib/push-enrollment'

export type PushEnrollmentStatus = {
	loading: boolean
	pushApiAvailable: boolean
	permission: BrowserPushPermission
	registeredOnServer: boolean
	deviceCount: number
	/** Permiso OK pero sin fila en push_subscriptions (hay que sincronizar). */
	needsServerSync: boolean
	/** Sin permiso o denegado: no llegarán avisos con la app cerrada. */
	needsPermission: boolean
	/** Listo para recibir push en segundo plano en este dispositivo. */
	fullyEnrolled: boolean
	refresh: () => Promise<void>
}

export function usePushEnrollmentStatus(userId: string | null | undefined): PushEnrollmentStatus {
	const [loading, setLoading] = useState(true)
	const [permission, setPermission] = useState<BrowserPushPermission>('unsupported')
	const [registeredOnServer, setRegisteredOnServer] = useState(false)
	const [deviceCount, setDeviceCount] = useState(0)

	const refresh = useCallback(async () => {
		if (!userId) {
			setLoading(false)
			setRegisteredOnServer(false)
			setDeviceCount(0)
			return
		}
		setPermission(getBrowserPushPermission())
		try {
			const supabase = createClient()
			const {
				data: { session },
			} = await supabase.auth.getSession()
			if (!session?.access_token) {
				setRegisteredOnServer(false)
				setDeviceCount(0)
				return
			}
			const server = await fetchServerPushStatus(session.access_token)
			setRegisteredOnServer(server?.registered ?? false)
			setDeviceCount(server?.deviceCount ?? 0)
		} finally {
			setLoading(false)
		}
	}, [userId])

	useEffect(() => {
		setLoading(true)
		void refresh()
	}, [refresh])

	useEffect(() => {
		if (!userId) return
		const onChange = () => {
			void refresh()
		}
		const onVisible = () => {
			if (document.visibilityState === 'visible') void refresh()
		}
		window.addEventListener(PUSH_ENROLLMENT_CHANGED_EVENT, onChange)
		document.addEventListener('visibilitychange', onVisible)
		return () => {
			window.removeEventListener(PUSH_ENROLLMENT_CHANGED_EVENT, onChange)
			document.removeEventListener('visibilitychange', onVisible)
		}
	}, [userId, refresh])

	const pushApiAvailable = isPushApiAvailable()
	const needsPermission = pushApiAvailable && permission !== 'granted'
	const needsServerSync = pushApiAvailable && permission === 'granted' && !registeredOnServer
	const fullyEnrolled = pushApiAvailable && permission === 'granted' && registeredOnServer

	return {
		loading,
		pushApiAvailable,
		permission,
		registeredOnServer,
		deviceCount,
		needsServerSync,
		needsPermission,
		fullyEnrolled,
		refresh,
	}
}
