import { notifyPushEnrollmentChanged } from '@/lib/push-enrollment-events'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
	const rawData = window.atob(base64)
	const outputArray = new Uint8Array(rawData.length)
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i)
	}
	return outputArray
}

function vapidKeyMatchesSubscription(sub: PushSubscription, vapidPublicB64: string): boolean {
	try {
		const opt = sub.options?.applicationServerKey
		if (!opt) return false
		const fromSub = new Uint8Array(opt)
		const fromEnv = new Uint8Array(urlBase64ToUint8Array(vapidPublicB64.trim()))
		if (fromSub.length !== fromEnv.length) return false
		return fromSub.every((b, i) => b === fromEnv[i])
	} catch {
		return false
	}
}

/** Asegura `/sw.js` registrado antes de usar PushManager (evita carrera con el mount de Providers). */
async function ensurePushServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
	if (!('serviceWorker' in navigator)) {
		throw new Error('no_service_worker')
	}
	const existing = await navigator.serviceWorker.getRegistration()
	if (!existing) {
		await navigator.serviceWorker.register('/sw.js')
	}
	return navigator.serviceWorker.ready
}

export async function registerWebPushIfPossible(accessToken: string): Promise<{ ok: boolean; reason?: string }> {
	if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
		return { ok: false, reason: 'no_push_api' }
	}

	const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
	if (!vapidPublic?.trim()) {
		return { ok: false, reason: 'no_vapid' }
	}

	if (!('Notification' in window) || window.Notification.permission !== 'granted') {
		return { ok: false, reason: 'no_permission' }
	}

	try {
		const reg = await ensurePushServiceWorkerRegistration()
		const key = new Uint8Array(urlBase64ToUint8Array(vapidPublic.trim()))

		let sub = await reg.pushManager.getSubscription()
		if (sub && !vapidKeyMatchesSubscription(sub, vapidPublic)) {
			await sub.unsubscribe()
			sub = null
		}
		if (!sub) {
			sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: key,
			})
		}

		const json = sub.toJSON()
		if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
			return { ok: false, reason: 'invalid_subscription' }
		}

		const res = await fetch('/api/push/subscribe', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({
				endpoint: json.endpoint,
				keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
			}),
		})

		if (!res.ok) {
			const j = (await res.json().catch(() => ({}))) as { error?: string }
			return { ok: false, reason: j.error ?? `http_${res.status}` }
		}
		notifyPushEnrollmentChanged()
		return { ok: true }
	} catch (e) {
		console.warn('registerWebPushIfPossible:', e)
		return { ok: false, reason: 'exception' }
	}
}
