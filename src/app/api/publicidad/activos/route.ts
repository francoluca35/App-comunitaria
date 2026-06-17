import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HTTP_CACHE_PUBLIC_SHORT } from '@/lib/server/http-cache'
import { buildInstagramUrl, buildWhatsAppUrl } from '@/lib/server/publicidad'
import { cleanupExpiredPublicidades } from '@/lib/server/publicidad-expiration'
import { maybeCleanupExpiredPublicidades } from '@/lib/server/publicidad-cleanup-throttle'
import { ensureStorageObjectPublicUrl } from '@/lib/storage-image'

type ActivosRow = {
	id: string
	title: string
	description?: string | null
	category: string | null
	images: unknown
	phone_number: string | null
	instagram: string | null
	created_at: string
}

function mapActivosRow(r: ActivosRow, includeDescription: boolean) {
	const imgs = Array.isArray(r.images)
		? (r.images.filter((x): x is string => typeof x === 'string') as string[]).map((url) =>
				ensureStorageObjectPublicUrl(url)
			)
		: []
	const imageUrl = imgs.length ? imgs[0] : null

	const whatsappUrl = r.phone_number ? buildWhatsAppUrl(String(r.phone_number)) : null
	const instagramUrl = r.instagram ? buildInstagramUrl(String(r.instagram)) : null

	const base = {
		id: r.id,
		title: r.title,
		category: r.category,
		createdAt: r.created_at,
		imageUrl: imageUrl ?? undefined,
		whatsappUrl: whatsappUrl ?? undefined,
		instagramUrl: instagramUrl ?? undefined,
	}

	if (!includeDescription) return base

	return {
		...base,
		description: r.description,
	}
}

/**
 * GET /api/publicidad/activos — todas las publicidades activas (vigentes)
 * GET /api/publicidad/activos?lateral=1 — solo las marcadas para barra lateral (promote_lateral)
 */
export async function GET(request: NextRequest) {
	try {
		await maybeCleanupExpiredPublicidades(cleanupExpiredPublicidades)

		const lateralOnly =
			request.nextUrl.searchParams.get('lateral') === '1' ||
			request.nextUrl.searchParams.get('lateral') === 'true'

		const supabase = createClient()
		const nowIso = new Date().toISOString()

		const { data, error } = lateralOnly
			? await supabase
					.from('publicidad_requests')
					.select('id,title,category,images,phone_number,instagram,created_at')
					.eq('status', 'active')
					.eq('promote_lateral', true)
					.gt('end_at', nowIso)
					.order('created_at', { ascending: false })
					.limit(12)
			: await supabase
					.from('publicidad_requests')
					.select(
						'id,title,description,category,images,phone_number,instagram,created_at'
					)
					.eq('status', 'active')
					.gt('end_at', nowIso)
					.order('created_at', { ascending: false })
					.limit(50)

		if (error) {
			console.error('GET /api/publicidad/activos error:', error)
			return NextResponse.json([], { headers: HTTP_CACHE_PUBLIC_SHORT })
		}

		const mapped = ((data ?? []) as ActivosRow[]).map((r) =>
			mapActivosRow(r, !lateralOnly)
		)

		return NextResponse.json(mapped, { headers: HTTP_CACHE_PUBLIC_SHORT })
	} catch (e) {
		console.error('GET /api/publicidad/activos exception:', e)
		return NextResponse.json([], { headers: HTTP_CACHE_PUBLIC_SHORT })
	}
}
