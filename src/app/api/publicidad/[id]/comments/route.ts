import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ParamsCtx = { params: Promise<{ id: string }> }

/** GET /api/publicidad/[id]/comments - comentarios de una publicidad activa. */
export async function GET(_request: NextRequest, context: ParamsCtx) {
	const { id } = await context.params
	const publicidadId = id?.trim()
	if (!publicidadId) {
		return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
	}

	const supabase = createClient()
	const { data, error } = await supabase
		.from('publicidad_comments')
		.select('id, publicidad_id, author_id, text, created_at, profiles!publicidad_comments_author_id_fkey(name, avatar_url)')
		.eq('publicidad_id', publicidadId)
		.order('created_at', { ascending: true })

	if (error) {
		return NextResponse.json({ error: error.message ?? 'No se pudieron cargar los comentarios' }, { status: 500 })
	}

	const mapped = (data ?? []).map((row: any) => {
		const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
		return {
			id: String(row.id),
			publicidadId: String(row.publicidad_id),
			authorId: String(row.author_id),
			authorName: typeof profile?.name === 'string' && profile.name.trim() ? profile.name.trim() : 'Usuario',
			authorAvatar: typeof profile?.avatar_url === 'string' ? profile.avatar_url : undefined,
			text: String(row.text ?? ''),
			createdAt: row.created_at,
		}
	})

	return NextResponse.json(mapped)
}

/** POST /api/publicidad/[id]/comments - crear comentario en publicidad activa. */
export async function POST(request: NextRequest, context: ParamsCtx) {
	const { id } = await context.params
	const publicidadId = id?.trim()
	if (!publicidadId) {
		return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
	}

	const authHeader = request.headers.get('authorization')
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
	if (!token) {
		return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
	}

	let body: { text?: string }
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
	}

	const text = (body.text ?? '').trim()
	if (!text) {
		return NextResponse.json({ error: 'Escribí un comentario' }, { status: 400 })
	}

	const supabase = createClient(token)
	const {
		data: { user },
	} = await supabase.auth.getUser(token)
	if (!user?.id) {
		return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
	}

	const { data, error } = await supabase
		.from('publicidad_comments')
		.insert({
			publicidad_id: publicidadId,
			author_id: user.id,
			text,
		})
		.select('id, publicidad_id, author_id, text, created_at, profiles!publicidad_comments_author_id_fkey(name, avatar_url)')
		.single()

	if (error) {
		return NextResponse.json({ error: error.message ?? 'No se pudo publicar el comentario' }, { status: 400 })
	}

	const profile = Array.isArray((data as any).profiles) ? (data as any).profiles[0] : (data as any).profiles
	return NextResponse.json({
		id: String((data as any).id),
		publicidadId: String((data as any).publicidad_id),
		authorId: String((data as any).author_id),
		authorName: typeof profile?.name === 'string' && profile.name.trim() ? profile.name.trim() : 'Usuario',
		authorAvatar: typeof profile?.avatar_url === 'string' ? profile.avatar_url : undefined,
		text: String((data as any).text ?? ''),
		createdAt: (data as any).created_at,
	})
}
