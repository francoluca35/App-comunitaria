/**
 * Alta y comprobación de Web Push (avisos con la app cerrada).
 */

import { registerWebPushIfPossible } from '@/lib/push-client'
import { showPushEnrollmentPreviewFirstTime } from '@/lib/notifications'

export type BrowserPushPermission = 'granted' | 'denied' | 'default' | 'unsupported'

export function getBrowserPushPermission(): BrowserPushPermission {
	if (typeof window === 'undefined') return 'unsupported'
	if (!('Notification' in window)) return 'unsupported'
	return Notification.permission
}

export function isPushApiAvailable(): boolean {
	if (typeof window === 'undefined') return false
	return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function fetchServerPushStatus(
	accessToken: string
): Promise<{ registered: boolean; deviceCount: number } | null> {
	try {
		const res = await fetch('/api/push/status', {
			headers: { Authorization: `Bearer ${accessToken}` },
		})
		if (!res.ok) return null
		const j = (await res.json()) as { registered?: boolean; deviceCount?: number }
		return {
			registered: Boolean(j.registered),
			deviceCount: typeof j.deviceCount === 'number' ? j.deviceCount : 0,
		}
	} catch {
		return null
	}
}

export type EnrollPushResult = { ok: boolean; reason?: string }

/** Pide permiso (opcional), registra suscripción en el servidor y aviso de prueba la primera vez. */
export async function enrollPushDevice(
	accessToken: string,
	opts?: { requestPermission?: boolean }
): Promise<EnrollPushResult> {
	if (!isPushApiAvailable()) {
		return { ok: false, reason: 'no_push_api' }
	}

	let perm = getBrowserPushPermission()
	if (perm === 'unsupported') {
		return { ok: false, reason: 'no_push_api' }
	}

	if (perm === 'default' && opts?.requestPermission !== false) {
		perm = await Notification.requestPermission()
	}

	if (perm !== 'granted') {
		return { ok: false, reason: perm === 'denied' ? 'denied' : 'no_permission' }
	}

	const result = await registerWebPushIfPossible(accessToken)
	if (result.ok) {
		await showPushEnrollmentPreviewFirstTime()
	}
	return result
}

export function isLikelyAndroid(): boolean {
	if (typeof window === 'undefined') return false
	return /Android/i.test(window.navigator.userAgent || '')
}
