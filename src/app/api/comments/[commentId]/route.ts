import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/admin-auth'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { POST_MEDIA_BUCKET } from '@/lib/server/delete-post-with-storage'
import { removeStorageObjectsByUrls } from '@/lib/server/storage-cleanup'
import { canPermanentlyDeletePosts } from '@/lib/post-admin-permissions'

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ commentId: string }> }
) {
	const token = getAccessToken(request)
	if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

	const { commentId } = await params
	if (!commentId) return NextResponse.json({ error: 'Falta commentId' }, { status: 400 })

	const supabase = createClient(token)
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser(token)
	if (userError || !user?.id) {
		return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
	}

	const db = createServiceRoleClient() ?? supabase
	const { data: comment, error: commentError } = await db
		.from('comments')
		.select('id, author_id, post_id, image_url, posts(author_id)')
		.eq('id', commentId)
		.maybeSingle()

	if (commentError) return NextResponse.json({ error: commentError.message }, { status: 500 })
	if (!comment) return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 })

	const postRow = comment.posts as { author_id?: string } | { author_id?: string }[] | null
	const postAuthorId = Array.isArray(postRow) ? postRow[0]?.author_id : postRow?.author_id

	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.maybeSingle()

	const canDelete =
		comment.author_id === user.id ||
		postAuthorId === user.id ||
		canPermanentlyDeletePosts({
			isAdmin: profile?.role === 'admin',
			isAdminMaster: profile?.role === 'admin_master',
		})

	if (!canDelete) {
		return NextResponse.json({ error: 'No tenés permisos para eliminar este comentario' }, { status: 403 })
	}

	const imageUrl = typeof comment.image_url === 'string' ? comment.image_url : ''
	if (imageUrl.trim()) {
		const storageClient = createServiceRoleClient() ?? db
		const removed = await removeStorageObjectsByUrls(storageClient, POST_MEDIA_BUCKET, [imageUrl])
		if (!removed.ok) {
			return NextResponse.json(
				{ error: removed.error ?? 'No se pudo borrar la imagen del comentario en Storage' },
				{ status: 500 }
			)
		}
	}

	const { error: deleteError } = await db.from('comments').delete().eq('id', commentId)
	if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

	return NextResponse.json({ ok: true })
}
