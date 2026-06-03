import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/admin-auth'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { deletePostByIdWithStorage } from '@/lib/server/delete-post-with-storage'
import { canPermanentlyDeletePosts } from '@/lib/post-admin-permissions'

export type PostPatchBody = {
	title?: string
	description?: string
	whatsappNumber?: string | null
	saleSubcategory?: string | null
	salePrice?: string | null
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ postId: string }> }
) {
	const token = getAccessToken(request)
	if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

	const { postId } = await params
	if (!postId) return NextResponse.json({ error: 'Falta postId' }, { status: 400 })

	let body: PostPatchBody
	try {
		body = (await request.json()) as PostPatchBody
	} catch {
		return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
	}

	const title = typeof body.title === 'string' ? body.title.trim() : undefined
	const description = typeof body.description === 'string' ? body.description.trim() : undefined
	if (title !== undefined && title.length < 1) {
		return NextResponse.json({ error: 'El título no puede estar vacío' }, { status: 400 })
	}
	if (description !== undefined && description.length < 1) {
		return NextResponse.json({ error: 'La descripción no puede estar vacía' }, { status: 400 })
	}

	const supabase = createClient(token)
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser(token)
	if (userError || !user?.id) {
		return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
	}

	const db = createServiceRoleClient() ?? supabase
	const { data: post, error: postError } = await db
		.from('posts')
		.select('id, author_id, status, category')
		.eq('id', postId)
		.maybeSingle()

	if (postError) return NextResponse.json({ error: postError.message }, { status: 500 })
	if (!post) return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 })
	if (post.author_id !== user.id) {
		return NextResponse.json({ error: 'Solo podés editar tus propias publicaciones' }, { status: 403 })
	}

	const patch: Record<string, string | null> = {}
	if (title !== undefined) patch.title = title
	if (description !== undefined) patch.description = description
	if (body.whatsappNumber !== undefined) {
		const wa =
			typeof body.whatsappNumber === 'string' && body.whatsappNumber.trim()
				? body.whatsappNumber.trim()
				: null
		patch.whatsapp_number = wa
	}
	if (post.category === 'venta') {
		if (body.saleSubcategory !== undefined) {
			const sub =
				typeof body.saleSubcategory === 'string' && body.saleSubcategory.trim()
					? body.saleSubcategory.trim()
					: null
			if (sub && sub.length < 2) {
				return NextResponse.json({ error: 'La subcategoría debe tener al menos 2 letras' }, { status: 400 })
			}
			patch.sale_subcategory = sub
		}
		if (body.salePrice !== undefined) {
			patch.sale_price =
				typeof body.salePrice === 'string' && body.salePrice.trim() ? body.salePrice.trim() : null
		}
	}

	if (Object.keys(patch).length === 0) {
		return NextResponse.json({ error: 'No hay cambios para guardar' }, { status: 400 })
	}

	const { data: updated, error: updateError } = await db
		.from('posts')
		.update(patch)
		.eq('id', postId)
		.select('id, title, description, whatsapp_number, sale_subcategory, sale_price, status, updated_at')
		.single()

	if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

	return NextResponse.json({
		ok: true,
		post: {
			id: updated.id,
			title: updated.title,
			description: updated.description,
			whatsappNumber: updated.whatsapp_number ?? undefined,
			saleSubcategory: updated.sale_subcategory ?? undefined,
			salePrice: updated.sale_price ?? undefined,
			status: updated.status,
		},
	})
}

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
