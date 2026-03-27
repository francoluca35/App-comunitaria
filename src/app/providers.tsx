'use client'

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from './components/ui/sonner'
import { createClient } from '@/lib/supabase/client'
import { getSessionSafe, fetchProfileFromApi } from '@/lib/auth-api'
import { NotificationPreferenceModal } from '@/components/NotificationPreferenceModal'
import { RealtimeNotificationSubscriptions } from '@/components/RealtimeNotificationSubscriptions'
import {
  DEFAULT_POST_CATEGORIES,
  DEFAULT_PUBLICIDAD_CATEGORIES,
  type NamedCategoryRow,
} from '@/lib/category-defaults'

const NOTIFICATION_MODAL_DISMISSED_KEY = 'comunidad_notification_modal_dismissed'

/** Slug en `post_categories` (feed y /categoria/…). No confundir con publicidad_categories. */
export type Category = string

/** Slug en `publicidad_categories` (filtros en /publicidades). */
export type PublicidadCategorySlug = string

export type PostStatus = 'pending' | 'approved' | 'rejected'

/** Preferencia de notificaciones del usuario */
export type NotificationPreference = 'all' | 'custom' | 'messages_only'

export interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
  isBlocked: boolean
  avatar?: string
  isModerator?: boolean
  suspendedUntil?: string | null
  phone?: string
  province?: string
  locality?: string
  /** Preferencia de notificaciones. Null = aún no eligió (mostrar modal al iniciar sesión). */
  notificationPreference?: NotificationPreference | null
}

/** Perfil completo para admin (sin contraseña). */
export interface AdminProfile {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: string
  status: string
  birth_date: string | null
  phone: string | null
  province: string | null
  locality: string | null
  created_at: string
  updated_at: string
  suspended_until: string | null
}

export interface Post {
  id: string
  title: string
  description: string
  category: Category
  images: string[]
  authorId: string
  authorName: string
  authorAvatar?: string
  status: PostStatus
  createdAt: Date
  whatsappNumber?: string
}

export interface Comment {
  id: string
  postId: string
  authorId: string
  authorName: string
  authorAvatar?: string
  text: string
  createdAt: Date
}

export interface AppConfig {
  commentsEnabled: boolean
  whatsappEnabled: boolean
  maxPostsPerUser: number
  maxImagesPerPost: number
  termsOfService: string
}

/** Notificación de registro para admin (todos los datos excepto contraseña) */
export interface RegistrationNotification {
  id: string
  email: string
  name: string
  birthDate: string
  phone: string
  province: string
  locality: string
  createdAt: Date
}

interface AppContextType {
  currentUser: User | null
  authLoading: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  loginWithGoogle: () => Promise<boolean>
  logout: () => void | Promise<void>
  register: (data: {
    name: string
    birthDate: string
    phone: string
    province: string
    locality: string
    email: string
    password: string
  }) => Promise<{ ok: boolean; error?: string }>
  /** Vuelve a cargar el perfil desde la API (p. ej. tras subir avatar). */
  refreshUser: () => Promise<void>
  /** Guardar preferencia de notificaciones y refrescar usuario. */
  setNotificationPreference: (preference: NotificationPreference) => Promise<{ ok: boolean; error?: string }>
  /** Cerrar el modal de preferencias de notificaciones (sin guardar). */
  dismissNotificationPreferenceModal: () => void

  posts: Post[]
  postsLoading: boolean
  refreshPosts: () => Promise<void>
  addPost: (
    post: Omit<Post, 'id' | 'authorId' | 'authorName' | 'authorAvatar' | 'status' | 'createdAt'>
  ) => Promise<{ ok: boolean; error?: string }>
  updatePostStatus: (postId: string, status: PostStatus, rejectedImages?: number[]) => void
  deletePost: (postId: string) => void

  comments: Comment[]
  addComment: (postId: string, text: string) => void

  users: User[]
  toggleBlockUser: (userId: string) => void

