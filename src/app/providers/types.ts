import type { NamedCategoryRow } from '@/lib/category-defaults'

/** Slug en `post_categories` (feed y /categoria/…). No confundir con publicidad_categories. */
export type Category = string

/** Slug en `publicidad_categories` (filtros en /cartelera). */
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

export type PostMediaKind = 'image' | 'video'

export interface PostMediaItem {
  url: string
  type: PostMediaKind
}

export interface Post {
  id: string
  title: string
  description: string
  category: Category
  proposedCategoryLabel?: string | null
  media: PostMediaItem[]
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
  heroTitle: string
  heroSubtitle: string
  heroReferentName: string
  heroReferentPhotoUrl: string
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

/** Autenticación y perfil (contexto independiente; preferí `useAuth()` si solo necesitás esto). */
export interface AuthContextType {
  currentUser: User | null
  authLoading: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  loginWithGoogle: () => Promise<boolean>
  loginWithFacebook: () => Promise<boolean>
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
  refreshUser: () => Promise<void>
  setNotificationPreference: (preference: NotificationPreference) => Promise<{ ok: boolean; error?: string }>
}

export interface RecentRegistrationsContextType {
  recentRegistrations: RegistrationNotification[]
}

export interface AppConfigContextType {
  config: AppConfig
  updateConfig: (newConfig: Partial<AppConfig>) => void
}

export interface CategoriesContextType {
  postCategories: NamedCategoryRow[]
  publicidadCategories: NamedCategoryRow[]
  refreshPostCategories: () => Promise<void>
  refreshPublicidadCategories: () => Promise<void>
}

/** Posts, comentarios, usuarios admin y operaciones de comunidad. */
export interface CommunityContextType {
  posts: Post[]
  postsLoading: boolean
  postsHasMore: boolean
  postsLoadingMore: boolean
  loadMorePosts: () => Promise<void>
  hydratePostFromServer: (postId: string) => Promise<boolean>
  refreshPosts: () => Promise<void>
  addPost: (
    post: Omit<Post, 'id' | 'authorId' | 'authorName' | 'authorAvatar' | 'status' | 'createdAt'>
  ) => Promise<{ ok: boolean; error?: string }>
  updatePostStatus: (postId: string, status: PostStatus, rejectedImages?: number[]) => void
  deletePost: (postId: string) => Promise<{ ok: boolean; error?: string }>

  comments: Comment[]
  commentCountByPostId: Record<string, number>
  loadCommentsForPost: (postId: string) => Promise<void>
  addComment: (postId: string, text: string) => Promise<{ ok: boolean; error?: string }>

  users: User[]
  toggleBlockUser: (userId: string) => void

  adminProfiles: AdminProfile[]
  adminProfilesLoading: boolean
  loadAdminProfiles: () => Promise<void>
  updateUserRole: (userId: string, role: 'viewer' | 'moderator' | 'admin') => Promise<{ ok: boolean; error?: string }>
  setUserSuspended: (userId: string, days: number | null) => Promise<{ ok: boolean; error?: string }>
  blockUser: (userId: string) => Promise<{ ok: boolean; error?: string }>
  unblockUser: (userId: string) => Promise<{ ok: boolean; error?: string }>
  deleteUser: (userId: string) => Promise<{ ok: boolean; error?: string }>
}

/** API unificada (varios contextos internos se fusionan en `useApp`). */
export type AppContextType = AuthContextType &
  RecentRegistrationsContextType &
  AppConfigContextType &
  CategoriesContextType &
  CommunityContextType
