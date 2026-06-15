import type { AdminProfile } from '@/app/providers/types'

export const ADMIN_USERS_PAGE_SIZE = 150
export const ADMIN_USERS_SEARCH_LIMIT = 20

export type AdminUsersRoleFilter = 'all' | 'viewer' | 'moderator' | 'admin' | 'admin_master'
export type AdminUsersStatusFilter = 'all' | 'active' | 'blocked' | 'suspended'
export type AdminUsersOrder = 'newest' | 'oldest'

export type AdminUsersListQuery = {
	page: number
	pageSize: number
	search: string
	role: AdminUsersRoleFilter
	status: AdminUsersStatusFilter
	order: AdminUsersOrder
	ids?: string
}

export type AdminUsersListResponse = {
	users: AdminProfile[]
	total: number
	page: number
	pageSize: number
	totalPages: number
}

export function buildAdminUsersUrl(query: Partial<AdminUsersListQuery>): string {
	const params = new URLSearchParams()
	if (query.page != null) params.set('page', String(query.page))
	if (query.pageSize != null) params.set('pageSize', String(query.pageSize))
	if (query.search?.trim()) params.set('search', query.search.trim())
	if (query.role && query.role !== 'all') params.set('role', query.role)
	if (query.status && query.status !== 'all') params.set('status', query.status)
	if (query.order) params.set('order', query.order)
	if (query.ids?.trim()) params.set('ids', query.ids.trim())
	const qs = params.toString()
	return qs ? `/api/admin/users?${qs}` : '/api/admin/users'
}

export async function fetchAdminUsersList(
	accessToken: string,
	query: Partial<AdminUsersListQuery>
): Promise<AdminUsersListResponse | { error: string }> {
	const res = await fetch(buildAdminUsersUrl(query), {
		headers: { Authorization: `Bearer ${accessToken}` },
	})
	if (!res.ok) {
		const j = (await res.json().catch(() => ({}))) as { error?: string }
		return { error: j.error ?? res.statusText }
	}
	return (await res.json()) as AdminUsersListResponse
}
