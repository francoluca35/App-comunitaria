'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useApp } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ArrowLeft, Send } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { showSystemNotification } from '@/lib/notifications'
import { MessageContent } from '@/components/MessageContent'

interface ChatMessage {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
}

interface PeerProfile {
  id: string
  name: string | null
  avatar_url: string | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default function MessageWithPeerPage() {
  const router = useRouter()
  const params = useParams()
  const peerIdParam = params?.peerId
  const peerId = Array.isArray(peerIdParam) ? peerIdParam[0] : peerIdParam
  const { currentUser } = useApp()
  const [peer, setPeer] = useState<PeerProfile | null>(null)
  const [peerLoading, setPeerLoading] = useState(true)
  const [peerError, setPeerError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesScrollRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const BOTTOM_SCROLL_THRESHOLD_PX = 80

  const updateStickToBottomFromScroll = () => {
    const el = messagesScrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distance <= BOTTOM_SCROLL_THRESHOLD_PX
  }

  const supabase = useMemo(() => createClient(), [])
  const myId = currentUser?.id ?? ''
  const otherId = peer?.id ?? ''
  const backToTeamList =
    currentUser?.isAdmin || currentUser?.isModerator ? '/admin/messages' : '/message/contactos'

  useEffect(() => {
    if (!currentUser || !peerId || !UUID_RE.test(peerId)) return
    let cancelled = false
    const run = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return
        const marioRes = await fetch('/api/message/mario', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (marioRes.ok) {
          const mario = (await marioRes.json()) as { id: string }
          if (mario?.id === peerId) {
            router.replace('/message/mario')
            return
          }
        }
        const res = await fetch(`/api/message/peer/${peerId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          if (!cancelled) {
            setPeerError((j as { error?: string }).error ?? 'No se pudo abrir el chat')
            setPeer(null)
          }
          return
        }
        const data = (await res.json()) as PeerProfile
        if (!cancelled) {
          setPeer(data)
          setPeerError(null)
        }
      } catch {
        if (!cancelled) {
          setPeerError('Error al cargar el perfil')
          setPeer(null)
        }
      } finally {
        if (!cancelled) setPeerLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [currentUser, peerId, router, supabase.auth])

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
    stickToBottomRef.current = true
    void loadMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, otherId])

  useEffect(() => {
    if (!stickToBottomRef.current) return
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
          if (!isThisConversation) return
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]))

          const isIncoming = row.receiver_id === myId && row.sender_id !== myId
          const wantMessages =
            currentUser?.notificationPreference === 'messages_only' || currentUser?.notificationPreference === 'all'
          if (isIncoming && wantMessages && document.visibilityState !== 'visible') {
            showSystemNotification({
              title: 'Nuevo mensaje',
              body: `${peer?.name?.trim() || 'Alguien'} te envió un mensaje`,
              tag: `chat-${myId}-${otherId}`,
              url: `/message/${otherId}`,
            })
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, otherId, supabase, peer?.name, currentUser?.notificationPreference])

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

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">Iniciá sesión para chatear.</p>
            <Button onClick={() => router.push('/login')}>Ir a iniciar sesión</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!peerId || !UUID_RE.test(peerId)) {
    return (
      <DashboardLayout fillViewport>
        <div className="mx-auto w-full max-w-2xl flex-1 p-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(backToTeamList)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <p className="text-slate-500 dark:text-slate-400 mt-4">Enlace de chat inválido.</p>
        </div>
      </DashboardLayout>
    )
  }

  if (peerLoading) {
    return (
      <DashboardLayout fillViewport>
        <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 items-center justify-center py-20">
          <p className="text-slate-500 dark:text-slate-400">Cargando chat...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (peerError || !peer) {
    return (
      <DashboardLayout fillViewport>
        <div className="mx-auto w-full max-w-2xl flex-1 p-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(backToTeamList)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <p className="text-slate-500 dark:text-slate-400 mt-4">{peerError ?? 'No se pudo abrir esta conversación.'}</p>
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
    if (newMsg) {
      stickToBottomRef.current = true
      setMessages((prev) => [...prev, newMsg as ChatMessage])
    }
    setMessage('')
  }

  const displayName = peer.name ?? 'Equipo'
  const headerText = `Conversación con ${displayName}`

  return (
    <DashboardLayout fillViewport>
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => router.push(backToTeamList)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={peer.avatar_url ?? undefined} />
            <AvatarFallback className="text-sm">{displayName[0]?.toUpperCase() ?? '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 dark:text-white truncate">{displayName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{headerText}</p>
          </div>
        </div>

        <div
          ref={messagesScrollRef}
          onScroll={updateStickToBottomFromScroll}
          className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-800/30"
        >
          {loading ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-4">Cargando mensajes...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-4">
              No hay mensajes todavía. Escribí algo para iniciar la conversación.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg) => {
                const isMine = msg.sender_id === myId
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        isMine
                          ? 'bg-[#8B0015] text-white rounded-br-md'
                          : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-bl-md'
                      }`}
                    >
                      <MessageContent content={msg.content} variant={isMine ? 'light' : 'dark'} />
                      <p className={`text-xs mt-1 ${isMine ? 'text-[#F3C9D0]' : 'text-slate-500 dark:text-slate-400'}`}>
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
    </DashboardLayout>
  )
}
