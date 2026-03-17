import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** PATCH: actualizar datos del perfil del usuario (nombre, teléfono, provincia, localidad) */
export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(token)
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user?.id) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  let body: { name?: string; phone?: string; province?: string; locality?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const updates: Record<string, string | null> = {}
  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    updates.name = name || null
  }
  if (body.phone !== undefined) {
    updates.phone = typeof body.phone === 'string' ? body.phone.trim() || null : null
  }
  if (body.province !== undefined) {
    updates.province = typeof body.province === 'string' ? body.province.trim() || null : null
  }
  if (body.locality !== undefined) {
    updates.locality = typeof body.locality === 'string' ? body.locality.trim() || null : null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    console.error('PATCH profile error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
