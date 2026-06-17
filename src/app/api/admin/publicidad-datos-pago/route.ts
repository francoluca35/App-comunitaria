import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
	PUBLICIDAD_DATOS_PAGO_CONFIG_KEY,
	parsePublicidadDatosPagoJsonb,
	type PublicidadDatosPago,
} from '@/lib/server/publicidad-payment-config'

function mergeDatos(
	current: PublicidadDatosPago,
	body: { alias?: unknown; cbu?: unknown }
): PublicidadDatosPago {
	const alias =
		typeof body.alias === 'string' ? body.alias.trim() : current.alias
	const cbu = typeof body.cbu === 'string' ? body.cbu.trim() : current.cbu
	return { alias, cbu }
}

async function readDatosPago(db: NonNullable<ReturnType<typeof createServiceRoleClient>> | ReturnType<typeof import('@/lib/supabase/server').createClient>): Promise<PublicidadDatosPago> {
	const { data, error } = await db
		.from('app_config')
		.select('value')
		.eq('key', PUBLICIDAD_DATOS_PAGO_CONFIG_KEY)
		.maybeSingle()

	if (error) {
		throw new Error(error.message)
	}

	return parsePublicidadDatosPagoJsonb(data?.value)
}

/** GET: datos de pago configurados por el admin (alias / CBU). */
export async function GET(request: NextRequest) {
	const auth = await requireAdmin(request)
	if (!auth.ok) return auth.response

	const db = auth.serviceClient ?? auth.supabase

	try {
		const datos = await readDatosPago(db)
		return NextResponse.json({ ok: true, ...datos })
	} catch (err) {
		const message = err instanceof Error ? err.message : 'No se pudo cargar'
		return NextResponse.json({ error: message }, { status: 500 })
	}
}

/** PATCH: actualizar alias y/o CBU para cobros de publicidad. */
export async function PATCH(request: NextRequest) {
	const auth = await requireAdmin(request)
	if (!auth.ok) return auth.response

	let body: { alias?: unknown; cbu?: unknown }
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
	}

	const db = auth.serviceClient ?? auth.supabase

	let current: PublicidadDatosPago
	try {
		current = await readDatosPago(db)
	} catch (err) {
		const message = err instanceof Error ? err.message : 'No se pudo cargar la configuración'
		return NextResponse.json({ error: message }, { status: 500 })
	}

	const datos = mergeDatos(current, body)
	if (!datos.alias && !datos.cbu) {
		return NextResponse.json(
			{ error: 'Ingresá al menos un alias o un CBU' },
			{ status: 400 }
		)
	}

	const { error } = await db.from('app_config').upsert(
		{
			key: PUBLICIDAD_DATOS_PAGO_CONFIG_KEY,
			value: datos,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: 'key' }
	)

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 })
	}

	return NextResponse.json({ ok: true, ...datos })
}
