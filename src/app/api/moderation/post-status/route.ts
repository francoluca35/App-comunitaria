import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/admin-auth'
import { removeStorageObjectsByUrls } from '@/lib/server/storage-cleanup'
import { POST_MEDIA_BUCKET } from '@/lib/server/delete-post-with-storage'

type PostStatus = 'pending' | 'approved' | 'rejected'

function isPostStatus(value: unknown): value is PostStatus {
	return value === 'pending' || value === 'approved' || value === 'rejected'
}

function normalizeRejectedImageIndexes(value: unknown): number[] {
	if (!Array.isArray(value)) return []
	return [...new Set(value)]
		.filter((index): index is number => Number.isInteger(index) && index >= 0)
		.sort((a, b) => a - b)
}

export async function PATCH(request: NextRequest) {
	const auth = await requireStaff(request)
	if (!auth.ok) return auth.response

	let body: { postId?: unknown; status?: unknown; rejectedImages?: unknown }
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
	}

	const postId = typeof body.postId === 'string' ? body.postId.trim() : ''
	const status = body.status
	const rejectedImages = normalizeRejectedImageIndexes(body.rejectedImages)

	if (!postId) return NextResponse.json({ error: 'Falta postId' }, { status: 400 })
	if (!isPostStatus(status)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
	if (status === 'pending') return NextResponse.json({ error: 'No se puede volver una publicación a pendiente' }, { status: 400 })

	const db = auth.serviceClient ?? auth.supabase

	const { error } = await db
		.from('posts')
		.update({ status, updated_at: new Date().toISOString() })
		.eq('id', postId)

	if (error) return NextResponse.json({ error: error.message }, { status: 500 })

	if (status === 'approved' && rejectedImages.length > 0) {
		const { data: mediaRows, error: mediaReadError } = await db
			.from('post_media')
			.select('id, position, url')
			.eq('post_id', postId)
			.order('position', { ascending: true })

		if (mediaReadError) {
			return NextResponse.json({ error: mediaReadError.message }, { status: 500 })
		}

		const idsToDelete = (mediaRows ?? [])
			.filter((_, index) => rejectedImages.includes(index))
			.map((row) => row.id)
		const urlsToDelete = (mediaRows ?? [])
			.filter((_, index) => rejectedImages.includes(index))
			.map((row) => row.url)
			.filter((url): url is string => typeof url === 'string')

		if (idsToDelete.length > 0) {
			const { error: mediaDeleteError } = await db.from('post_media').delete().in('id', idsToDelete)
			if (mediaDeleteError) {
				return NextResponse.json({ error: mediaDeleteError.message }, { status: 500 })
			}

			if (urlsToDelete.length > 0 && auth.serviceClient) {
				await removeStorageObjectsByUrls(auth.serviceClient, POST_MEDIA_BUCKET, urlsToDelete)
			}
		}
	}

	return NextResponse.json({ ok: true })
}
