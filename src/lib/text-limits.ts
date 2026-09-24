/** Límite unificado para textos escritos por el usuario (descripciones, comentarios, etc.). */
export const USER_TEXT_MAX_LENGTH = 500

export function userTextTooLongMessage(max = USER_TEXT_MAX_LENGTH): string {
	return `El texto no puede superar ${max} caracteres`
}

export function isUserTextTooLong(text: string, max = USER_TEXT_MAX_LENGTH): boolean {
	return text.trim().length > max
}

export function getPostTextLimitForCategory(category?: string): number {
	return category === 'noticias' ? USER_TEXT_MAX_LENGTH : USER_TEXT_MAX_LENGTH
}

export function newsTextTooLongMessage(): string {
	return `La noticia no puede superar ${USER_TEXT_MAX_LENGTH} caracteres`
}

export function isNewsTextTooLong(text: string): boolean {
	return isUserTextTooLong(text, USER_TEXT_MAX_LENGTH)
}
