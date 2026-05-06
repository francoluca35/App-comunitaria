import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

/** PATCH: actualizar role, status o suspended_until (solo admin). Usa cliente con token + RLS. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  const { supabase } = auth
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  let body: { role?: string; status?: string; suspended_until?: string | null } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.role !== undefined) {
    if (!['viewer', 'moderator', 'admin', 'admin_master'].includes(body.role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }
    updates.role = body.role
  }
  if (body.status !== undefined) {
    if (!['active', 'blocked'].includes(body.status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }
    updates.status = body.status
  }
  if (body.suspended_until !== undefined) {
    updates.suspended_until = body.suspended_until === null || body.suspended_until === '' ? null : body.suspended_until
  }

  // Primero verificamos que el perfil exista.
  // Si el update falla por RLS, el `maybeSingle()` del update puede devolver null sin error,
  // y el mensaje "Perfil no encontrado" confunde.
  const { data: existsProfile, error: existsError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (existsError) return NextResponse.json({ error: existsError.message }, { status: 500 })
  if (!existsProfile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) {
    return NextResponse.json(
      { error: 'No se pudo actualizar el perfil (posible bloqueo por permisos RLS)' },
      { status: 403 }
    )
  }
  return NextResponse.json(data)
}

/** DELETE: eliminar usuario de auth (cascade borra perfil). Solo admin. Requiere SUPABASE_SERVICE_ROLE_KEY. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  const { serviceClient } = auth
  if (!serviceClient) {
    return NextResponse.json(
      { error: 'Eliminar usuario requiere configurar SUPABASE_SERVICE_ROLE_KEY en el servidor' },
      { status: 503 }
    )
  }
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  const { error } = await serviceClient.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
