'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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

interface ChatMessage {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
}

interface SupportProfile {
  id: string
  name: string | null
  avatar_url: string | null
}

export default function ChatPage() {
  const router = useRouter()
  const { currentUser } = useApp()
  const [support, setSupport] = useState<SupportProfile | null>(null)
  const [supportLoading, setSupportLoading] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const myId = currentUser?.id ?? ''
  const otherId = support?.id ?? ''

  useEffect(() => {
    if (!currentUser) return
    let cancelled = false
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token || cancelled) return
        const res = await fetch('/api/chat/support', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok || cancelled) {
          if (res.status === 404) setSupport(null)
          return
        }
        const data: SupportProfile = await res.json()
        if (!cancelled) setSupport(data)
      } catch (e) {
        if (!cancelled) toast.error('Error al cargar soporte')
      } finally {
        if (!cancelled) setSupportLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [currentUser?.id, supabase])

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
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, otherId])

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
            <p className="text-gray-600 dark:text-gray-400 mb-4">Iniciá sesión para chatear con soporte.</p>
            <Button onClick={() => router.push('/login')}>Ir a iniciar sesión</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  useEffect(() => {
    if (currentUser?.isAdmin) router.replace('/admin/messages')
  }, [currentUser?.isAdmin, router])

  if (currentUser?.isAdmin) {
    return (
      <DashboardLayout>
        <div className="w-full max-w-2xl mx-auto flex items-center justify-center py-20">
          <p className="text-slate-500 dark:text-slate-400">Redirigiendo al panel de mensajes...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (supportLoading) {
    return (
      <DashboardLayout>
        <div className="w-full max-w-2xl mx-auto flex items-center justify-center py-20">
          <p className="text-slate-500 dark:text-slate-400">Cargando chat...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!support) {
    return (
      <DashboardLayout>
        <div className="w-full max-w-2xl mx-auto p-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <p className="text-slate-500 dark:text-slate-400 mt-4">No hay soporte disponible en este momento. Volvé más tarde.</p>
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

  const displayName = support.name ?? 'Soporte'

  return (
    <DashboardLayout>
      <div className="w-full max-w-2xl mx-auto flex flex-col h-[calc(100vh-6rem)]">
        <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={support.avatar_url ?? undefined} />
            <AvatarFallback className="text-sm">{displayName[0]?.toUpperCase() ?? 'S'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 dark:text-white truncate">{displayName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Chat con soporte</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-800/30">
          {loading ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-4">Cargando mensajes...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-4">No hay mensajes todavía. Escribí algo para iniciar la conversación con soporte.</p>
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
    </DashboardLayout>
  )
}
