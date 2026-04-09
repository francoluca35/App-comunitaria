'use client'

import { useEffect, useMemo } from 'react'
import { useAuth } from '@/app/providers/auth-context'
import { createClient } from '@/lib/supabase/client'
import { showSystemNotification } from '@/lib/notifications'

/**
 * Suscripciones Realtime para notificaciones por rol:
 * - Viewer: publicación aprobada, rechazada o eliminada; mensajes del admin (se manejan en chat/page)
 * - Admin: nueva publicación a moderar, nuevo perfil, "X te respondió el mensaje"
 * - Moderator: nueva publicación a moderar, "X te respondió el mensaje"
 */
export function RealtimeNotificationSubscriptions() {
  const { currentUser } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!currentUser?.id) return

    const myId = currentUser.id
    const isViewer = !currentUser.isAdmin && !currentUser.isModerator
    const isAdmin = currentUser.isAdmin
    const isModerator = currentUser.isModerator

    const channels: ReturnType<typeof supabase.channel>[] = []

    // ---------- VIEWER: notificación cuando aprueban, rechazan o eliminan su publicación ----------
    if (isViewer && (currentUser.notificationPreference === 'all' || currentUser.notificationPreference === 'custom')) {
      const ch = supabase
        .channel(`notif-posts-my-${myId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'posts', filter: `author_id=eq.${myId}` },
          (payload) => {
            const row = payload.new as { status: string; id?: string }
            if (row.status === 'approved') {
              showSystemNotification({
                title: 'Publicación aprobada',
                body: 'Tu publicación fue aprobada y ya está publicada.',
                tag: `post-approved-${row.id ?? ''}`,
                url: '/',
              })
            } else if (row.status === 'rejected') {
              showSystemNotification({
                title: 'Publicación rechazada',
                body: 'Tu publicación fue rechazada por el equipo de moderación.',
                tag: `post-rejected-${row.id ?? ''}`,
                url: '/mis-publicaciones',
              })
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'posts', filter: `author_id=eq.${myId}` },
          (payload) => {
            const old = payload.old as { id?: string; author_id?: string }
            if (old?.author_id && old.author_id !== myId) return
            showSystemNotification({
              title: 'Publicación eliminada',
              body: 'Tu publicación fue eliminada permanentemente.',
              tag: `post-deleted-${old?.id ?? ''}`,
              url: '/mis-publicaciones',
            })
          }
        )
        .subscribe()
      channels.push(ch)
    }

    // ---------- ADMIN y MODERATOR: nueva publicación pendiente de moderar (siempre en tiempo real) ----------
    if (isAdmin || isModerator) {
      const ch = supabase
        .channel(`notif-posts-pending-${myId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'posts' },
          async (payload) => {
            const row = payload.new as { id: string; author_id: string; status: string }
            if (row.status !== 'pending') return
            const { data: profile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', row.author_id)
              .single()
            const name = (profile?.name ?? 'Alguien').trim() || 'Alguien'
            showSystemNotification({
              title: 'Publicación para moderar',
              body: `${name} hizo una publicación - moderar`,
              tag: `post-pending-${row.id}`,
              url: '/admin/moderation',
            })
          }
        )
        .subscribe()
      channels.push(ch)
    }

    // ---------- Solo ADMIN: nuevo perfil creado ----------
    if (isAdmin) {
      const ch = supabase
        .channel(`notif-profiles-new-${myId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'profiles' },
          (payload) => {
            const row = payload.new as { id: string; name: string | null; email?: string }
            const name = (row.name ?? row.email ?? 'Nuevo usuario').trim() || 'Nuevo usuario'
            showSystemNotification({
              title: 'Nuevo perfil',
              body: `Se creó un nuevo perfil: ${name}`,
              tag: `profile-${row.id}`,
              url: '/admin',
            })
          }
        )
        .subscribe()
      channels.push(ch)
    }

    // ---------- ADMIN y MODERATOR: "X te respondió el mensaje" ----------
    if (isAdmin || isModerator) {
      const ch = supabase
        .channel(`notif-chat-inbox-${myId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages' },
          async (payload) => {
            const row = payload.new as { id: string; sender_id: string; receiver_id: string }
            if (row.receiver_id !== myId) return
            const { data: profile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', row.sender_id)
              .single()
            const name = (profile?.name ?? 'Alguien').trim() || 'Alguien'
            showSystemNotification({
              title: 'Nuevo mensaje',
              body: `${name} te respondió el mensaje`,
              tag: `chat-${row.sender_id}-${myId}`,
              url: '/admin/messages',
            })
          }
        )
        .subscribe()
      channels.push(ch)
    }

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch))
    }
  }, [
    currentUser?.id,
    currentUser?.isAdmin,
    currentUser?.isModerator,
    currentUser?.notificationPreference,
    supabase,
  ])

  return null
}