  /** Lista completa de perfiles para admin (cargada al ser admin). */
  adminProfiles: AdminProfile[]
  adminProfilesLoading: boolean
  loadAdminProfiles: () => Promise<void>
  updateUserRole: (userId: string, role: 'viewer' | 'moderator' | 'admin') => Promise<{ ok: boolean; error?: string }>
  setUserSuspended: (userId: string, days: number | null) => Promise<{ ok: boolean; error?: string }>
  blockUser: (userId: string) => Promise<{ ok: boolean; error?: string }>
  unblockUser: (userId: string) => Promise<{ ok: boolean; error?: string }>
  deleteUser: (userId: string) => Promise<{ ok: boolean; error?: string }>

  /** Registros recientes para que el admin vea quién se registró (sin contraseña) */
  recentRegistrations: RegistrationNotification[]

  config: AppConfig
  updateConfig: (newConfig: Partial<AppConfig>) => void

  /** Categorías de publicaciones (desde API / Supabase). */
  postCategories: NamedCategoryRow[]
  /** Categorías de publicidad (filtros en /publicidades). */
  publicidadCategories: NamedCategoryRow[]
  refreshPostCategories: () => Promise<void>
  refreshPublicidadCategories: () => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Admin Usuario',
    email: 'admin@comunidad.com',
    isAdmin: true,
    isBlocked: false,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
  },
  {
    id: '2',
    name: 'María González',
    email: 'maria@example.com',
    isAdmin: false,
    isBlocked: false,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
  },
  {
    id: '3',
    name: 'Carlos Rodríguez',
    email: 'carlos@example.com',
    isAdmin: false,
    isBlocked: false,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
  },
  {
    id: '4',
    name: 'Ana Martínez',
    email: 'ana@example.com',
    isAdmin: false,
    isBlocked: false,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
  },
]

const MOCK_POSTS: Post[] = [
  {
    id: '1',
    title: 'Perro perdido en zona centro',
    description:
      'Busco a mi perro "Max", es un Golden Retriever de 3 años. Se perdió el día 5 de febrero cerca del parque central. Tiene collar azul con mi número de teléfono. Cualquier información será muy agradecida.',
    category: 'mascotas',
    images: ['https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=800&h=600&fit=crop'],
    authorId: '2',
    authorName: 'María González',
    authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    status: 'approved',
    createdAt: new Date('2026-02-05T10:00:00'),
    whatsappNumber: '+5491123456789',
  },
  {
    id: '2',
    title: 'Alerta: Corte de luz programado',
    description:
      'La empresa eléctrica informa que habrá un corte de luz programado el día sábado 8 de febrero de 9:00 a 14:00 hs en las calles principales del barrio. Se recomienda tomar precauciones.',
    category: 'alertas',
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop'],
    authorId: '1',
    authorName: 'Admin Usuario',
    authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    status: 'approved',
    createdAt: new Date('2026-02-06T14:30:00'),
  },
  {
    id: '3',
    title: 'Encontré llaves en la plaza',
    description:
      'Encontré un manojo de llaves con llavero azul en la plaza del barrio esta mañana. Tiene 4 llaves y una etiqueta con iniciales "JR". Si son tuyas, contactame.',
    category: 'objetos',
    images: ['https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&h=600&fit=crop'],
    authorId: '3',
    authorName: 'Carlos Rodríguez',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    status: 'approved',
    createdAt: new Date('2026-02-06T08:15:00'),
    whatsappNumber: '+5491134567890',
  },
  {
    id: '4',
    title: 'Reunión vecinal - Mejoras del barrio',
    description:
      'Se convoca a todos los vecinos a una reunión para discutir las próximas mejoras del barrio. Será el martes 11 de febrero a las 19:00 hs en el salón comunitario. Temas: seguridad, espacios verdes y mantenimiento.',
    category: 'avisos',
    images: ['https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop'],
    authorId: '4',
    authorName: 'Ana Martínez',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    status: 'approved',
    createdAt: new Date('2026-02-07T16:00:00'),
  },
  {
    id: '5',
    title: 'Nueva panadería en el barrio',
    description:
      'Abrió una nueva panadería artesanal en la esquina de Av. Principal y calle 5. Tienen pan casero, facturas y productos sin TACC. ¡Les recomiendo visitarlos!',
    category: 'noticias',
    images: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&h=600&fit=crop',
    ],
    authorId: '2',
    authorName: 'María González',
    authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    status: 'approved',
    createdAt: new Date('2026-02-07T11:20:00'),
  },
  {
    id: '6',
    title: 'Gato encontrado - busco dueño',
    description:
      'Encontré un gato gris con rayas blancas muy cariñoso. Parece estar bien cuidado así que seguro tiene dueño. Lo encontré en la calle 8. Temporalmente está en mi casa.',
    category: 'mascotas',
    images: ['https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&h=600&fit=crop'],
    authorId: '3',
    authorName: 'Carlos Rodríguez',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    status: 'pending',
    createdAt: new Date('2026-02-07T18:00:00'),
    whatsappNumber: '+5491134567890',
  },
  {
    id: '7',
    title: 'Precaución: Intento de robo reportado',
    description:
      'Vecinos de la cuadra 400 de calle 7 reportaron intento de robo anoche. Por favor estén atentos y reporten cualquier actividad sospechosa a la policía.',
    category: 'alertas',
    images: [],
    authorId: '4',
    authorName: 'Ana Martínez',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    status: 'pending',
    createdAt: new Date('2026-02-07T20:00:00'),
  },
]

