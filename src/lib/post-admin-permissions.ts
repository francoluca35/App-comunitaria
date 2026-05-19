/** Admin o super admin: pueden borrar publicaciones ajenas de forma permanente. */
export function canPermanentlyDeletePosts(
	user: { isAdmin?: boolean; isAdminMaster?: boolean } | null | undefined
): boolean {
	return Boolean(user?.isAdmin || user?.isAdminMaster)
}

/** Quien ve todas las publicaciones en el feed (moderación / panel). */
export function canViewAllPostsForModeration(
	user: { isAdmin?: boolean; isAdminMaster?: boolean; isModerator?: boolean } | null | undefined
): boolean {
	return Boolean(user?.isAdmin || user?.isAdminMaster || user?.isModerator)
}
