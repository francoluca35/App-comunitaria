'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  MessageCircle,
  FileText,
  CheckCircle,
  XCircle,
  Trash2,
  Megaphone,
  Loader2,
  UserPlus,
  Send,
  AlertTriangle,
  BellRing,
  Flag,
} from 'lucide-react'
import { useApp } from '@/app/providers'
import { getSessionSafe } from '@/lib/auth-api'
import { createClient } from '@/lib/supabase/client'
import { sanitizeChatNotificationBody } from '@/lib/chat-message-payload'
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
import type { ChatNotificationRow } from '@/lib/chat-notification-ui'
import { resolveMessageLink } from '@/lib/chat-notification-ui'
import { useChatNotifications } from '@/contexts/ChatNotificationsContext'

const defaultTriggerClass =
  'relative p-2 rounded-xl text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white transition-colors'

export type AppNotification = ChatNotificationRow

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  message: MessageCircle,
  comment: FileText,
  publicidad_comment: FileText,
  post_approved: CheckCircle,
  post_rejected: XCircle,
  post_deleted: Trash2,
  post_pending: Megaphone,
  publicidad_pending: Megaphone,
  publicidad_payment_link: Megaphone,
  publicidad_rejected: XCircle,
  publicidad_active: CheckCircle,
  new_profile: UserPlus,
  community_alert: AlertTriangle,
  community_alert_critical: BellRing,
  comment_report: Flag,
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
  const [fetchError, setFetchError] = useState<string | null>(null)
  const supabase = createClient()
  const { threads, unreadMessageCount, markNotificationIdsRead, fetchMessageRows } = useChatNotifications()

  const messageThreadsUnread = useMemo(
    () => threads.filter((t) => t.items.some((x) => !x.read_at)),
    [threads]
  )

  const messageSendersSummary = useMemo(() => {
    if (messageThreadsUnread.length === 0) return ''
    return messageThreadsUnread
      .map((t) => {
        const name = (t.items[0]?.title ?? 'Chat').trim() || 'Chat'
        const n = t.items.filter((x) => !x.read_at).length
        return n > 1 ? `${name} (${n})` : name
      })
      .join(', ')
  }, [messageThreadsUnread])

  const unreadNonMessageCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications]
  )

  const totalUnreadBadge = unreadNonMessageCount + unreadMessageCount

  const fetchNotifications = useCallback(
    async (opts?: { showErrorToast?: boolean }) => {
      if (!currentUser?.id) return
      setLoading(true)
      setFetchError(null)
      try {
        let {
          data: { session },
        } = await getSessionSafe(supabase)
        if (!session?.access_token) {
          setFetchError('No hay sesión')
          return
        }

        const load = async (token: string) =>
          fetch('/api/notifications', {
            headers: { Authorization: `Bearer ${token}` },
          })

        let res = await load(session.access_token)
        if (res.status === 401) {
          const { data: refreshed } = await supabase.auth.refreshSession()
          if (refreshed.session?.access_token) {
            session = refreshed.session
            res = await load(refreshed.session.access_token)
          }
        }

        const data: unknown = await res.json().catch(() => null)
        if (!res.ok) {
          const msg =
            data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
              ? (data as { error: string }).error
              : `Error ${res.status}`
          setFetchError(msg)
          if (opts?.showErrorToast) {
            toast.error('No se pudieron cargar las notificaciones', { description: msg, id: 'notifications-fetch' })
          }
          return
        }
        if (!Array.isArray(data)) {
          setFetchError('Respuesta inválida del servidor')
          if (opts?.showErrorToast) {
            toast.error('Notificaciones: respuesta inválida', { id: 'notifications-fetch' })
          }
          return
        }
        const rows = (data as AppNotification[]).filter((r) => r.type !== 'message')
        rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setNotifications(rows)
      } finally {
        setLoading(false)
      }
    },
    [currentUser?.id, supabase]
  )

  const openPopover = (o: boolean) => {
    setOpen(o)
    if (o) {
      void fetchNotifications({ showErrorToast: true })
      void fetchMessageRows()
    }
  }

  const onOpenMessageThread = (t: (typeof threads)[0]) => {
    const unreadIds = t.items.filter((x) => !x.read_at).map((x) => x.id)
    const latest = t.items[0]
    if (!latest) return
    if (unreadIds.length) void markNotificationIdsRead(unreadIds)
    setOpen(false)
    router.push(resolveMessageLink(latest, currentUser))
  }

  useEffect(() => {
    if (!currentUser?.id) return
    fetchNotifications()
  }, [currentUser?.id, fetchNotifications])

  /** En móvil el realtime a veces se corta; al volver a la app refrescamos la campana. */
  useEffect(() => {
    if (!currentUser?.id) return
    let t: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      clearTimeout(t)
      t = setTimeout(() => {
        void fetchNotifications()
        void fetchMessageRows()
      }, 400)
    }
    document.addEventListener('visibilitychange', schedule)
    window.addEventListener('focus', schedule)
    return () => {
      clearTimeout(t)
      document.removeEventListener('visibilitychange', schedule)
      window.removeEventListener('focus', schedule)
    }
  }, [currentUser?.id, fetchNotifications, fetchMessageRows])

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
          if (row.type === 'community_alert' || row.type === 'community_alert_critical') {
            void showSystemNotification({
              title: row.title,
              body: row.body ?? undefined,
              tag:
                row.type === 'community_alert_critical'
                  ? `extravio-alert-${row.related_id ?? row.id}`
                  : `community-alert-${row.related_id ?? row.id}`,
              url: row.link_url ?? '/',
              urgent: true,
            })
          }
          if (row.type === 'message') {
            const sender = row.title?.trim() || 'Alguien'
            const body = sanitizeChatNotificationBody(row.body ?? 'Te enviaron un mensaje')
            void showSystemNotification({
              title: 'CST Comunidad',
              body: `${sender}: ${body}`,
              tag: `chat-peer-${row.related_id ?? row.id}`,
              url: row.link_url ?? '/message/contactos',
              urgent: true,
            })
            void fetchMessageRows()
            return
          }
          setNotifications((prev) => {
            const next = [row, ...prev.filter((n) => n.id !== row.id)]
            return next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          })
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          void fetchNotifications()
        }
      })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser?.id, supabase, fetchNotifications])

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
    if (totalUnreadBadge === 0) return
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
      void fetchMessageRows()
    }
  }

  const handleNotificationClick = (n: AppNotification) => {
    if (n.type === 'new_profile') return
    if (!n.read_at) void markAsRead([n.id])
    setOpen(false)
    router.push(n.link_url ?? '/')
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

  if (!currentUser) return null

  return (
    <Popover open={open} onOpenChange={openPopover}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(defaultTriggerClass, triggerClassName)}
          aria-label={
            totalUnreadBadge > 0
              ? `Notificaciones (${totalUnreadBadge} sin leer${messageSendersSummary ? `: ${messageSendersSummary}` : ''})`
              : 'Notificaciones'
          }
          title={
            unreadMessageCount > 0 && messageSendersSummary
              ? `Mensajes sin leer (${unreadMessageCount}): ${messageSendersSummary}`
              : unreadMessageCount > 0
                ? `${unreadMessageCount} mensaje${unreadMessageCount === 1 ? '' : 's'} sin leer`
                : undefined
          }
        >
          <Bell className="w-5 h-5" />
          {totalUnreadBadge > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#8B0015] text-[10px] font-bold text-white',
                badgeClassName
              )}
            >
              {totalUnreadBadge > 99 ? '99+' : totalUnreadBadge}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[120] w-[360px] ml-2 p-0 max-sm:w-[calc(100vw-1rem)] max-sm:max-w-none max-sm:rounded-2xl"
        align="end"
        sideOffset={8}
      >
        <div className="border-b border-slate-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">Notificaciones</h3>
          {totalUnreadBadge > 0 && (
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
        <ScrollArea className="h-[320px] max-sm:h-[min(70dvh,34rem)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : fetchError ? (
            <div className="px-4 py-8 text-center text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">No se pudo cargar el listado</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-gray-400">{fetchError}</p>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void fetchNotifications()}>
                Reintentar
              </Button>
            </div>
          ) : messageThreadsUnread.length === 0 && notifications.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-gray-400">
              No tenés notificaciones
            </div>
          ) : (
            <ul className="py-1">
              {messageThreadsUnread.length > 0 ? (
                <li className="border-b border-slate-200 bg-[#8B0015]/[0.06] dark:border-gray-800 dark:bg-[#8B0015]/15">
                  <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8B0015] dark:text-[#F5D0D6]">
                    Mensajes
                  </p>
                  <ul className="pb-2">
                    {messageThreadsUnread.map((t) => {
                      const latest = t.items[0]!
                      const unreadN = t.items.filter((x) => !x.read_at).length
                      const sender = (latest.title ?? 'Chat').trim() || 'Chat'
                      return (
                        <li key={t.peerId}>
                          <button
                            type="button"
                            onClick={() => onOpenMessageThread(t)}
                            className="flex w-full gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-gray-800/80"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-gray-700 dark:text-gray-300">
                              <MessageCircle className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{sender}</p>
                              {latest.body ? (
                                <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-gray-400">
                                  {sanitizeChatNotificationBody(latest.body)}
                                </p>
                              ) : null}
                              <p className="mt-1 text-[10px] text-slate-400 dark:text-gray-500">
                                {unreadN > 1 ? `${unreadN} sin leer · ` : ''}
                                {formatNotificationTime(latest.created_at)}
                              </p>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ) : null}
              {notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] ?? Bell
                const isNewProfile = n.type === 'new_profile'
                return (
                  <li key={n.id}>
                    {isNewProfile ? (
                      <div
                        className={cn(
                          'w-full flex gap-3 px-4 py-3 text-left border-b border-slate-100 dark:border-gray-800/50 last:border-0',
                          !n.read_at && 'bg-[#8B0015]/10 dark:bg-[#8B0015]/20'
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
                              className="text-xs h-7 bg-[#8B0015] hover:bg-[#5A000E]"
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
                          !n.read_at && 'bg-[#8B0015]/10 dark:bg-[#8B0015]/20',
                          n.type === 'community_alert' && !n.read_at && 'border-l-4 border-l-amber-500 pl-3',
                          n.type === 'community_alert_critical' &&
                            !n.read_at &&
                            'border-l-4 border-l-red-600 pl-3'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 dark:text-gray-300',
                            n.type === 'community_alert_critical'
                              ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                              : n.type === 'community_alert'
                                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
                                : 'bg-slate-200 dark:bg-gray-700'
                          )}
                        >
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
