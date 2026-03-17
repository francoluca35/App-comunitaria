'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useApp } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { DashboardLayout } from '@/components/DashboardLayout'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { ArrowLeft, Send, Trash2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { showSystemNotification } from '@/lib/notifications'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export interface ChatMessage {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
}

export default function AdminChatPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params?.userId as string | undefined
  const { currentUser, adminProfiles } = useApp()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showClearAllDialog, setShowClearAllDialog] = useState(false)
  const [showClearByDateDialog, setShowClearByDateDialog] = useState(false)
  const [clearFrom, setClearFrom] = useState('')
  const [clearTo, setClearTo] = useState('')
  const [clearing, setClearing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const profile = userId ? adminProfiles.find((p) => p.id === userId) : null
  const myId = currentUser?.id ?? ''
  const otherId = userId ?? ''

  const loadMessages = async () => {
    if (!myId || !otherId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, sender_id, receiver_id, content, created_at')
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`)
      .order('created_at', { ascending: true })
    setLoading(false)
    if (error) {
      toast.error('Error al cargar mensajes')
      return
    }
    setMessages((data as ChatMessage[]) ?? [])
  }

  useEffect(() => {
    if (!myId || !otherId) return
    loadMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, otherId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!myId || !otherId) return
    const channel = supabase
      .channel(`chat:${myId}:${otherId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const row = payload.new as ChatMessage
          const isThisConversation =
            (row.sender_id === myId && row.receiver_id === otherId) ||
            (row.sender_id === otherId && row.receiver_id === myId)
          if (isThisConversation) {
            setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]))
            const isIncoming = row.receiver_id === myId && row.sender_id === otherId
            if (isIncoming && document.visibilityState !== 'visible' && profile?.name) {
              showSystemNotification({
                title: 'Nuevo mensaje',
                body: `${profile.name} te respondió el mensaje`,
                tag: `chat-${otherId}-${myId}`,
                url: `/admin/messages/chat/${otherId}`,
              })
            }
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, otherId, profile?.name])

  const pollInterval = 2000
  useEffect(() => {
    if (!myId || !otherId) return
    const tick = () => {
      supabase
        .from('chat_messages')
        .select('id, sender_id, receiver_id, content, created_at')
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          if (data?.length) setMessages(data as ChatMessage[])
        })
    }
    const id = setInterval(tick, pollInterval)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, otherId])

  if (!currentUser?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">No tienes permisos de administrador</p>
            <Button onClick={() => router.push('/')}>Volver al inicio</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!userId || !profile) {
    return (
      <DashboardLayout>
        <div className="w-full max-w-2xl mx-auto p-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/messages')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <p className="text-slate-500 dark:text-slate-400 mt-4">Usuario no encontrado. Volvé a la lista de mensajes.</p>
        </div>
      </DashboardLayout>
    )
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = message.trim()
    if (!text || !myId || !otherId) return
    setSending(true)
    const { data: newMsg, error } = await supabase
      .from('chat_messages')
      .insert({ sender_id: myId, receiver_id: otherId, content: text })
      .select('id, sender_id, receiver_id, content, created_at')
      .single()
    setSending(false)
    if (error) {
      toast.error(error.message ?? 'Error al enviar')
      return
    }
    if (newMsg) setMessages((prev) => [...prev, newMsg as ChatMessage])
    setMessage('')
  }

  const clearAllChat = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      toast.error('Sesión expirada')
      return
    }
    setClearing(true)
    const res = await fetch('/api/admin/chat/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ userId: otherId }),
    })
    setClearing(false)
    setShowClearAllDialog(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Error al vaciar el chat')
      return
    }
    setMessages([])
    toast.success('Chat vaciado. Los mensajes se eliminaron para ambos.')
  }

  const clearChatByDate = async () => {
    if (!clearFrom && !clearTo) {
      toast.error('Indicá al menos una fecha (desde o hasta)')
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      toast.error('Sesión expirada')
      return
    }
    setClearing(true)
    const body: { userId: string; from?: string; to?: string } = { userId: otherId }
    if (clearFrom) body.from = new Date(clearFrom).toISOString()
    if (clearTo) body.to = new Date(clearTo).toISOString()
    const res = await fetch('/api/admin/chat/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    })
    setClearing(false)
    setShowClearByDateDialog(false)
    setClearFrom('')
    setClearTo('')
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Error al eliminar mensajes')
      return
    }
    await loadMessages()
    toast.success('Mensajes del rango eliminados para ambos.')
  }

  const displayName = profile.name ?? profile.email

  return (
    <DashboardLayout>
      <div className="w-full max-w-2xl mx-auto flex flex-col h-[calc(100vh-6rem)]">
        <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/messages')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="text-sm">{displayName[0]?.toUpperCase() ?? '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 dark:text-white truncate">{displayName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{profile.email}</p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="text-slate-600 dark:text-slate-400"
              onClick={() => setShowClearByDateDialog(true)}
              disabled={clearing}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Vaciar por fechas
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 dark:text-red-400"
              onClick={() => setShowClearAllDialog(true)}
              disabled={clearing}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Vaciar chat
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-800/30">
          {loading ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-4">Cargando mensajes...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-4">No hay mensajes todavía. Escribí algo para iniciar la conversación.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg) => {
                const isMine = msg.sender_id === myId
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        isMine
                          ? 'bg-indigo-500 text-white rounded-br-md'
                          : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isMine ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribí tu mensaje..."
              className="flex-1"
              disabled={sending}
            />
            <Button type="submit" size="icon" disabled={sending || !message.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>

      <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vaciar todo el chat</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los mensajes de esta conversación de forma permanente, para vos y para el usuario. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={clearing}
              onClick={(e) => {
                e.preventDefault()
                void clearAllChat()
              }}
            >
              {clearing ? 'Eliminando…' : 'Vaciar chat'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showClearByDateDialog} onOpenChange={setShowClearByDateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vaciar chat por rango de fechas</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Indicá desde y/o hasta qué fecha eliminar mensajes. Se borrarán para ambos.
          </p>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Desde</label>
            <Input
              type="datetime-local"
              value={clearFrom}
              onChange={(e) => setClearFrom(e.target.value)}
              disabled={clearing}
            />
            <label className="text-sm font-medium">Hasta</label>
            <Input
              type="datetime-local"
              value={clearTo}
              onChange={(e) => setClearTo(e.target.value)}
              disabled={clearing}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearByDateDialog(false)} disabled={clearing}>
              Cancelar
            </Button>
            <Button onClick={clearChatByDate} disabled={clearing}>
              {clearing ? 'Eliminando…' : 'Eliminar mensajes del rango'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
