import type { PublicidadDisplay } from '@/lib/publicidad-display'

export type FeedPublicidadRow = Record<string, unknown>

const CACHE_KEY = 'feed_publicidad_ads_v1'
const TTL_MS = 5 * 60 * 1000

let memoryCache: { at: number; rows: PublicidadDisplay[] } | null = null
let inflight: Promise<PublicidadDisplay[]> | null = null

function parseCreatedAt(raw: unknown): Date {
	if (raw == null) return new Date(0)
	const d = new Date(typeof raw === 'string' || typeof raw === 'number' ? raw : '')
	return Number.isFinite(d.getTime()) ? d : new Date(0)
}

export function mapPublicidadApiRows(rows: FeedPublicidadRow[]): PublicidadDisplay[] {
	return rows.map((r) => ({
		id: String(r.id ?? ''),
		title: String(r.title ?? ''),
		description: String(r.description ?? ''),
		category: String(r.category ?? ''),
		createdAt: parseCreatedAt(r.createdAt),
		imageUrl: typeof r.imageUrl === 'string' ? r.imageUrl : undefined,
		images: Array.isArray(r.images)
			? (r.images as unknown[]).filter((x): x is string => typeof x === 'string')
			: undefined,
		whatsappUrl: typeof r.whatsappUrl === 'string' ? r.whatsappUrl : undefined,
		instagramUrl: typeof r.instagramUrl === 'string' ? r.instagramUrl : undefined,
	}))
}

function readSession(): PublicidadDisplay[] | null {
	if (typeof sessionStorage === 'undefined') return null
	try {
		const raw = sessionStorage.getItem(CACHE_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw) as { at?: number; rows?: PublicidadDisplay[] }
		if (!parsed.at || !Array.isArray(parsed.rows) || Date.now() - parsed.at > TTL_MS) {
			sessionStorage.removeItem(CACHE_KEY)
			return null
		}
		return parsed.rows.map((r) => ({
			...r,
			createdAt: new Date(r.createdAt),
		}))
	} catch {
		return null
	}
}

function writeSession(rows: PublicidadDisplay[]) {
	if (typeof sessionStorage === 'undefined') return
	try {
		sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rows }))
	} catch {
		// quota exceeded
	}
}

/** Una sola petición compartida por sesión para el feed / cartelera. */
export async function fetchFeedPublicidadAds(): Promise<PublicidadDisplay[]> {
	if (memoryCache && Date.now() - memoryCache.at < TTL_MS) {
		return memoryCache.rows
	}

	const fromSession = readSession()
	if (fromSession) {
		memoryCache = { at: Date.now(), rows: fromSession }
		return fromSession
	}

	if (inflight) return inflight

	inflight = fetch('/api/publicidad/activos')
		.then(async (res) => {
			if (!res.ok) return []
			const data = (await res.json().catch(() => [])) as unknown
			return Array.isArray(data) ? mapPublicidadApiRows(data as FeedPublicidadRow[]) : []
		})
		.then((rows) => {
			memoryCache = { at: Date.now(), rows }
			writeSession(rows)
			return rows
		})
		.catch(() => [] as PublicidadDisplay[])
		.finally(() => {
			inflight = null
		})

	return inflight
}

export function invalidateFeedPublicidadCache() {
	memoryCache = null
	if (typeof sessionStorage !== 'undefined') {
		try {
			sessionStorage.removeItem(CACHE_KEY)
		} catch {
			// ignore
		}
	}
}
