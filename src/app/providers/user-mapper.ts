import type { AdminProfile, User } from './types'

export function profileToUser(profile: {
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
}): User {
  const pref = profile.notification_preference
  return {
    id: profile.id,
    name: profile.name ?? profile.email,
    email: profile.email,
    isAdmin: profile.role === 'admin',
    isBlocked: profile.status === 'blocked',
    avatar: profile.avatar_url ?? undefined,
    isModerator: profile.role === 'moderator',
    suspendedUntil: profile.suspended_until ?? undefined,
    phone: profile.phone ?? undefined,
    province: profile.province ?? undefined,
    locality: profile.locality ?? undefined,
    notificationPreference: pref === 'custom' || pref === 'messages_only' ? pref : 'all',
  }
}

export function adminProfileToUser(p: AdminProfile): User {
  return {
    id: p.id,
    name: p.name ?? p.email,
    email: p.email,
    isAdmin: p.role === 'admin',
    isBlocked: p.status === 'blocked',
    avatar: p.avatar_url ?? undefined,
    isModerator: p.role === 'moderator',
    suspendedUntil: p.suspended_until ?? undefined,
    phone: p.phone ?? undefined,
    notificationPreference: 'all',
  }
}

/** Fallback cuando la tabla profiles falla (ej. 500): arma User desde la sesión. El rol admin solo viene de profiles. */
export function userFromSession(user: {
  id: string
  email?: string | null
  user_metadata?: { name?: string } | null
}): User {
  const email = (user.email ?? '').trim().toLowerCase()
  return {
    id: user.id,
    name: (user.user_metadata?.name ?? user.email ?? '').trim() || email || 'Usuario',
    email: email ? email : (user.email ?? ''),
    isAdmin: false,
    isBlocked: false,
    avatar: undefined,
  }
}
