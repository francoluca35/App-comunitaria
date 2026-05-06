import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccessToken } from '@/lib/admin-auth'
import { isMarioAccountEmail } from '@/lib/mario-account'

/**
 * GET: perfil del interlocutor para /message/[peerId] (vecino ↔ miembro del equipo).
 * Solo expone perfiles del equipo (admin/moderator o cuenta Mario por email).
 */
export async function GET(request: NextRequest, context: { params: Promise<{ peerId: string }> }) {
	const token = getAccessToken(request)
	if (!token) {
		return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
	}

	const { peerId } = await context.params
	if (!peerId || !/^[0-9a-f-]{36}$/i.test(peerId)) {
		return NextResponse.json({ error: 'Usuario inválido' }, { status: 400 })
	}

	const supabase = createClient(token)

	const { data: peer, error } = await supabase
		.from('profiles')
		.select('id, name, avatar_url, role, email')
		.eq('id', peerId)
		.maybeSingle()

	if (error || !peer) {
		return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
	}

	const email = (peer.email ?? '').trim().toLowerCase()
	const isMarioAccount = isMarioAccountEmail(email)
	const isTeam = peer.role === 'admin' || peer.role === 'moderator' || isMarioAccount

	if (!isTeam) {
		return NextResponse.json({ error: 'Solo podés chatear con el equipo de la comunidad' }, { status: 403 })
	}

	return NextResponse.json({
		id: peer.id,
		name: peer.name,
		avatar_url: peer.avatar_url,
	})
}
