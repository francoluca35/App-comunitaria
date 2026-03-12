import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const MAX_SIZE_MB = 2
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function getExt(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(token)
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user?.id) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }
  const userId = user.id

  // Storage desde el servidor no recibe el JWT del usuario y RLS falla. Usamos service role
  // solo para Storage; el usuario no necesita ningún rol, solo estar autenticado.
  const storage = createServiceRoleClient()
  if (!storage) {
    return NextResponse.json(
      { error: 'Faltan variables de entorno. Agregá SUPABASE_SERVICE_ROLE_KEY en .env.local (Supabase → Settings → API → service_role).' },
      { status: 503 }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  const file = formData.get('avatar') ?? formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Enviá una imagen (campo "avatar" o "file")' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Formato no permitido. Usá JPG, PNG o WebP.' },
      { status: 400 }
    )
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json(
      { error: `El archivo no puede superar ${MAX_SIZE_MB} MB` },
      { status: 400 }
    )
  }

  // Obtener avatar actual para borrarlo de Storage antes de subir la nueva
  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', userId)
    .single()

  const currentAvatarUrl = profile?.avatar_url
  if (currentAvatarUrl && typeof currentAvatarUrl === 'string') {
    try {
      const u = new URL(currentAvatarUrl)
      const prefix = '/storage/v1/object/public/avatars/'
      const i = u.pathname.indexOf(prefix)
      if (i !== -1) {
        const oldPath = u.pathname.slice(i + prefix.length)
        if (oldPath.startsWith(userId + '/')) {
          await storage.storage.from('avatars').remove([oldPath])
        }
      }
    } catch {
      // Ignorar si la URL no es válida o no es de nuestro bucket
    }
  }

  const ext = getExt(file.type)
  const path = `${userId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await storage.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('Avatar upload error:', uploadError)
    const isBucketNotFound =
      (uploadError as { statusCode?: string }).statusCode === '404' ||
      (uploadError.message ?? '').toLowerCase().includes('bucket not found')
    if (isBucketNotFound) {
      return NextResponse.json(
        {
          error:
            "Falta crear el bucket de avatares. En Supabase: Storage → New bucket → nombre 'avatars' → Public bucket activado → Create.",
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: uploadError.message ?? 'Error al subir la imagen' },
      { status: 500 }
    )
  }

  const { data: urlData } = storage.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = urlData.publicUrl

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (updateError) {
    console.error('Profile avatar_url update error:', updateError)
    return NextResponse.json(
      { error: 'Error al actualizar el perfil' },
      { status: 500 }
    )
  }

  return NextResponse.json({ avatar_url: avatarUrl })
}

export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(token)
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user?.id) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }
  const userId = user.id

  const storage = createServiceRoleClient()
  if (!storage) {
    return NextResponse.json(
      { error: 'Configuración del servidor incompleta.' },
      { status: 503 }
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', userId)
    .single()

  const currentAvatarUrl = profile?.avatar_url
  if (currentAvatarUrl && typeof currentAvatarUrl === 'string') {
    try {
      const u = new URL(currentAvatarUrl)
      const prefix = '/storage/v1/object/public/avatars/'
      const i = u.pathname.indexOf(prefix)
      if (i !== -1) {
        const oldPath = u.pathname.slice(i + prefix.length)
        if (oldPath.startsWith(userId + '/')) {
          await storage.storage.from('avatars').remove([oldPath])
        }
      }
    } catch {
      // ignorar
    }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (updateError) {
    return NextResponse.json({ error: 'Error al eliminar la foto' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
