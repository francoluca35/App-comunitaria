/** Tipos que no se muestran en la campana (ruido poco útil para el usuario). */
export const NOTIFICATION_TYPES_HIDDEN_IN_BELL = new Set([
	'post_deleted',
	'post_pending',
])

export function shouldShowNotificationInBell(type: string): boolean {
	return !NOTIFICATION_TYPES_HIDDEN_IN_BELL.has(type)
}
