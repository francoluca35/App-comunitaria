/** Canal Realtime compartido: todos los usuarios logueados reportan presencia acá. */
export const ONLINE_PRESENCE_CHANNEL = 'app-online-users'

type Listener = (count: number) => void

let onlineCount = 0
const listeners = new Set<Listener>()

export function getOnlinePresenceCount(): number {
	return onlineCount
}

export function setOnlinePresenceCount(count: number): void {
	const next = Math.max(0, Math.floor(count))
	if (next === onlineCount) return
	onlineCount = next
	for (const listener of listeners) listener(onlineCount)
}

export function subscribeOnlinePresenceCount(listener: Listener): () => void {
	listeners.add(listener)
	listener(onlineCount)
	return () => {
		listeners.delete(listener)
	}
}

/** Cuenta claves únicas de presence (un user_id = una persona, aunque tenga varias pestañas). */
export function countUniquePresenceKeys(
	state: Record<string, unknown[] | undefined>
): number {
	return Object.keys(state).filter((key) => {
		const metas = state[key]
		return Array.isArray(metas) && metas.length > 0
	}).length
}
