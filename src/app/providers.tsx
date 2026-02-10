'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from './components/ui/sonner'

export type Category = 'mascotas' | 'alertas' | 'avisos' | 'objetos' | 'noticias'

export type PostStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
  isBlocked: boolean
  avatar?: string
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

interface AppContextType {
  currentUser: User | null
  login: (email: string, password: string) => boolean
  loginWithGoogle: () => boolean
  logout: () => void
  register: (email: string, password: string, name: string) => boolean

  posts: Post[]
  addPost: (
    post: Omit<Post, 'id' | 'authorId' | 'authorName' | 'authorAvatar' | 'status' | 'createdAt'>
  ) => void
  updatePostStatus: (postId: string, status: PostStatus, rejectedImages?: number[]) => void
  deletePost: (postId: string) => void

  comments: Comment[]
  addComment: (postId: string, text: string) => void

  users: User[]
  toggleBlockUser: (userId: string) => void

  config: AppConfig
  updateConfig: (newConfig: Partial<AppConfig>) => void
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS)
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS)
  const [users, setUsers] = useState<User[]>(MOCK_USERS)
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)

  const login = (email: string, password: string): boolean => {
    const user = users.find((u) => u.email === email && !u.isBlocked)
    if (user) {
      setCurrentUser(user)
      return true
    }
    return false
  }

  const loginWithGoogle = (): boolean => {
    const user = users.find((u) => u.id === '2')
    if (user) {
      setCurrentUser(user)
      return true
    }
    return false
  }

  const logout = () => {
    setCurrentUser(null)
  }

  const register = (email: string, password: string, name: string): boolean => {
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      isAdmin: false,
      isBlocked: false,
    }
    setUsers([...users, newUser])
    setCurrentUser(newUser)
    return true
  }

  const addPost = (
    post: Omit<Post, 'id' | 'authorId' | 'authorName' | 'authorAvatar' | 'status' | 'createdAt'>
  ) => {
    if (!currentUser) return

    const newPost: Post = {
      ...post,
      id: Date.now().toString(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      status: 'pending',
      createdAt: new Date(),
    }

    setPosts([newPost, ...posts])
  }

  const updatePostStatus = (postId: string, status: PostStatus, rejectedImages?: number[]) => {
    setPosts(
      posts.map((post) => {
        if (post.id === postId) {
          const updatedPost = { ...post, status }

          if (rejectedImages && rejectedImages.length > 0) {
            updatedPost.images = post.images.filter((_, index) => !rejectedImages.includes(index))
          }

          return updatedPost
        }
        return post
      })
    )
  }

  const deletePost = (postId: string) => {
    setPosts(posts.filter((p) => p.id !== postId))
    setComments(comments.filter((c) => c.postId !== postId))
  }

  const addComment = (postId: string, text: string) => {
    if (!currentUser || !config.commentsEnabled) return

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
    login,
    loginWithGoogle,
    logout,
    register,
    posts,
    addPost,
    updatePostStatus,
    deletePost,
    comments,
    addComment,
    users,
    toggleBlockUser,
    config,
    updateConfig,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
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
