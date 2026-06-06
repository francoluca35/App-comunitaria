/** Versión embebida en el build del cliente (ver `next.config.mjs`). */
export const CLIENT_APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'

const DISMISS_KEY = 'cst_app_update_dismissed_v'

export type AppVersionInfo = {
	version: string
	minSupportedVersion: string
}

export function compareAppVersions(a: string, b: string): number {
	const pa = a.split('.').map((part) => parseInt(part, 10) || 0)
	const pb = b.split('.').map((part) => parseInt(part, 10) || 0)
	const len = Math.max(pa.length, pb.length)
	for (let i = 0; i < len; i += 1) {
		const na = pa[i] ?? 0
		const nb = pb[i] ?? 0
		if (na !== nb) return na - nb
	}
	return 0
}

export function isClientVersionOutdated(client: string, server: AppVersionInfo): boolean {
	if (compareAppVersions(client, server.minSupportedVersion) < 0) return true
	return compareAppVersions(client, server.version) < 0
}

export function isClientVersionRequiredUpdate(client: string, server: AppVersionInfo): boolean {
	return compareAppVersions(client, server.minSupportedVersion) < 0
}

export function readDismissedUpdateVersion(): string | null {
	if (typeof window === 'undefined') return null
	try {
		return window.localStorage.getItem(DISMISS_KEY)
	} catch {
		return null
	}
}

export function dismissOptionalUpdate(serverVersion: string): void {
	if (typeof window === 'undefined') return
	try {
		window.localStorage.setItem(DISMISS_KEY, serverVersion)
	} catch {
		/* noop */
	}
}

export async function clearAppCaches(): Promise<void> {
	if (typeof window === 'undefined' || !('caches' in window)) return
	try {
		const keys = await caches.keys()
		await Promise.all(keys.filter((key) => key.startsWith('comunidad')).map((key) => caches.delete(key)))
	} catch {
		/* noop */
	}
}

export async function applyAppUpdate(): Promise<void> {
	await clearAppCaches()
	if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
		try {
			const reg = await navigator.serviceWorker.getRegistration()
			reg?.waiting?.postMessage({ type: 'SKIP_WAITING' })
			await reg?.update()
		} catch {
			/* noop */
		}
	}
	window.location.reload()
}
