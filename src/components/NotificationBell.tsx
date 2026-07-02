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
import { createClient } from '@/lib/supabase/client'
import { sanitizeChatNotificationBody } from '@/lib/chat-message-payload'
import { showSystemNotification } from '@/lib/notifications'
import { fetchNotificationsFromSupabase } from '@/lib/notifications-client'
import { shouldShowNotificationInBell } from '@/lib/notification-display'
import { useDebouncedAppVisible } from '@/hooks/useDebouncedAppVisible'
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
  community_notice: Megaphone,
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
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()
  const { threads, unreadMessageCount, markNotificationIdsRead, removeMessageNotificationIds, fetchMessageRows } =
    useChatNotifications()

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
        const data = await fetchNotificationsFromSupabase(supabase, currentUser.id, {
          type: 'non-message',
          limit: 30,
        })
        const rows = data.filter((r) => r.type !== 'message' && shouldShowNotificationInBell(r.type))
        rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setNotifications(rows)
      } catch {
        const msg = 'Error de conexión'
        setFetchError(msg)
        if (opts?.showErrorToast) {
          toast.error('No se pudieron cargar las notificaciones', { description: msg, id: 'notifications-fetch' })
        }
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

  useDebouncedAppVisible(() => {
    void fetchNotifications()
    void fetchMessageRows()
  })

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
          if (!shouldShowNotificationInBell(row.type)) return
          if (
            row.type === 'community_alert' ||
            row.type === 'community_alert_critical' ||
            row.type === 'community_notice'
          ) {
            void showSystemNotification({
              title: row.title,
              body: row.body ?? undefined,
              tag:
                row.type === 'community_alert_critical'
                  ? `extravio-alert-${row.related_id ?? row.id}`
                  : row.type === 'community_notice'
                    ? `community-notice-${row.related_id ?? row.id}`
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

  const deleteNotificationsOnServer = async (ids?: string[]) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return false
    const realIds = ids?.filter((id) => !id.startsWith('opt-'))
    const res = await fetch('/api/notifications', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(realIds?.length ? { ids: realIds } : {}),
    })
    return res.ok
  }

  const deleteNotifications = async (ids: string[]) => {
    if (!ids.length) return
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)))
    removeMessageNotificationIds(ids)
    const ok = await deleteNotificationsOnServer(ids)
    if (!ok) {
      toast.error('No se pudo eliminar la notificación')
      void fetchNotifications()
      void fetchMessageRows()
      return
    }
    void fetchMessageRows()
  }

  const clearAllNotifications = async () => {
    if (notifications.length === 0 && messageThreadsUnread.length === 0) return
    setDeleting(true)
    const messageIds = threads.flatMap((t) => t.items.map((x) => x.id))
    setNotifications([])
    removeMessageNotificationIds(messageIds)
    const ok = await deleteNotificationsOnServer()
    setDeleting(false)
    if (!ok) {
      toast.error('No se pudo vaciar la bandeja')
      void fetchNotifications()
      void fetchMessageRows()
      return
    }
    toast.success('Bandeja vaciada')
    void fetchMessageRows()
  }

  const hasDeletableItems = notifications.length > 0 || messageThreadsUnread.length > 0

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
        className="z-[120] ml-2 w-[min(94vw,430px)] max-w-[calc(100vw-0.75rem)] p-0 max-sm:ml-0 max-sm:rounded-2xl"
        align="end"
        sideOffset={8}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 dark:border-gray-800 sm:px-4">
          <h3 className="font-semibold text-slate-900 dark:text-white shrink-0">Notificaciones</h3>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5">
            {totalUnreadBadge > 0 ? (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs sm:px-3" onClick={() => void markAllAsRead()}>
                Marcar leídas
              </Button>
            ) : null}
            {hasDeletableItems ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-slate-600 hover:text-red-700 dark:text-gray-400 dark:hover:text-red-400 sm:px-3"
                disabled={deleting}
                onClick={() => void clearAllNotifications()}
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Vaciar'}
              </Button>
            ) : null}
          </div>
        </div>
        <ScrollArea className="h-[min(70dvh,420px)]">
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
                <li className="border-b border-[#8B0015]/25 bg-[#8B0015]/[0.11] dark:border-[#8B0015]/40 dark:bg-[#8B0015]/25">
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
                          <div className="flex w-full items-stretch">
                          <button
                            type="button"
                            onClick={() => onOpenMessageThread(t)}
                            className="flex min-w-0 flex-1 gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#8B0015]/10 dark:hover:bg-[#8B0015]/20 sm:px-4"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#8B0015]/15 text-[#8B0015] ring-1 ring-[#8B0015]/20 dark:bg-[#8B0015]/35 dark:text-[#F5D0D6]">
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
                          <button
                            type="button"
                            onClick={() => void deleteNotifications(t.items.map((x) => x.id))}
                            className="shrink-0 px-2 text-[#8B0015]/65 transition-colors hover:bg-[#8B0015]/10 hover:text-red-700 dark:text-[#F5D0D6]/70 dark:hover:bg-[#8B0015]/20 dark:hover:text-red-300 sm:px-3"
                            aria-label="Eliminar mensajes de este chat"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          </div>
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
                          'relative flex w-full gap-3 border-b border-slate-100 px-3 py-3 pr-9 text-left last:border-0 dark:border-gray-800/50 sm:px-4 sm:pr-10',
                          !n.read_at && 'border-l-4 border-l-[#8B0015] bg-[#8B0015]/15 shadow-[inset_0_0_0_1px_rgba(139,0,21,0.08)] dark:bg-[#8B0015]/28'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 dark:text-gray-300',
                            !n.read_at
                              ? 'bg-[#8B0015]/15 text-[#8B0015] ring-1 ring-[#8B0015]/20 dark:bg-[#8B0015]/35 dark:text-[#F5D0D6]'
                              : 'bg-slate-200 dark:bg-gray-700'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-sm text-slate-900 dark:text-white', !n.read_at ? 'font-bold' : 'font-medium')}>{n.title}</p>
                          {n.body && (
                            <pre className="mt-1 line-clamp-5 whitespace-pre-wrap font-sans text-xs text-slate-600 [overflow-wrap:anywhere] dark:text-gray-400">
                              {n.body}
                            </pre>
                          )}
                          <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">
                            {formatNotificationTime(n.created_at)}
                          </p>
                          <div className="mt-2 grid grid-cols-1 gap-2 min-[380px]:grid-cols-[auto_minmax(0,1fr)]">
                            {n.link_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 justify-center text-xs"
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
                              className="h-8 min-w-0 justify-center bg-[#8B0015] px-2 text-xs hover:bg-[#5A000E]"
                              disabled={sendingWelcomeId === n.id}
                              onClick={() => sendWelcomeMessage(n)}
                            >
                              {sendingWelcomeId === n.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Send className="w-3 h-3 mr-1" />
                                  <span className="truncate">Enviar mensaje de bienvenida</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void deleteNotifications([n.id])}
                          className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-200/80 hover:text-red-600 dark:hover:bg-gray-700 dark:hover:text-red-400"
                          aria-label="Eliminar notificación"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'relative flex w-full border-b border-slate-100 dark:border-gray-800/50 last:border-0',
                          !n.read_at && 'bg-[#8B0015]/15 shadow-[inset_0_0_0_1px_rgba(139,0,21,0.08)] dark:bg-[#8B0015]/28',
                          n.type === 'community_alert' && !n.read_at && 'border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/35',
                          n.type === 'community_alert_critical' && !n.read_at && 'border-l-4 border-l-red-600 bg-red-50 dark:bg-red-950/35',
                          n.type === 'community_notice' && !n.read_at && 'border-l-4 border-l-sky-500 bg-sky-50 dark:bg-sky-950/35'
                        )}
                      >
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(n)}
                        className={cn(
                          'min-w-0 flex-1 flex gap-3 px-3 py-3 pr-9 text-left hover:bg-slate-50 dark:hover:bg-gray-800/80 transition-colors sm:px-4 sm:pr-10',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 dark:text-gray-300',
                            n.type === 'community_alert_critical'
                              ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                              : n.type === 'community_alert'
                                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
                                : n.type === 'community_notice'
                                  ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-900 dark:text-sky-100'
                                  : 'bg-slate-200 dark:bg-gray-700'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-sm text-slate-900 dark:text-white', !n.read_at ? 'font-bold' : 'font-medium')}>{n.title}</p>
                          {n.body && (
                            <p className="text-xs text-slate-500 dark:text-gray-400 line-clamp-2 mt-0.5">{n.body}</p>
                          )}
                          <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">
                            {formatNotificationTime(n.created_at)}
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteNotifications([n.id])}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-200/80 hover:text-red-600 dark:hover:bg-gray-700 dark:hover:text-red-400"
                        aria-label="Eliminar notificación"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      </div>
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
