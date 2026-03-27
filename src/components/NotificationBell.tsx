'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, MessageCircle, FileText, CheckCircle, XCircle, Trash2, Megaphone, Loader2, UserPlus, Send } from 'lucide-react'
import { useApp } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import { showSystemNotification } from '@/lib/notifications'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover'
import { Button } from '@/app/components/ui/button'
import { ScrollArea } from '@/app/components/ui/scroll-area'
import { cn } from '@/app/components/ui/utils'
import { toast } from 'sonner'

const defaultTriggerClass =
  'relative p-2 rounded-xl text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white transition-colors'

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string | null
  link_url: string | null
  related_id: string | null
  read_at: string | null
  created_at: string
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  message: MessageCircle,
  comment: FileText,
  post_approved: CheckCircle,
  post_rejected: XCircle,
  post_deleted: Trash2,
  post_pending: Megaphone,
  new_profile: UserPlus,
}

function formatNotificationTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours} h`
  if (diffDays < 7) return `Hace ${diffDays} días`
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export function NotificationBell({
  triggerClassName,
  badgeClassName,
}: {
  triggerClassName?: string
  badgeClassName?: string
} = {}) {
  const { currentUser } = useApp()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [sendingWelcomeId, setSendingWelcomeId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data)
    } finally {
      setLoading(false)
    }
  }, [currentUser, supabase.auth])

  useEffect(() => {
    if (!currentUser?.id) return
    fetchNotifications()
  }, [currentUser?.id, fetchNotifications])

  // Realtime: nueva notificación desde la tabla (persistida por triggers)
  useEffect(() => {
    if (!currentUser?.id) return
    const channel = supabase
      .channel(`notifications-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        (payload) => {
          const row = payload.new as AppNotification
          setNotifications((prev) => {
            // Si ya tenemos una optimista del mismo mensaje, reemplazarla por la real
            const optIndex = prev.findIndex(
              (n) => n.id.startsWith('opt-') && n.type === 'message' && n.related_id === row.related_id
            )
            if (optIndex >= 0) {
              const next = [...prev]
              next.splice(optIndex, 1, row)
              return next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            }
            return [row, ...prev]
          })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser?.id, supabase])

  // Realtime instantáneo: mensajes de chat (para que lleguen al instante sin esperar al trigger)
  useEffect(() => {
    if (!currentUser?.id) return
    const channel = supabase
      .channel(`chat-inbox-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `receiver_id=eq.${currentUser.id}` },
        (payload) => {
          const row = payload.new as { id: string; sender_id: string; content: string }
          const optimistic: AppNotification = {
            id: `opt-${row.id}`,
            type: 'message',
            title: 'Nuevo mensaje',
            body: (row.content ?? '').slice(0, 80) + (row.content && row.content.length > 80 ? '…' : ''),
            link_url: '/chat',
            related_id: row.id,
            read_at: null,
            created_at: new Date().toISOString(),
          }
          setNotifications((prev) => [optimistic, ...prev])
          showSystemNotification({
            title: 'Nuevo mensaje',
            body: optimistic.body ?? 'Te enviaron un mensaje',
            tag: `chat-msg-${row.id}`,
            url: '/chat',
          })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser?.id, supabase])

  const markAsRead = async (ids: string[]) => {
    const realIds = ids.filter((id) => !id.startsWith('opt-'))
    setNotifications((prev) =>
      prev.map((n) =>
        ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n
      )
    )
    if (realIds.length) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ ids: realIds }),
        })
      }
    }
  }

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read_at)
    if (!unread.length) return
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({}),
      })
    }
  }

  const handleNotificationClick = (n: AppNotification) => {
    if (n.type === 'new_profile') return
    if (!n.read_at) markAsRead([n.id])
    setOpen(false)
    if (n.link_url) router.push(n.link_url)
  }

  const sendWelcomeMessage = async (n: AppNotification) => {
    if (!n.related_id || n.id.startsWith('opt-')) return
    setSendingWelcomeId(n.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        return
      }
      const res = await fetch('/api/admin/send-welcome-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId: n.related_id }),
      })
      if (res.ok) {
        if (!n.read_at) markAsRead([n.id])
        setOpen(false)
        router.push(`/admin/messages/chat/${n.related_id}`)
        toast.success('Mensaje de bienvenida enviado')
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? 'Error al enviar')
      }
    } finally {
      setSendingWelcomeId(null)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length

  if (!currentUser) return null

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) fetchNotifications(); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(defaultTriggerClass, triggerClassName)}
          aria-label="Notificaciones"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white',
                badgeClassName
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="end" sideOffset={8}>
        <div className="border-b border-slate-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={markAllAsRead}
            >
              Marcar todas leídas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[320px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-gray-400">
              No tenés notificaciones
            </div>
          ) : (
            <ul className="py-1">
              {notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] ?? Bell
                const isNewProfile = n.type === 'new_profile'
                return (
                  <li key={n.id}>
                    {isNewProfile ? (
                      <div
                        className={cn(
                          'w-full flex gap-3 px-4 py-3 text-left border-b border-slate-100 dark:border-gray-800/50 last:border-0',
                          !n.read_at && 'bg-indigo-50/50 dark:bg-indigo-900/10'
                        )}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-300">
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 dark:text-white text-sm">{n.title}</p>
                          {n.body && (
                            <pre className="text-xs text-slate-600 dark:text-gray-400 mt-1 whitespace-pre-wrap font-sans line-clamp-4">
                              {n.body}
                            </pre>
                          )}
                          <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">
                            {formatNotificationTime(n.created_at)}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {n.link_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => {
                                  setOpen(false)
                                  router.push(n.link_url!)
                                }}
                              >
                                Ver chat
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="text-xs h-7 bg-indigo-600 hover:bg-indigo-700"
                              disabled={sendingWelcomeId === n.id}
                              onClick={() => sendWelcomeMessage(n)}
                            >
                              {sendingWelcomeId === n.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Send className="w-3 h-3 mr-1" />
                                  Enviar mensaje de bienvenida
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(n)}
                        className={cn(
                          'w-full flex gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-gray-800/80 transition-colors border-b border-slate-100 dark:border-gray-800/50 last:border-0',
                          !n.read_at && 'bg-indigo-50/50 dark:bg-indigo-900/10'
                        )}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-300">
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 dark:text-white text-sm">{n.title}</p>
                          {n.body && (
                            <p className="text-xs text-slate-500 dark:text-gray-400 line-clamp-2 mt-0.5">{n.body}</p>
                          )}
                          <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">
                            {formatNotificationTime(n.created_at)}
                          </p>
                        </div>
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
