/** Versión embebida en el build del cliente (ver `next.config.mjs`). */
export const CLIENT_APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'

const DISMISS_KEY = 'cst_app_update_dismissed_v'
const DISMISS_AT_KEY = 'cst_app_update_dismissed_at'

/** Tras "Más tarde", volvemos a ofrecer el aviso pasado este tiempo. */
export const UPDATE_DIALOG_DISMISS_MS = 24 * 60 * 60 * 1000

/** Mínimo entre consultas silenciosas al volver a la pestaña. */
export const UPDATE_CHECK_DEBOUNCE_MS = 30 * 60 * 1000

export type AppVersionInfo = {
	version: string
	minSupportedVersion: string
}

export function serviceWorkerScriptUrl(version = CLIENT_APP_VERSION): string {
	const v = encodeURIComponent(version.trim() || '0')
	return `/sw.js?v=${v}`
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

function readDismissedUpdateVersion(): string | null {
	if (typeof window === 'undefined') return null
	try {
		return window.localStorage.getItem(DISMISS_KEY)
	} catch {
		return null
	}
}

function readDismissedUpdateAt(): number {
	if (typeof window === 'undefined') return 0
	try {
		const raw = window.localStorage.getItem(DISMISS_AT_KEY)
		const n = raw ? parseInt(raw, 10) : 0
		return Number.isFinite(n) ? n : 0
	} catch {
		return 0
	}
}

export function isOptionalUpdateDialogSnoozed(serverVersion: string): boolean {
	const dismissed = readDismissedUpdateVersion()
	if (dismissed !== serverVersion) return false
	return Date.now() - readDismissedUpdateAt() < UPDATE_DIALOG_DISMISS_MS
}

export function dismissOptionalUpdateDialog(serverVersion: string): void {
	if (typeof window === 'undefined') return
	try {
		window.localStorage.setItem(DISMISS_KEY, serverVersion)
		window.localStorage.setItem(DISMISS_AT_KEY, String(Date.now()))
	} catch {
		/* noop */
	}
}

export function clearOptionalUpdateDialogSnooze(): void {
	if (typeof window === 'undefined') return
	try {
		window.localStorage.removeItem(DISMISS_KEY)
		window.localStorage.removeItem(DISMISS_AT_KEY)
	} catch {
		/* noop */
	}
}

export function isStandaloneApp(): boolean {
	if (typeof window === 'undefined') return false
	const nav = window.navigator as Navigator & { standalone?: boolean }
	return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

const CHUNK_RELOAD_SESSION_KEY = 'cst_chunk_reload_at'

export function isChunkLoadError(reason: unknown): boolean {
	if (!reason) return false
	const name =
		reason instanceof Error
			? reason.name
			: typeof reason === 'object' && reason !== null && 'name' in reason
				? String((reason as { name: unknown }).name)
				: ''
	const message = reason instanceof Error ? reason.message : String(reason)
	const combined = `${name} ${message}`.toLowerCase()
	return (
		name === 'ChunkLoadError' ||
		combined.includes('loading chunk') ||
		combined.includes('failed to fetch dynamically imported module') ||
		combined.includes('importing a module script failed')
	)
}

/** Recarga una vez si falla un chunk (deploy nuevo o caché vieja). */
export function tryAutoReloadAfterChunkError(): boolean {
	if (typeof window === 'undefined') return false
	try {
		const last = sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY)
		if (last && Date.now() - parseInt(last, 10) < 30_000) return false
		sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, String(Date.now()))
		window.location.reload()
		return true
	} catch {
		return false
	}
}

export async function clearAppCaches(): Promise<void> {
	if (typeof window === 'undefined' || !('caches' in window)) return
	try {
		const keys = await caches.keys()
		await Promise.all(keys.map((key) => caches.delete(key)))
	} catch {
		/* noop */
	}
}

/** Solo al pulsar "Actualizar": limpia caché y recarga una vez. */
export async function applyAppUpdate(): Promise<void> {
	clearOptionalUpdateDialogSnooze()
	await clearAppCaches()
	if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
		try {
			const reg = await navigator.serviceWorker.getRegistration()
			reg?.waiting?.postMessage({ type: 'SKIP_WAITING' })
		} catch {
			/* noop */
		}
	}
	window.location.reload()
}
