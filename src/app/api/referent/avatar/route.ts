import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireReferentAvatarManager } from '@/lib/referent-avatar-auth'
import { fetchCanonicalMarioProfile } from '@/lib/mario-account'

const MAX_SIZE_MB = 2
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function getExt(mime: string): string {
	if (mime === 'image/png') return 'png'
	if (mime === 'image/webp') return 'webp'
	return 'jpg'
}

async function removeAvatarObjectFromUrl(storage: NonNullable<ReturnType<typeof createServiceRoleClient>>, url: string) {
	try {
		const u = new URL(url)
		const prefix = '/storage/v1/object/public/avatars/'
		const i = u.pathname.indexOf(prefix)
		if (i === -1) return
		const path = u.pathname.slice(i + prefix.length)
		await storage.storage.from('avatars').remove([path])
	} catch {
		// ignorar
	}
}

/** POST: sube foto del referente (perfil canónico de Mario) — admin_master o cuenta Mario. */
export async function POST(request: NextRequest) {
	const auth = await requireReferentAvatarManager(request)
	if (!auth.ok) return auth.response

	const storage = createServiceRoleClient()
	if (!storage) {
		return NextResponse.json(
			{
				error:
					'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor para completar la subida.',
			},
			{ status: 503 }
		)
	}

	const mario = await fetchCanonicalMarioProfile(storage)
	if (!mario?.id) {
		return NextResponse.json(
			{ error: 'No se encontró el perfil del referente en la base de datos.' },
			{ status: 404 }
		)
	}

	let formData: FormData
	try {
		formData = await request.formData()
	} catch {
		return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
	}

	const file = formData.get('avatar') ?? formData.get('file')
	if (!file || !(file instanceof File)) {
		return NextResponse.json({ error: 'Enviá una imagen (campo avatar o file)' }, { status: 400 })
	}
	if (!ALLOWED_TYPES.includes(file.type)) {
		return NextResponse.json({ error: 'Formato no permitido. Usá JPG, PNG o WebP.' }, { status: 400 })
	}
	if (file.size > MAX_SIZE_MB * 1024 * 1024) {
		return NextResponse.json({ error: `El archivo no puede superar ${MAX_SIZE_MB} MB` }, { status: 400 })
	}

	if (mario.avatar_url) {
		await removeAvatarObjectFromUrl(storage, mario.avatar_url)
	}

	const ext = getExt(file.type)
	const path = `${mario.id}/${crypto.randomUUID()}.${ext}`

	const { error: uploadError } = await storage.storage
		.from('avatars')
		.upload(path, file, { contentType: file.type, upsert: false })

	if (uploadError) {
		console.error('Referent avatar upload:', uploadError)
		return NextResponse.json(
			{ error: uploadError.message ?? 'Error al subir la imagen' },
			{ status: 500 }
		)
	}

	const { data: urlData } = storage.storage.from('avatars').getPublicUrl(path)
	const avatarUrl = urlData.publicUrl

	const { error: updateError } = await storage
		.from('profiles')
		.update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
		.eq('id', mario.id)

	if (updateError) {
		console.error('Referent profile update:', updateError)
		return NextResponse.json({ error: 'Error al actualizar el perfil del referente' }, { status: 500 })
	}

	return NextResponse.json({ avatar_url: avatarUrl })
}

/** DELETE: quita la foto del referente (vuelve al fallback del banner). */
export async function DELETE(req: NextRequest) {
	const auth = await requireReferentAvatarManager(req)
	if (!auth.ok) return auth.response

	const storage = createServiceRoleClient()
	if (!storage) {
		return NextResponse.json({ error: 'Configuración del servidor incompleta.' }, { status: 503 })
	}

	const mario = await fetchCanonicalMarioProfile(storage)
	if (!mario?.id) {
		return NextResponse.json({ error: 'No se encontró el perfil del referente.' }, { status: 404 })
	}

	if (mario.avatar_url) {
		await removeAvatarObjectFromUrl(storage, mario.avatar_url)
	}

	const { error: updateError } = await storage
		.from('profiles')
		.update({ avatar_url: null, updated_at: new Date().toISOString() })
		.eq('id', mario.id)

	if (updateError) {
		return NextResponse.json({ error: 'Error al quitar la foto' }, { status: 500 })
	}

	return NextResponse.json({ ok: true })
}
