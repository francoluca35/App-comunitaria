import type { AdminProfile } from '@/app/providers/types'

export function canUseAdminContactSearch(user: {
	isAdmin?: boolean
	isAdminMaster?: boolean
} | null): boolean {
	return !!(user?.isAdmin || user?.isAdminMaster)
}

export function normalizeContactSearchText(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/\s+/g, ' ')
		.trim()
}

export function matchAdminContact(profile: AdminProfile, query: string): boolean {
	if (!query.trim()) return false
	const q = normalizeContactSearchText(query)
	const name = normalizeContactSearchText(profile.name ?? '')
	const email = normalizeContactSearchText(profile.email ?? '')
	const phone = (profile.phone ?? '').replace(/\D/g, '')
	const queryDigits = query.replace(/\D/g, '')
	return (
		name.includes(q) ||
		email.includes(q) ||
		(queryDigits.length >= 2 && phone.includes(queryDigits))
	)
}

export function filterAdminContacts(
	profiles: AdminProfile[],
	query: string,
	excludeUserId?: string
): AdminProfile[] {
	const q = query.trim()
	if (!q) return []
	return profiles.filter(
		(p) => p.id !== excludeUserId && matchAdminContact(p, query)
	)
}

export function adminContactChatPath(userId: string): string {
	return `/admin/messages/chat/${userId}`
}
