const CHAT_PEER_UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Rutas de pantalla completa de chat (móvil): ocultar FAB y mostrar acceso en header.
 */
export function isFullscreenMobileChatPath(pathname: string | null): boolean {
	if (!pathname) return false
	if (pathname === '/chat' || pathname.startsWith('/chat/')) return true
	if (pathname.startsWith('/message')) return true
	if (pathname.startsWith('/admin/messages/chat')) return true
	return false
}

/**
 * Conversación activa en móvil: ocultar header del dashboard (menú, buscador, etc.).
 */
export function isMobileImmersiveChatThreadPath(pathname: string | null): boolean {
	if (!pathname) return false
	if (pathname === '/chat') return true
	if (pathname === '/message/mario') return true
	const peerMatch = pathname.match(/^\/message\/([^/]+)$/)
	if (peerMatch && CHAT_PEER_UUID_RE.test(peerMatch[1])) return true
	if (/^\/admin\/messages\/chat\/[^/]+$/.test(pathname)) return true
	return false
}
