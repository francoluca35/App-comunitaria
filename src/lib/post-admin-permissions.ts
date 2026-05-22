/** Admin o super admin: pueden borrar publicaciones ajenas de forma permanente. */
export function canPermanentlyDeletePosts(
	user: { isAdmin?: boolean; isAdminMaster?: boolean } | null | undefined
): boolean {
	return Boolean(user?.isAdmin || user?.isAdminMaster)
}

/** Solo admin / super admin pueden publicar en la categoría «alertas». */
export function canCreateAlerts(
	user: { isAdmin?: boolean; isAdminMaster?: boolean } | null | undefined
): boolean {
	return canPermanentlyDeletePosts(user)
}

/** Quien ve todas las publicaciones en el feed (moderación / panel). */
export function canViewAllPostsForModeration(
	user: { isAdmin?: boolean; isAdminMaster?: boolean; isModerator?: boolean } | null | undefined
): boolean {
	return Boolean(user?.isAdmin || user?.isAdminMaster || user?.isModerator)
}
