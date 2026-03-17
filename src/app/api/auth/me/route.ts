import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient, getUserIdFromToken } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) {
    return NextResponse.json({ error: 'No token' }, { status: 401 })
  }

  const supabase = createClient(token)
  let userId: string | null = null

  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (user?.id) {
    userId = user.id
  }
  if (!userId) {
    userId = getUserIdFromToken(token)
  }
  if (!userId) {
    return NextResponse.json(
      { error: userError?.message ?? 'Invalid token' },
      { status: 401 }
    )
  }

  try {
    type ProfileRow = {
      id: string
      email: string
      name: string | null
      avatar_url: string | null
      role: string
      status: string
      suspended_until?: string | null
      phone?: string | null
      province?: string | null
      locality?: string | null
      notification_preference?: string | null
    }
    let profile: ProfileRow | null = null
    let selectError: { message: string; code?: string } | null = null
    const selectCols = 'id, email, name, avatar_url, role, status, suspended_until, phone, province, locality, notification_preference'

    const { data, error } = await supabase
      .from('profiles')
      .select(selectCols)
      .eq('id', userId)
      .single()

    if (error) {
      selectError = error
      if (error.code !== 'PGRST116') {
        const serviceClient = createServiceRoleClient()
        if (serviceClient) {
          const res = await serviceClient
            .from('profiles')
            .select(selectCols)
            .eq('id', userId)
            .single()
          if (res.data) profile = res.data as ProfileRow
        }
      }
    } else {
      profile = data as ProfileRow
    }

    if (!profile) {
      return NextResponse.json(
        { error: selectError?.message ?? 'Profile not found', code: selectError?.code },
        { status: selectError?.code === 'PGRST116' ? 404 : 500 }
      )
    }
    if (profile.status === 'blocked') {
      return NextResponse.json({ error: 'Blocked' }, { status: 403 })
    }
    return NextResponse.json(profile)
  } catch (e) {
    console.error('API auth/me error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
