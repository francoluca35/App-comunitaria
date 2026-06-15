/** Mensaje amigable si Postgres rechazó por rate limit (triggers SQL). */
export function formatCommunityRateLimitError(message: string | undefined | null): string | null {
	if (!message) return null
	if (message.includes('rate_limit:posts')) {
		return 'Publicaste demasiado rápido. Esperá un minuto e intentá de nuevo.'
	}
	if (message.includes('rate_limit:comments')) {
		return 'Comentaste demasiado rápido. Esperá un minuto e intentá de nuevo.'
	}
	if (message.includes('rate_limit:reactions')) {
		return 'Demasiadas reacciones seguidas. Esperá un momento e intentá de nuevo.'
	}
	return null
}
