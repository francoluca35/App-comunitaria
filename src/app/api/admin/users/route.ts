import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { ADMIN_USERS_PAGE_SIZE } from '@/lib/admin-users-api'

/** Columnas base que siempre existen en profiles. Las extra (birth_date, phone, etc.) se agregan si existen. */
const BASE_SELECT = 'id, email, name, avatar_url, role, status, created_at, updated_at'
const EXTENDED_SELECT = `${BASE_SELECT}, birth_date, phone, province, locality, suspended_until`
const MAX_PAGE_SIZE = ADMIN_USERS_PAGE_SIZE
const MAX_IDS = 100

type ListParams = {
	page: number
	pageSize: number
	search: string
	role: string
	status: string
	order: 'newest' | 'oldest'
	ids: string[]
}

function escapeIlike(value: string): string {
	return value.replace(/[%_\\]/g, (char) => `\\${char}`)
}

function parseListParams(request: NextRequest): ListParams {
	const sp = request.nextUrl.searchParams
	const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1)
	const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(sp.get('pageSize') ?? String(ADMIN_USERS_PAGE_SIZE), 10) || ADMIN_USERS_PAGE_SIZE))
	const ids = (sp.get('ids') ?? '')
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean)
		.slice(0, MAX_IDS)

	return {
		page,
		pageSize,
		search: (sp.get('search') ?? '').trim(),
		role: sp.get('role') ?? 'all',
		status: sp.get('status') ?? 'all',
		order: sp.get('order') === 'oldest' ? 'oldest' : 'newest',
		ids,
	}
}

async function listProfiles(supabase: SupabaseClient, select: string, params: ListParams) {
	let query = supabase.from('profiles').select(select, { count: 'exact' })

	if (params.ids.length > 0) {
		query = query.in('id', params.ids)
	} else {
		if (params.role !== 'all') {
			query = query.eq('role', params.role)
		}

		if (params.status === 'blocked') {
			query = query.eq('status', 'blocked')
		} else if (params.status === 'active') {
			query = query.eq('status', 'active')
		} else if (params.status === 'suspended') {
			query = query.gt('suspended_until', new Date().toISOString())
		}

		if (params.search) {
			const safe = escapeIlike(params.search)
			const digits = params.search.replace(/\D/g, '')
			if (digits.length >= 2) {
				query = query.or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${digits}%`)
			} else {
				query = query.or(`name.ilike.%${safe}%,email.ilike.%${safe}%`)
			}
		}
	}

	query = query.order('created_at', { ascending: params.order === 'oldest' })

	if (params.ids.length === 0) {
		const from = (params.page - 1) * params.pageSize
		const to = from + params.pageSize - 1
		query = query.range(from, to)
	}

	const { data, error, count } = await query
	if (error) return { data: null, error, total: 0 }

	const total = count ?? data?.length ?? 0
	const totalPages = params.ids.length > 0 ? 1 : Math.max(1, Math.ceil(total / params.pageSize))

	return { data: data ?? [], error: null, total, totalPages }
}

/** GET: perfiles paginados (solo admin). Query: page, pageSize, search, role, status, order, ids. */
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAdmin(request)
		if (!auth.ok) return auth.response
		const { supabase } = auth
		const params = parseListParams(request)

		const extended = await listProfiles(supabase, EXTENDED_SELECT, params)
		if (!extended.error) {
			return NextResponse.json({
				users: extended.data ?? [],
				total: extended.total,
				page: params.ids.length > 0 ? 1 : params.page,
				pageSize: params.ids.length > 0 ? extended.data?.length ?? 0 : params.pageSize,
				totalPages: extended.totalPages,
			})
		}

		const fallback = await listProfiles(supabase, BASE_SELECT, params)
		if (fallback.error) {
			console.error('GET /api/admin/users:', fallback.error.message)
			return NextResponse.json({ error: fallback.error.message }, { status: 500 })
		}

		return NextResponse.json({
			users: fallback.data ?? [],
			total: fallback.total,
			page: params.ids.length > 0 ? 1 : params.page,
			pageSize: params.ids.length > 0 ? fallback.data?.length ?? 0 : params.pageSize,
			totalPages: fallback.totalPages,
		})
	} catch (e) {
		console.error('GET /api/admin/users:', e)
		return NextResponse.json(
			{ error: e instanceof Error ? e.message : 'Error del servidor' },
			{ status: 500 }
		)
	}
}
