export type LateralPublicidadRow = Record<string, unknown>

const CACHE_KEY = 'lateral_publicidad_ads_v1'
const TTL_MS = 5 * 60 * 1000

let memoryCache: { at: number; rows: LateralPublicidadRow[] } | null = null
let inflight: Promise<LateralPublicidadRow[]> | null = null

function readSession(): LateralPublicidadRow[] | null {
	if (typeof sessionStorage === 'undefined') return null
	try {
		const raw = sessionStorage.getItem(CACHE_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw) as { at?: number; rows?: LateralPublicidadRow[] }
		if (!parsed.at || !Array.isArray(parsed.rows) || Date.now() - parsed.at > TTL_MS) {
			sessionStorage.removeItem(CACHE_KEY)
			return null
		}
		return parsed.rows
	} catch {
		return null
	}
}

function writeSession(rows: LateralPublicidadRow[]) {
	if (typeof sessionStorage === 'undefined') return
	try {
		sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rows }))
	} catch {
		// quota exceeded — ignorar
	}
}

/** Una sola petición compartida por sesión para barra lateral / carrusel. */
export async function fetchLateralPublicidadAds(): Promise<LateralPublicidadRow[]> {
	if (memoryCache && Date.now() - memoryCache.at < TTL_MS) {
		return memoryCache.rows
	}

	const fromSession = readSession()
	if (fromSession) {
		memoryCache = { at: Date.now(), rows: fromSession }
		return fromSession
	}

	if (inflight) return inflight

	inflight = fetch('/api/publicidad/activos?lateral=1')
		.then(async (res) => {
			if (!res.ok) return []
			const data = (await res.json().catch(() => [])) as unknown
			return Array.isArray(data) ? (data as LateralPublicidadRow[]) : []
		})
		.then((rows) => {
			memoryCache = { at: Date.now(), rows }
			writeSession(rows)
			return rows
		})
		.catch(() => [] as LateralPublicidadRow[])
		.finally(() => {
			inflight = null
		})

	return inflight
}

export function invalidateLateralPublicidadCache() {
	memoryCache = null
	if (typeof sessionStorage !== 'undefined') {
		try {
			sessionStorage.removeItem(CACHE_KEY)
		} catch {
			// ignore
		}
	}
}

export function mapLateralPublicidadRows(rows: LateralPublicidadRow[]) {
	return rows.map((r) => ({
		id: String(r.id ?? ''),
		title: String(r.title ?? ''),
		description: typeof r.description === 'string' ? r.description : '',
		category: String(r.category ?? ''),
		createdAt: new Date(
			typeof r.createdAt === 'string' || typeof r.createdAt === 'number' ? r.createdAt : Date.now()
		),
		imageUrl: typeof r.imageUrl === 'string' ? r.imageUrl : undefined,
		images: Array.isArray(r.images)
			? (r.images as unknown[]).filter((x): x is string => typeof x === 'string')
			: undefined,
		whatsappUrl: typeof r.whatsappUrl === 'string' ? r.whatsappUrl : undefined,
		instagramUrl: typeof r.instagramUrl === 'string' ? r.instagramUrl : undefined,
	}))
}
