import { canPermanentlyDeletePosts } from '@/lib/post-admin-permissions'

/** Prefijo por defecto del cuerpo de descripción en publicaciones comunitarias. */
export const DEFAULT_DESCRIPTION_PREFIX = 'Hola Mario.'

const PREFIX_PATTERN = /^hola\s+mario\.?\s*/i

export type MarioPrefixOptions = {
	includePrefix?: boolean
}

/** Admin / super admin pueden omitir el prefijo al publicar. */
export function canToggleMarioPrefix(
	user: { isAdmin?: boolean; isAdminMaster?: boolean } | null | undefined
): boolean {
	return canPermanentlyDeletePosts(user)
}

/** Caracteres del prefijo más un espacio antes del texto libre al guardar. */
export function descriptionPrefixReservedLength(includePrefix = true): number {
	if (!includePrefix) return 0
	return DEFAULT_DESCRIPTION_PREFIX.length + 1
}

/** Cuántos caracteres puede escribir el usuario si el total máximo es `totalMax`. */
export function maxEditableCharsForTotal(totalMax: number, includePrefix = true): number {
	return Math.max(0, totalMax - descriptionPrefixReservedLength(includePrefix))
}

export function stripMarioPrefix(text: string): string {
	return text.replace(PREFIX_PATTERN, '').trim()
}

export function hasMarioPrefix(text: string): boolean {
	return PREFIX_PATTERN.test(text.trim())
}

/**
 * Arma la descripción final. Con prefijo: garantiza «Hola Mario.» una sola vez (acepta legado en minúsculas).
 */
export function buildPostDescription(text: string, options: MarioPrefixOptions = {}): string {
	const includePrefix = options.includePrefix !== false
	const raw = text.trim()
	if (!includePrefix) return raw

	const p = DEFAULT_DESCRIPTION_PREFIX.trim()
	if (raw.length === 0) return `${p} `

	if (hasMarioPrefix(raw)) {
		const body = stripMarioPrefix(raw)
		return body ? `${p} ${body}` : `${p} `
	}

	return `${p} ${raw}`
}

/** @deprecated Usar buildPostDescription */
export function ensureDefaultDescriptionPrefix(text: string): string {
	return buildPostDescription(text, { includePrefix: true })
}

/** True si no hay texto útil para enviar (según si el prefijo es obligatorio u opcional). */
export function isDescriptionEmptyForSubmit(editableSuffix: string, includePrefix: boolean): boolean {
	if (!includePrefix) return editableSuffix.trim().length === 0
	return isDescriptionOnlyDefaultPrefix(editableSuffix)
}

/** True si, con prefijo obligatorio, no hay texto más allá de «Hola Mario.» */
export function isDescriptionOnlyDefaultPrefix(editableSuffix: string): boolean {
	const composed = buildPostDescription(editableSuffix, { includePrefix: true }).trim()
	const p = DEFAULT_DESCRIPTION_PREFIX.trim()
	return composed.toLowerCase() === p.toLowerCase()
}
