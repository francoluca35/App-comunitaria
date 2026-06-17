import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

const SINGLE_STATUSES = new Set(['pending', 'payment_pending', 'active', 'rejected'])
const PENDING_ALL_STATUSES = ['pending', 'payment_pending', 'rejected'] as const

function mapRows(data: unknown[]) {
	return data.map((row) => {
		const r = row as Record<string, unknown>
		return {
			...r,
			images: Array.isArray(r.images) ? r.images.slice(0, 1) : [],
		}
	})
}

export async function GET(request: NextRequest) {
	const auth = await requireAdmin(request)
	if (!auth.ok) return auth.response

	const status = request.nextUrl.searchParams.get('status') || 'pending'

	if (status === 'pending_all') {
		const { data, error } = await auth.supabase
			.from('publicidad_requests')
			.select(
				'id,title,description,phone_number,instagram,images,days_active,status,price_amount,created_at,profiles(name,avatar_url)'
			)
			.in('status', [...PENDING_ALL_STATUSES])
			.order('created_at', { ascending: false })
			.limit(150)

		if (error) return NextResponse.json({ error: error.message }, { status: 500 })
		return NextResponse.json(mapRows(data ?? []))
	}

	if (!SINGLE_STATUSES.has(status)) {
		return NextResponse.json({ error: 'status inválido' }, { status: 400 })
	}

	const { data, error } = await auth.supabase
		.from('publicidad_requests')
		.select(
			'id,title,description,phone_number,instagram,images,days_active,status,price_amount,created_at,profiles(name,avatar_url)'
		)
		.eq('status', status)
		.order('created_at', { ascending: false })
		.limit(50)

	if (error) return NextResponse.json({ error: error.message }, { status: 500 })

	return NextResponse.json(mapRows(data ?? []))
}
