import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getAccessToken } from '@/lib/admin-auth'

/**
 * GET: perfiles con rol `admin` para que vecinos elijan con quién chatear.
 * Requiere sesión. Expone id, nombre, email, avatar y teléfono (solo para enlace WhatsApp).
 */
export async function GET(request: NextRequest) {
	const token = getAccessToken(request)
	if (!token) {
		return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
	}

	const supabase = createClient(token)
	const {
		data: { user },
	} = await supabase.auth.getUser(token)
	if (!user?.id) {
		return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
	}

	const service = createServiceRoleClient()
	const client = service ?? supabase

	const { data, error } = await client
		.from('profiles')
		.select('id, name, email, avatar_url, phone')
		.in('role', ['admin', 'moderator'])
		.order('name', { ascending: true })

	if (error) {
		console.error('GET /api/message/admins:', error.message)
		return NextResponse.json({ error: 'No se pudo cargar el equipo' }, { status: 500 })
	}

	const rows = (data ?? []).filter((p) => p.id !== user.id)
	return NextResponse.json({ profiles: rows })
}
