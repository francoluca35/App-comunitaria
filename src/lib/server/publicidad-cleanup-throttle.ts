/** Evita ejecutar cleanup de publicidades vencidas en cada request. */
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000

let lastCleanupAt = 0
let cleanupInFlight: Promise<void> | null = null

export async function maybeCleanupExpiredPublicidades(
	run: () => Promise<{ ok: boolean; error?: string; deletedCount: number }>
): Promise<void> {
	const now = Date.now()
	if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return
	if (cleanupInFlight) {
		await cleanupInFlight
		return
	}

	cleanupInFlight = (async () => {
		try {
			const result = await run()
			if (!result.ok && result.error) {
				console.warn('cleanupExpiredPublicidades:', result.error)
			} else if (result.deletedCount > 0) {
				console.info(`cleanupExpiredPublicidades: ${result.deletedCount} vencida(s) eliminada(s)`)
			}
			lastCleanupAt = Date.now()
		} finally {
			cleanupInFlight = null
		}
	})()

	await cleanupInFlight
}
