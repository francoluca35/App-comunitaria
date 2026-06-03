import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/admin-auth'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { deletePostByIdWithStorage } from '@/lib/server/delete-post-with-storage'
import { canPermanentlyDeletePosts } from '@/lib/post-admin-permissions'

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
		.select('id, author_id')
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

	const deleted = await deletePostByIdWithStorage(db, postId)
	if (!deleted.ok) {
		return NextResponse.json({ error: deleted.error ?? 'No se pudo eliminar la publicación' }, { status: 500 })
	}

	return NextResponse.json({ ok: true })
}
