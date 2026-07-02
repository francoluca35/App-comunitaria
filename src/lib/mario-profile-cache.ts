const CACHE_KEY = 'mario_profile_id_v1'
const TTL_MS = 24 * 60 * 60 * 1000

let memoryId: { at: number; id: string } | null = null

function readSession(): string | null {
	if (typeof sessionStorage === 'undefined') return null
	try {
		const raw = sessionStorage.getItem(CACHE_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw) as { at?: number; id?: string }
		if (!parsed.at || !parsed.id || Date.now() - parsed.at > TTL_MS) {
			sessionStorage.removeItem(CACHE_KEY)
			return null
		}
		return parsed.id
	} catch {
		return null
	}
}

function writeSession(id: string) {
	if (typeof sessionStorage === 'undefined') return
	try {
		sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), id }))
	} catch {
		// ignore
	}
}

export function getCachedMarioProfileId(): string | null {
	if (memoryId && Date.now() - memoryId.at < TTL_MS) return memoryId.id
	const fromSession = readSession()
	if (fromSession) {
		memoryId = { at: Date.now(), id: fromSession }
		return fromSession
	}
	return null
}

export function setCachedMarioProfileId(id: string) {
	memoryId = { at: Date.now(), id }
	writeSession(id)
}