const MOCK_COMMENTS: Comment[] = [
  {
    id: '1',
    postId: '1',
    authorId: '3',
    authorName: 'Carlos Rodríguez',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    text: 'Vi un perro similar cerca del parque esta mañana. Te envié mensaje por WhatsApp.',
    createdAt: new Date('2026-02-05T14:00:00'),
  },
  {
    id: '2',
    postId: '1',
    authorId: '2',
    authorName: 'María González',
    authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    text: 'Muchas gracias Carlos! Espero que sea él.',
    createdAt: new Date('2026-02-05T14:30:00'),
  },
  {
    id: '3',
    postId: '4',
    authorId: '3',
    authorName: 'Carlos Rodríguez',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    text: 'Excelente iniciativa! Ahí estaré.',
    createdAt: new Date('2026-02-07T17:00:00'),
  },
]

const DEFAULT_CONFIG: AppConfig = {
  commentsEnabled: true,
  whatsappEnabled: true,
  maxPostsPerUser: 5,
  maxImagesPerPost: 5,
  termsOfService:
    'Al publicar en esta plataforma, aceptas que tu contenido será moderado antes de ser visible públicamente. Prohibido contenido ofensivo, falso o ilegal.',
}

function profileToUser(profile: {
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
    notificationPreference: pref === 'all' || pref === 'custom' || pref === 'messages_only' ? pref : null,
  }
}

function adminProfileToUser(p: AdminProfile): User {
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
  }
}

