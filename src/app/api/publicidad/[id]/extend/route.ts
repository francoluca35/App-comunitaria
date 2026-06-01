import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/admin-auth'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { fetchCanonicalMarioProfile } from '@/lib/mario-account'

function daysRemaining(endAtIso: string | null): number {
	if (!endAtIso) return 0
	const endAt = new Date(endAtIso)
	const diffMs = endAt.getTime() - Date.now()
	if (!Number.isFinite(diffMs) || diffMs <= 0) return 0
	return Math.ceil(diffMs / (24 * 60 * 60 * 1000))
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const token = getAccessToken(request)
	if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

	const supabase = createClient(token)
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser(token)
	if (userError || !user?.id) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

	const serviceClient = createServiceRoleClient()
	if (!serviceClient) {
		return NextResponse.json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 })
	}

	const { id } = await params
	if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

	const { data: pub, error: pubError } = await serviceClient
		.from('publicidad_requests')
		.select('id, owner_id, title, status, end_at')
		.eq('id', id)
		.maybeSingle()

	if (pubError) return NextResponse.json({ error: pubError.message }, { status: 500 })
	if (!pub || pub.owner_id !== user.id) return NextResponse.json({ error: 'Publicidad no encontrada' }, { status: 404 })
	if (pub.status !== 'active') return NextResponse.json({ error: 'La publicidad no está activa' }, { status: 400 })

	const daysLeft = daysRemaining(pub.end_at)
	if (daysLeft <= 0) return NextResponse.json({ error: 'La publicidad ya venció' }, { status: 400 })
	if (daysLeft > 2) {
		return NextResponse.json({ error: 'La renovación se puede pedir cuando quedan 2 días o menos' }, { status: 400 })
	}

	const mario = await fetchCanonicalMarioProfile(serviceClient)
	if (!mario) return NextResponse.json({ error: 'No hay cuenta de Mario disponible' }, { status: 503 })

	const title = String(pub.title ?? 'Publicidad')
	const content =
		`Hola Mario, quiero seguir promocionando esta publicidad: "${title}". ` +
		`Me quedan ${daysLeft} día${daysLeft === 1 ? '' : 's'} de pauta. ` +
		`Publicidad: /cartelera/${pub.id}`

	const { error: chatError } = await serviceClient.from('chat_messages').insert({
		sender_id: user.id,
		receiver_id: mario.id,
		content,
	})
	if (chatError) return NextResponse.json({ error: chatError.message }, { status: 500 })

	await serviceClient.from('notifications').insert({
		user_id: mario.id,
		type: 'message',
		title: 'Solicitud de extensión de publicidad',
		body: content,
		link_url: `/message/${user.id}`,
		related_id: user.id,
	})

	return NextResponse.json({ ok: true })
}
