import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/admin-auth'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { publicStoragePathsFromUrls } from '@/lib/server/storage-path'
import { canPermanentlyDeletePosts } from '@/lib/post-admin-permissions'

const POST_MEDIA_BUCKET = 'publicaciones'

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ postId: string }> }
) {
	const token = getAccessToken(request)
	if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

	const { postId } = await params
	if (!postId) return NextResponse.json({ error: 'Falta postId' }, { status: 400 })

	const supabase = createClient(token)
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser(token)
	if (userError || !user?.id) {
		return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('id, role')
		.eq('id', user.id)
		.maybeSingle()

	const db = createServiceRoleClient() ?? supabase
	const { data: post, error: postError } = await db
		.from('posts')
		.select('id, author_id, post_media(url)')
		.eq('id', postId)
		.maybeSingle()

	if (postError) return NextResponse.json({ error: postError.message }, { status: 500 })
	if (!post) return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 })

	const canDelete =
		post.author_id === user.id ||
		canPermanentlyDeletePosts({
			isAdmin: profile?.role === 'admin',
			isAdminMaster: profile?.role === 'admin_master',
		})

	if (!canDelete) {
		return NextResponse.json({ error: 'No tenés permisos para eliminar esta publicación' }, { status: 403 })
	}

	const mediaRows = Array.isArray(post.post_media) ? post.post_media : []
	const storagePaths = publicStoragePathsFromUrls(
		mediaRows
			.map((item) => (typeof item?.url === 'string' ? item.url : null))
			.filter((url): url is string => Boolean(url)),
		POST_MEDIA_BUCKET
	)

	const { error: deleteError } = await db.from('posts').delete().eq('id', postId)
	if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

	if (storagePaths.length > 0) {
		const storage = createServiceRoleClient()
		if (!storage) {
			return NextResponse.json({
				ok: true,
				warning: 'Publicación eliminada, pero falta SUPABASE_SERVICE_ROLE_KEY para borrar archivos del Storage.',
			})
		}

		const { error: storageError } = await storage.storage.from(POST_MEDIA_BUCKET).remove(storagePaths)
		if (storageError) {
			return NextResponse.json({
				ok: true,
				warning: storageError.message ?? 'Publicación eliminada, pero no se pudieron borrar algunos archivos.',
			})
		}
	}

	return NextResponse.json({ ok: true })
}