/** Fallback cuando la tabla profiles falla (ej. 500): arma User desde la sesión. El rol admin solo viene de profiles. */
function userFromSession(user: { id: string; email?: string | null; user_metadata?: { name?: string } | null }): User {
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

/** Evita "Uncaught (in promise) AbortError" del cliente Supabase Auth (lock entre pestañas/requests). */
function useSuppressSupabaseAuthAbortError() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (event: PromiseRejectionEvent) => {
      const r = event?.reason
      const isAbort = r?.name === 'AbortError' || (typeof r?.message === 'string' && r.message.includes('Lock broken'))
      if (isAbort) event.preventDefault()
    }
    window.addEventListener('unhandledrejection', handler)
    return () => window.removeEventListener('unhandledrejection', handler)
  }, [])
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postCategories, setPostCategories] = useState<NamedCategoryRow[]>(DEFAULT_POST_CATEGORIES)
  const [publicidadCategories, setPublicidadCategories] =
    useState<NamedCategoryRow[]>(DEFAULT_PUBLICIDAD_CATEGORIES)

  const refreshPostCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories/posts')
      if (!res.ok) return
      const data = (await res.json()) as NamedCategoryRow[]
      if (Array.isArray(data) && data.length > 0) setPostCategories(data)
    } catch {
      // mantener defaults
    }
  }, [])

  const refreshPublicidadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories/publicidad')
      if (!res.ok) return
      const data = (await res.json()) as NamedCategoryRow[]
      if (Array.isArray(data) && data.length > 0) setPublicidadCategories(data)
    } catch {
      // mantener defaults
    }
  }, [])

  useEffect(() => {
    void refreshPostCategories()
    void refreshPublicidadCategories()
  }, [refreshPostCategories, refreshPublicidadCategories])
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS)
  const [users, setUsers] = useState<User[]>(MOCK_USERS)
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([])
  const [adminProfilesLoading, setAdminProfilesLoading] = useState(false)
  const [recentRegistrations, setRecentRegistrations] = useState<RegistrationNotification[]>([])
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [notificationModalDismissed, setNotificationModalDismissed] = useState(false)
  const [notificationPreferenceLoading, setNotificationPreferenceLoading] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  // Cargar "más tarde" del modal de notificaciones desde localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      setNotificationModalDismissed(window.localStorage.getItem(NOTIFICATION_MODAL_DISMISSED_KEY) === '1')
    } catch {
      // ignore
    }
  }, [])

  // Registrar service worker para PWA y notificaciones
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  useSuppressSupabaseAuthAbortError()

  useEffect(() => {
    let cancelled = false
    const loadSession = async () => {
      try {
        const { data: { session } } = await getSessionSafe(supabase)
        if (cancelled) return
        if (session?.user) {
          const profile = await fetchProfileFromApi(session.access_token)
          if (cancelled) return
          if (profile && profile.status !== 'blocked') {
            setCurrentUser(profileToUser(profile))
          } else {
            setCurrentUser(userFromSession(session.user))
          }
        }
      } catch (e) {
        console.error('Auth load error:', e)
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    }
    loadSession().catch(() => {})

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        try {
          if (!session?.user) {
            setCurrentUser(null)
            return
          }
          const profile = await fetchProfileFromApi(session.access_token)
          if (profile && profile.status !== 'blocked') {
            setCurrentUser(profileToUser(profile))
          } else {
            setCurrentUser(userFromSession(session.user))
          }
        } catch (e) {
          if (e instanceof Error && e.name === 'AbortError') return
          console.error('Auth state change error:', e)
        }
      })()
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    let cancelled = false
    const loadPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('id, title, description, category, status, whatsapp_number, created_at, author_id, profiles(name, avatar_url), post_media(url, position)')
          .order('created_at', { ascending: false })
        if (cancelled) return
        if (error) {
          setPosts(MOCK_POSTS)
          setPostsLoading(false)
          return
        }
        const mapped: Post[] = (data ?? []).map((row: unknown) => {
          const r = row as {
            id: string
            title: string
            description: string
            category: string
            status: string
            whatsapp_number: string | null
            created_at: string
            author_id: string
            profiles?: { name: string | null; avatar_url: string | null } | { name: string | null; avatar_url: string | null }[] | null
            post_media?: { url: string; position: number }[] | null
          }
          const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
          const media = Array.isArray(r.post_media) ? r.post_media : []
          const images = media.sort((a, b) => a.position - b.position).map((m) => m.url)
          return {
            id: r.id,
            title: r.title,
            description: r.description,
            category: r.category,
            images,
            authorId: r.author_id,
            authorName: profile?.name ?? r.author_id.slice(0, 8),
            authorAvatar: profile?.avatar_url ?? undefined,
            status: r.status as PostStatus,
            createdAt: new Date(r.created_at),
            whatsappNumber: r.whatsapp_number ?? undefined,
          }
        })
        setPosts(mapped)
      } catch {
        if (!cancelled) setPosts(MOCK_POSTS)
      } finally {
        if (!cancelled) setPostsLoading(false)
      }
    }
    loadPosts()
    return () => { cancelled = true }
  }, [supabase])

  // Realtime: lista de posts en vivo para admin/moderador (sin refrescar)
  useEffect(() => {
    if (!currentUser?.isAdmin && !currentUser?.isModerator) return
    const channel = supabase
      .channel('posts-live-admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const row = payload.new as { id: string }
        supabase
          .from('posts')
          .select('id, title, description, category, status, whatsapp_number, created_at, author_id, profiles(name, avatar_url), post_media(url, position)')
          .eq('id', row.id)
          .single()
          .then(({ data, error }) => {
            if (error || !data) return
            const r = data as {
              id: string
              title: string
              description: string
              category: string
              status: string
              whatsapp_number: string | null
              created_at: string
              author_id: string
              profiles?: { name: string | null; avatar_url: string | null } | { name: string | null; avatar_url: string | null }[] | null
              post_media?: { url: string; position: number }[] | null
            }
            const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
            const media = Array.isArray(r.post_media) ? r.post_media : []
            const images = media.sort((a: { position: number }, b: { position: number }) => a.position - b.position).map((m: { url: string }) => m.url)
            const newPost: Post = {
              id: r.id,
              title: r.title,
              description: r.description,
              category: r.category,
              images,
              authorId: r.author_id,
              authorName: profile?.name ?? r.author_id.slice(0, 8),
              authorAvatar: profile?.avatar_url ?? undefined,
              status: r.status as PostStatus,
              createdAt: new Date(r.created_at),
              whatsappNumber: r.whatsapp_number ?? undefined,
            }
            setPosts((prev) => [newPost, ...prev])
          })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        const row = payload.new as { id: string; status: string }
        setPosts((prev) =>
          prev.map((p) => (p.id === row.id ? { ...p, status: row.status as PostStatus } : p))
        )
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        const old = payload.old as { id: string }
        setPosts((prev) => prev.filter((p) => p.id !== old.id))
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser?.isAdmin, currentUser?.isModerator, supabase])

  const refreshPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, description, category, status, whatsapp_number, created_at, author_id, profiles(name, avatar_url), post_media(url, position)')
        .order('created_at', { ascending: false })
      if (error) return
      const mapped: Post[] = (data ?? []).map((row: unknown) => {
        const r = row as {
          id: string
          title: string
          description: string
          category: string
          status: string
          whatsapp_number: string | null
          created_at: string
          author_id: string
          profiles?: { name: string | null; avatar_url: string | null } | { name: string | null; avatar_url: string | null }[] | null
          post_media?: { url: string; position: number }[] | null
        }
        const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
        const media = Array.isArray(r.post_media) ? r.post_media : []
        const images = media.sort((a, b) => a.position - b.position).map((m) => m.url)
        return {
          id: r.id,
          title: r.title,
          description: r.description,
              category: r.category,
          images,
          authorId: r.author_id,
          authorName: profile?.name ?? r.author_id.slice(0, 8),
          authorAvatar: profile?.avatar_url ?? undefined,
          status: r.status as PostStatus,
          createdAt: new Date(r.created_at),
          whatsappNumber: r.whatsapp_number ?? undefined,
        }
      })
      setPosts(mapped)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!currentUser?.isAdmin) return
    let cancelled = false
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token || cancelled) return
      try {
        const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (!res.ok || cancelled) return
        const data: AdminProfile[] = await res.json()
        if (!cancelled) {
          setAdminProfiles(data)
          setUsers(data.map(adminProfileToUser))
        }
      } catch (e) {
        if (!cancelled) console.error('loadAdminProfiles error:', e)
      }
    }
    load()
    return () => { cancelled = true }
  }, [supabase, currentUser?.id, currentUser?.isAdmin])

  const loadAdminProfiles = async () => {
    if (!currentUser?.isAdmin) return
    setAdminProfilesLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (!res.ok) return
      const data: AdminProfile[] = await res.json()
      setAdminProfiles(data)
      setUsers(data.map(adminProfileToUser))
    } finally {
      setAdminProfilesLoading(false)
    }
  }

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }

  const updateUserRole = async (userId: string, role: 'viewer' | 'moderator' | 'admin'): Promise<{ ok: boolean; error?: string }> => {
    const headers = await getAuthHeaders()
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      return { ok: false, error: (j as { error?: string }).error ?? res.statusText }
    }
    await loadAdminProfiles()
    return { ok: true }
  }

  const setUserSuspended = async (userId: string, days: number | null): Promise<{ ok: boolean; error?: string }> => {
    const headers = await getAuthHeaders()
    const suspended_until =
      days === null || days <= 0
        ? null
        : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ suspended_until }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      return { ok: false, error: (j as { error?: string }).error ?? res.statusText }
    }
    await loadAdminProfiles()
    return { ok: true }
  }

  const blockUser = async (userId: string): Promise<{ ok: boolean; error?: string }> => {
    const headers = await getAuthHeaders()
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ status: 'blocked' }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      return { ok: false, error: (j as { error?: string }).error ?? res.statusText }
    }
    await loadAdminProfiles()
    return { ok: true }
  }

  const unblockUser = async (userId: string): Promise<{ ok: boolean; error?: string }> => {
    const headers = await getAuthHeaders()
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ status: 'active' }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      return { ok: false, error: (j as { error?: string }).error ?? res.statusText }
    }
    await loadAdminProfiles()
    return { ok: true }
  }

  const deleteUser = async (userId: string): Promise<{ ok: boolean; error?: string }> => {
    const headers = await getAuthHeaders()
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers: { ...headers } })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      return { ok: false, error: (j as { error?: string }).error ?? res.statusText }
    }
    await loadAdminProfiles()
    return { ok: true }
  }

  const login = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const maxLoginRetries = 3
    let data: { user: unknown; session: { access_token: string } } | null = null
    let error: { message?: string; status?: number } | null = null

    for (let attempt = 0; attempt < maxLoginRetries; attempt++) {
      try {
        const result = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })
        data = result.data as { user: unknown; session: { access_token: string } } | null
        error = result.error as { message?: string; status?: number } | null
        break
      } catch (e) {
        const isAbort = e instanceof Error && e.name === 'AbortError'
        if (!isAbort) return { ok: false, error: 'Error de conexión. Revisá tu internet e intentá de nuevo.' }
        if (attempt < maxLoginRetries - 1) await new Promise((r) => setTimeout(r, 450))
        else return { ok: false, error: 'Intentá de nuevo (cierra otras pestañas de la app o esperá un momento).' }
      }
    }

    if (error) {
      const status = error.status
      const msg = (error.message ?? '').toLowerCase()
      if (status === 500) {
        return { ok: false, error: 'Error del servidor. Intentá de nuevo en unos minutos o creá el usuario desde la app (Registrarse).' }
      }
      if (status === 429 || msg.includes('429') || msg.includes('rate limit') || msg.includes('too many')) {
        return { ok: false, error: 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.' }
      }
      if (status === 400 || msg.includes('invalid login') || msg.includes('invalid')) {
        return { ok: false, error: 'Email o contraseña incorrectos' }
      }
      if (msg.includes('email not confirmed') || msg.includes('confirm')) {
        return { ok: false, error: 'Confirmá tu email antes de iniciar sesión (revisá la bandeja de entrada)' }
      }
      return { ok: false, error: error.message || 'Error al iniciar sesión' }
    }
    if (!data?.user) return { ok: false, error: 'Error al iniciar sesión' }

    const u = data.user as { id: string; email?: string | null; user_metadata?: { name?: string } | null }
    setCurrentUser(userFromSession(u))

    const token = data.session?.access_token
    if (token) {
      const profile = await fetchProfileFromApi(token)
      if (profile?.status === 'blocked') {
        await supabase.auth.signOut().catch(() => {})
        setCurrentUser(null)
        return { ok: false, error: 'Usuario bloqueado.' }
      }
      if (profile) setCurrentUser(profileToUser(profile))
    }

    return { ok: true }
  }

  const loginWithGoogle = async (): Promise<boolean> => {
    const { error } = await supabase.auth
      .signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      })
      .catch(() => ({ error: { message: 'AbortError' } }))
    return !error
  }

  const logout = async () => {
    setCurrentUser(null)
    const maxRetries = 3
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await supabase.auth.signOut()
        return
      } catch (e) {
        const isAbort = e instanceof Error && e.name === 'AbortError'
        if (!isAbort) return
        if (attempt < maxRetries - 1) await new Promise((r) => setTimeout(r, 400))
      }
    }
  }

  const refreshUser = async () => {
    try {
      const { data: { session } } = await getSessionSafe(supabase)
      if (!session?.user) return
      const profile = await fetchProfileFromApi(session.access_token)
      if (profile && profile.status !== 'blocked') {
        setCurrentUser(profileToUser(profile))
      } else {
        setCurrentUser(userFromSession(session.user))
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      console.error('Refresh user error:', e)
    }
  }

  const setNotificationPreference = useCallback(
    async (preference: NotificationPreference): Promise<{ ok: boolean; error?: string }> => {
      setNotificationPreferenceLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return { ok: false, error: 'Sesión expirada' }
        const res = await fetch('/api/profile/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ notification_preference: preference }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          return { ok: false, error: (j as { error?: string }).error ?? res.statusText }
        }
        if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'default') {
          await window.Notification.requestPermission()
        }
        await refreshUser()
        return { ok: true }
      } catch (e) {
        return { ok: false, error: 'Error de conexión' }
      } finally {
        setNotificationPreferenceLoading(false)
      }
    },
    [supabase]
  )

  const dismissNotificationPreferenceModal = useCallback(() => {
    setNotificationModalDismissed(true)
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(NOTIFICATION_MODAL_DISMISSED_KEY, '1')
    } catch {
      // ignore
    }
  }, [])

  const register = async (data: {
    name: string
    birthDate: string
    phone: string
    province: string
    locality: string
    email: string
    password: string
  }): Promise<{ ok: boolean; error?: string }> => {
    const email = data.email.trim().toLowerCase()
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password: data.password,
        options: {
          data: {
            name: data.name.trim() || undefined,
            birth_date: data.birthDate || undefined,
            phone: data.phone.trim() || undefined,
            province: data.province.trim() || undefined,
            locality: data.locality.trim() || undefined,
          },
        },
      }).catch((e) => {
        if (e?.name === 'AbortError') return { data: null, error: { message: 'AbortError' } as Error }
        throw e
      })

      if (error) {
        const msg = (error.message ?? '').toLowerCase()
        if (msg === 'aborterror') return { ok: false, error: 'Intentá de nuevo (sesión en uso en otra pestaña).' }
        const status = (error as { status?: number }).status
        if (status === 429 || msg.includes('429') || msg.includes('rate limit') || msg.includes('too many')) {
          return { ok: false, error: 'Demasiados intentos de registro. Esperá unos minutos (o 1 hora para el mismo email) e intentá de nuevo.' }
        }
        if (status === 500) {
          return { ok: false, error: 'Error del servidor. Intentá de nuevo en unos minutos.' }
        }
        if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('already been')) {
          return { ok: false, error: 'Ese email ya está registrado. Iniciá sesión o usá otro email.' }
        }
        return { ok: false, error: error.message || 'Error al crear la cuenta' }
      }

      if (!signUpData?.user) return { ok: false, error: 'Error al crear la cuenta' }

      const uid = signUpData.user.id
      const uEmail = signUpData.user.email ?? email
      const displayName = (data.name.trim() || signUpData.user.email || '').trim() || uEmail

      let userForContext: User
      const token = signUpData.session?.access_token
      if (token) {
        const profile = await fetchProfileFromApi(token)
        userForContext = profile && profile.status !== 'blocked'
          ? profileToUser(profile)
          : { id: uid, email: uEmail, name: displayName, isAdmin: false, isBlocked: false, avatar: undefined }
      } else {
        userForContext = { id: uid, email: uEmail, name: displayName, isAdmin: false, isBlocked: false, avatar: undefined }
      }
      setCurrentUser(userForContext)
      // Notificación para admin: quién se registró, con todos los datos excepto contraseña
      setRecentRegistrations((prev) => [
        {
          id: uid,
          email: uEmail,
          name: data.name.trim() || uEmail,
          birthDate: data.birthDate || '',
          phone: data.phone.trim() || '',
          province: data.province.trim() || '',
          locality: data.locality.trim() || '',
          createdAt: new Date(),
        },
        ...prev,
      ])
      return { ok: true }
    } catch {
      return { ok: false, error: 'Error de conexión. Revisá tu internet e intentá de nuevo.' }
    }
  }

  const addPost = async (
    post: Omit<Post, 'id' | 'authorId' | 'authorName' | 'authorAvatar' | 'status' | 'createdAt'>
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!currentUser) return { ok: false, error: 'Debes iniciar sesión' }
    if (currentUser.suspendedUntil && new Date(currentUser.suspendedUntil) > new Date()) {
      return { ok: false, error: 'Tu cuenta está suspendida. No podés publicar hasta que se cumpla la fecha indicada.' }
    }

    const status: PostStatus = currentUser.isAdmin ? 'approved' : 'pending'

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          author_id: currentUser.id,
          title: post.title.trim(),
          description: post.description.trim(),
          category: post.category,
          status,
          whatsapp_number: post.whatsappNumber?.trim() || null,
        })
        .select('id, created_at')
        .single()

      if (error) {
        return { ok: false, error: error.message ?? 'Error al guardar la publicación' }
      }

      const imageUrls = post.images ?? []
      if (imageUrls.length > 0) {
        const mediaResults = await Promise.all(
          imageUrls.map((url, position) =>
            supabase.from('post_media').insert({
              post_id: data.id,
              url,
              type: 'image',
              position,
            })
          )
        )
        const mediaError = mediaResults.find((r) => r.error)
        if (mediaError?.error) {
          await supabase.from('posts').delete().eq('id', data.id)
          return { ok: false, error: mediaError.error.message ?? 'Error al guardar las imágenes' }
        }
      }

      const newPost: Post = {
        ...post,
        id: data.id,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorAvatar: currentUser.avatar,
        status,
        createdAt: new Date(data.created_at),
        images: imageUrls,
      }
      setPosts((prev) => [newPost, ...prev])
      return { ok: true }
    } catch (e) {
      return { ok: false, error: 'Error de conexión. Intentá de nuevo.' }
    }
  }

  const updatePostStatus = async (postId: string, status: PostStatus, _rejectedImages?: number[]) => {
    await supabase.from('posts').update({ status, updated_at: new Date().toISOString() }).eq('id', postId)
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, status } : post
      )
    )
  }

  const deletePost = async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId)
    setPosts((prev) => prev.filter((p) => p.id !== postId))
    setComments((prev) => prev.filter((c) => c.postId !== postId))
  }

  const addComment = (postId: string, text: string) => {
    if (!currentUser || !config.commentsEnabled) return
    if (currentUser.suspendedUntil && new Date(currentUser.suspendedUntil) > new Date()) return

    const newComment: Comment = {
      id: Date.now().toString(),
      postId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      text,
      createdAt: new Date(),
    }

    setComments([...comments, newComment])
  }

  const toggleBlockUser = (userId: string) => {
    setUsers(users.map((user) => (user.id === userId ? { ...user, isBlocked: !user.isBlocked } : user)))
  }

  const updateConfig = (newConfig: Partial<AppConfig>) => {
    setConfig({ ...config, ...newConfig })
  }

  const value: AppContextType = {
    currentUser,
    authLoading,
    login,
    loginWithGoogle,
    logout,
    register,
    refreshUser,
    setNotificationPreference,
    dismissNotificationPreferenceModal,
    posts,
    postsLoading,
    refreshPosts,
    addPost,
    updatePostStatus,
    deletePost,
    comments,
    addComment,
    users,
    toggleBlockUser,
    adminProfiles,
    adminProfilesLoading,
    loadAdminProfiles,
    updateUserRole,
    setUserSuspended,
    blockUser,
    unblockUser,
    deleteUser,
    recentRegistrations,
    config,
    updateConfig,
    postCategories,
    publicidadCategories,
    refreshPostCategories,
    refreshPublicidadCategories,
  }

  const showNotificationPreferenceModal =
    !!currentUser &&
    (currentUser.notificationPreference === undefined || currentUser.notificationPreference === null) &&
    !notificationModalDismissed

  return (
    <AppContext.Provider value={value}>
      {children}
      <RealtimeNotificationSubscriptions />
      <NotificationPreferenceModal
        open={showNotificationPreferenceModal}
        onSelect={async (pref) => {
          const result = await setNotificationPreference(pref)
          if (result.ok) dismissNotificationPreferenceModal()
        }}
        onDismiss={dismissNotificationPreferenceModal}
        loading={notificationPreferenceLoading}
      />
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <AppProvider>
        {children}
        <Toaster />
      </AppProvider>
    </ThemeProvider>
  )
}
