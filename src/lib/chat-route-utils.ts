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
