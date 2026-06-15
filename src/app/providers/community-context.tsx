'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { MOCK_USERS } from '@/app/providers/constants'
import { filterUuids } from '@/lib/uuid'
import {
  dedupePostsById,
  mapSupabasePostRow,
  POSTS_FEED_PAGE_SIZE,
  POSTS_SELECT,
  type SupabasePostRow,
} from '@/app/providers/post-mapper'
import { adminProfileToUser } from '@/app/providers/user-mapper'
import { commentCountsFromRpcRows } from '@/app/providers/comment-counts'
import { useAuth } from '@/app/providers/auth-context'
import { useAppConfig } from '@/app/providers/app-config-context'
import { compressImagesForCommunityUpload, storageExtensionFromFile } from '@/lib/compress-upload-image'
import { buildSupabasePublicStorageUrl, ensureStorageObjectPublicUrl } from '@/lib/storage-image'
import { assertStoredMediaLimit } from '@/lib/media-upload-limits'
import { canViewAllPostsForModeration } from '@/lib/post-admin-permissions'
import { formatCommunityRateLimitError } from '@/lib/supabase-rate-limit'
import {
	ADMIN_USERS_PAGE_SIZE,
	ADMIN_USERS_SEARCH_LIMIT,
	fetchAdminUsersList,
	type AdminUsersListQuery,
} from '@/lib/admin-users-api'
import type {
  AdminProfile,
  Comment,
  CommunityContextType,
  Post,
  PostReactionSummary,
  PostReactionType,
  PostStatus,
  User,
} from '@/app/providers/types'

const CommunityContext = createContext<CommunityContextType | undefined>(undefined)

export function CommunityProvider({ children }: { children: ReactNode }) {
  const { currentUser, authLoading } = useAuth()
  const { config } = useAppConfig()
  const supabase = useMemo(() => createClient(), [])

  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsHasMore, setPostsHasMore] = useState(false)
  const [postsLoadingMore, setPostsLoadingMore] = useState(false)
  const feedNextOffsetRef = useRef(0)
  const currentUserRef = useRef<User | null>(null)
  const postsRef = useRef<Post[]>([])
  const postsHasMoreRef = useRef(false)
  const loadMoreInFlightRef = useRef(false)
  const configRef = useRef(config)

  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    postsRef.current = posts
  }, [posts])

  useEffect(() => {
    postsHasMoreRef.current = postsHasMore
  }, [postsHasMore])

  const [comments, setComments] = useState<Comment[]>([])
  const [commentCountByPostId, setCommentCountByPostId] = useState<Record<string, number>>({})
  const [postReactionSummaryByPostId, setPostReactionSummaryByPostId] = useState<Record<string, PostReactionSummary>>({})
  const [myReactionByPostId, setMyReactionByPostId] = useState<Record<string, PostReactionType | undefined>>({})
  const fetchedCommentCountIdsRef = useRef<Set<string>>(new Set())
  const fetchedReactionPostIdsRef = useRef<Set<string>>(new Set())
  const commentCountsRpcUnavailableRef = useRef(false)
  const reactionUserIdRef = useRef<string | null>(null)
  const [users, setUsers] = useState<User[]>(MOCK_USERS)
  const [adminUsersTotal, setAdminUsersTotal] = useState(0)
  const [adminBlockedUsersTotal, setAdminBlockedUsersTotal] = useState(0)
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([])
  const [adminProfilesPage, setAdminProfilesPage] = useState(1)
  const [adminProfilesTotalPages, setAdminProfilesTotalPages] = useState(1)
  const [adminProfilesTotal, setAdminProfilesTotal] = useState(0)
  const [adminProfilesLoading, setAdminProfilesLoading] = useState(false)
  const adminListQueryRef = useRef<AdminUsersListQuery>({
    page: 1,
    pageSize: ADMIN_USERS_PAGE_SIZE,
    search: '',
    role: 'all',
    status: 'all',
    order: 'newest',
  })

  const uploadCommentImage = useCallback(
    async (userId: string, file: File): Promise<string> => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Configuración de Storage no disponible')
      const [compressed] = await compressImagesForCommunityUpload([file])
      if (!compressed) throw new Error('No se pudo procesar la imagen')
      assertStoredMediaLimit(compressed, file.name)
      const ext = storageExtensionFromFile(compressed)
      const path = `${userId}/comments/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('publicaciones').upload(path, compressed, {
        upsert: false,
        contentType: compressed.type || 'image/jpeg',
      })
      if (error) throw error
      return buildSupabasePublicStorageUrl('publicaciones', path)
    },
    [supabase]
  )

  const fetchPostsIntoState = useCallback(
    async (showLoading: boolean, isCancelled?: () => boolean) => {
      const bail = () => isCancelled?.() ?? false
      if (showLoading) setPostsLoading(true)
      feedNextOffsetRef.current = 0
      try {
        const u = currentUserRef.current
        if (canViewAllPostsForModeration(u)) {
          const { data, error } = await supabase
            .from('posts')
            .select(POSTS_SELECT)
            .order('created_at', { ascending: false })
            .range(0, POSTS_FEED_PAGE_SIZE - 1)
          if (bail()) return
          if (error) {
            console.error('fetchPosts (staff):', error.message)
            if (showLoading) {
              setPosts([])
              setPostsHasMore(false)
            }
            return
          }
          const mapped = (data ?? []).map((row) => mapSupabasePostRow(row as SupabasePostRow))
          if (bail()) return
          setPosts(dedupePostsById(mapped))
          feedNextOffsetRef.current = mapped.length
          setPostsHasMore(mapped.length === POSTS_FEED_PAGE_SIZE)
          return
        }

        const { data, error } = await supabase
          .from('posts')
          .select(POSTS_SELECT)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .range(0, POSTS_FEED_PAGE_SIZE - 1)

        if (bail()) return
        if (error) {
          console.error('fetchPosts:', error.message)
          if (showLoading) {
            setPosts([])
            setPostsHasMore(false)
          }
          return
        }

        let list = (data ?? []).map((row) => mapSupabasePostRow(row as SupabasePostRow))
        feedNextOffsetRef.current = list.length
        setPostsHasMore(list.length === POSTS_FEED_PAGE_SIZE)

        if (u?.id) {
          const { data: mine, error: mineErr } = await supabase
            .from('posts')
            .select(POSTS_SELECT)
            .eq('author_id', u.id)
            .in('status', ['pending', 'rejected'])
            .order('created_at', { ascending: false })
            .limit(20)
          if (bail()) return
          if (!mineErr && mine?.length) {
            const mineMapped = mine.map((row) => mapSupabasePostRow(row as SupabasePostRow))
            list = dedupePostsById([...mineMapped, ...list])
          }
        }

        if (bail()) return
        setPosts(list)
      } catch (e) {
        console.error('fetchPosts:', e)
        if (showLoading) {
          setPosts([])
          setPostsHasMore(false)
        }
      } finally {
        if (showLoading && !bail()) setPostsLoading(false)
      }
    },
    [supabase]
  )

  const loadMorePosts = useCallback(async () => {
    if (loadMoreInFlightRef.current || !postsHasMoreRef.current) return
    loadMoreInFlightRef.current = true
    setPostsLoadingMore(true)
    try {
      const from = feedNextOffsetRef.current
      const to = from + POSTS_FEED_PAGE_SIZE - 1
      const u = currentUserRef.current
      let q = supabase
        .from('posts')
        .select(POSTS_SELECT)
        .order('created_at', { ascending: false })
        .range(from, to)
      if (!canViewAllPostsForModeration(u)) {
        q = q.eq('status', 'approved')
      }
      const { data, error } = await q
      if (error) return
      const mapped = (data ?? []).map((row) => mapSupabasePostRow(row as SupabasePostRow))
      feedNextOffsetRef.current = from + mapped.length
      setPostsHasMore(mapped.length === POSTS_FEED_PAGE_SIZE)
      setPosts((prev) => dedupePostsById([...prev, ...mapped]))
    } finally {
      loadMoreInFlightRef.current = false
      setPostsLoadingMore(false)
    }
  }, [supabase])

  const hydratePostFromServer = useCallback(
    async (postId: string) => {
      if (postsRef.current.some((p) => p.id === postId)) return true
      const { data, error } = await supabase.from('posts').select(POSTS_SELECT).eq('id', postId).maybeSingle()
      if (error || !data) return false
      const mapped = mapSupabasePostRow(data as SupabasePostRow)
      setPosts((prev) => (prev.some((p) => p.id === mapped.id) ? prev : dedupePostsById([...prev, mapped])))
      return true
    },
    [supabase]
  )

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    void fetchPostsIntoState(true, () => cancelled)
    return () => {
      cancelled = true
    }
  }, [
    authLoading,
    fetchPostsIntoState,
    currentUser?.id,
    currentUser?.isAdmin,
    currentUser?.isAdminMaster,
    currentUser?.isModerator,
  ])

  useEffect(() => {
    if (!canViewAllPostsForModeration(currentUser)) return
    const channel = supabase
      .channel('posts-live-admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const row = payload.new as { id: string }
        supabase
          .from('posts')
          .select(POSTS_SELECT)
          .eq('id', row.id)
          .single()
          .then(({ data, error }) => {
            if (error || !data) return
            const newPost = mapSupabasePostRow(data as SupabasePostRow)
            setPosts((prev) => (prev.some((p) => p.id === newPost.id) ? prev : [newPost, ...prev]))
          })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        const row = payload.new as {
          id: string
          status?: string
          category?: string
          proposed_category_label?: string | null
        }
        setPosts((prev) =>
          prev.map((p) =>
            p.id === row.id
              ? {
                  ...p,
                  ...(row.status !== undefined && { status: row.status as PostStatus }),
                  ...(row.category !== undefined && { category: row.category }),
                  ...(row.proposed_category_label !== undefined && {
                    proposedCategoryLabel: row.proposed_category_label ?? undefined,
                  }),
                }
              : p
          )
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
  }, [currentUser?.isAdmin, currentUser?.isAdminMaster, currentUser?.isModerator, supabase])

  const refreshCommentCountsForPostIds = useCallback(
    async (postIds: string[]) => {
      const unique = filterUuids([...new Set(postIds)])
      if (unique.length === 0) return
      const CHUNK = 100
      try {
        const merged: Record<string, number> = {}
        for (let i = 0; i < unique.length; i += CHUNK) {
          const chunk = unique.slice(i, i + CHUNK)
          let usedFallback = false
          if (!commentCountsRpcUnavailableRef.current) {
            const { data: rpcRows, error: rpcError } = await supabase.rpc('comment_counts_for_posts', {
              p_post_ids: chunk,
            })
            if (!rpcError && Array.isArray(rpcRows)) {
              Object.assign(merged, commentCountsFromRpcRows(rpcRows))
            } else {
              usedFallback = true
              const msg = (rpcError?.message ?? '').toLowerCase()
              if (msg.includes('not found') || msg.includes('404') || msg.includes('does not exist')) {
                commentCountsRpcUnavailableRef.current = true
              }
              if (rpcError && !commentCountsRpcUnavailableRef.current) {
                console.warn('comment_counts_for_posts (RPC):', rpcError.message)
              }
            }
          } else {
            usedFallback = true
          }

          if (usedFallback) {
            const { data: rows, error } = await supabase.from('comments').select('post_id').in('post_id', chunk)
            if (error) {
              console.warn('refreshCommentCountsForPostIds (fallback):', error.message)
            } else {
              const counts: Record<string, number> = {}
              for (const row of rows ?? []) {
                const pid = String((row as { post_id: string }).post_id)
                counts[pid] = (counts[pid] ?? 0) + 1
              }
              for (const pid of chunk) merged[pid] = counts[pid] ?? 0
            }
          }
        }
        setCommentCountByPostId((prev) => {
          const next = { ...prev }
          for (const id of unique) {
            next[id] = merged[id] ?? 0
          }
          return next
        })
      } catch (e) {
        console.warn('refreshCommentCountsForPostIds', e)
      }
    },
    [supabase]
  )

  const postIdsKey = useMemo(
    () => [...new Set(posts.map((p) => p.id))].sort().join(','),
    [posts]
  )

  const refreshPostReactionsForPostIds = useCallback(
    async (postIds: string[]) => {
      const unique = filterUuids([...new Set(postIds)])
      if (unique.length === 0) return
      const { data, error } = await supabase
        .from('post_reactions')
        .select('post_id, user_id, reaction_type')
        .in('post_id', unique)
      if (error) {
        const msg = (error.message ?? '').toLowerCase()
        if (!msg.includes('does not exist') && !msg.includes('schema cache')) {
          console.warn('refreshPostReactionsForPostIds:', error.message)
        }
        return
      }

      const summary: Record<string, PostReactionSummary> = {}
      const mine: Record<string, PostReactionType | undefined> = {}
      const myId = currentUserRef.current?.id
      for (const id of unique) summary[id] = { like: 0, love: 0 }
      for (const row of (data ?? []) as { post_id: string; user_id: string; reaction_type: string }[]) {
        if (row.reaction_type !== 'like' && row.reaction_type !== 'love') continue
        const current = summary[row.post_id] ?? { like: 0, love: 0 }
        current[row.reaction_type] += 1
        summary[row.post_id] = current
        if (myId && row.user_id === myId) mine[row.post_id] = row.reaction_type
      }

      setPostReactionSummaryByPostId((prev) => ({ ...prev, ...summary }))
      setMyReactionByPostId((prev) => ({ ...prev, ...mine }))
    },
    [supabase]
  )

  useEffect(() => {
    const currentUserId = currentUser?.id ?? null
    if (reactionUserIdRef.current !== currentUserId) {
      reactionUserIdRef.current = currentUserId
      fetchedReactionPostIdsRef.current.clear()
      setMyReactionByPostId({})
    }
    const ids = postIdsKey ? postIdsKey.split(',').filter(Boolean) : []
    const allow = new Set(ids)

    for (const id of [...fetchedCommentCountIdsRef.current]) {
      if (!allow.has(id)) fetchedCommentCountIdsRef.current.delete(id)
    }

    setCommentCountByPostId((prev) => {
      const next: Record<string, number> = {}
      for (const id of ids) {
        if (Object.prototype.hasOwnProperty.call(prev, id)) next[id] = prev[id]!
      }
      return next
    })

    const newIds = ids.filter((id) => !fetchedCommentCountIdsRef.current.has(id))
    for (const id of newIds) fetchedCommentCountIdsRef.current.add(id)
    if (newIds.length > 0) void refreshCommentCountsForPostIds(newIds)
  }, [postIdsKey, refreshCommentCountsForPostIds])

  useEffect(() => {
    const ids = postIdsKey ? postIdsKey.split(',').filter(Boolean) : []
    const allow = new Set(ids)
    for (const id of [...fetchedReactionPostIdsRef.current]) {
      if (!allow.has(id)) fetchedReactionPostIdsRef.current.delete(id)
    }
    setPostReactionSummaryByPostId((prev) => {
      const next: Record<string, PostReactionSummary> = {}
      for (const id of ids) {
        if (Object.prototype.hasOwnProperty.call(prev, id)) next[id] = prev[id]!
      }
      return next
    })
    setMyReactionByPostId((prev) => {
      const next: Record<string, PostReactionType | undefined> = {}
      for (const id of ids) {
        if (Object.prototype.hasOwnProperty.call(prev, id)) next[id] = prev[id]
      }
      return next
    })
    const newIds = ids.filter((id) => !fetchedReactionPostIdsRef.current.has(id))
    for (const id of newIds) fetchedReactionPostIdsRef.current.add(id)
    if (newIds.length > 0) void refreshPostReactionsForPostIds(newIds)
  }, [postIdsKey, currentUser?.id, refreshPostReactionsForPostIds])

  const loadCommentsForPost = useCallback(
    async (postId: string) => {
      try {
        let data: unknown[] | null = null
        let error: { message?: string } | null = null

        const withImage = await supabase
          .from('comments')
          .select('id, post_id, author_id, text, image_url, created_at, profiles!comments_author_id_fkey(name, avatar_url)')
          .eq('post_id', postId)
          .order('created_at', { ascending: false })
          .limit(30)

        if (withImage.error) {
          const fallback = await supabase
            .from('comments')
            .select('id, post_id, author_id, text, created_at, profiles!comments_author_id_fkey(name, avatar_url)')
            .eq('post_id', postId)
            .order('created_at', { ascending: false })
            .limit(30)
          data = fallback.data as unknown[] | null
          error = fallback.error as { message?: string } | null
        } else {
          data = withImage.data as unknown[] | null
          error = null
        }

        if (error) {
          console.warn('loadCommentsForPost:', error.message)
          return
        }
        const mapped: Comment[] = [...(data ?? [])].reverse().map((row: unknown) => {
          const r = row as {
            id: string
            post_id: string
            author_id: string
            text: string
            image_url?: string | null
            created_at: string
            profiles?: { name: string | null; avatar_url: string | null } | { name: string | null; avatar_url: string | null }[] | null
          }
          const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
          return {
            id: String(r.id),
            postId: String(r.post_id),
            authorId: String(r.author_id),
            authorName: profile?.name?.trim() || 'Usuario',
            authorAvatar: profile?.avatar_url ? ensureStorageObjectPublicUrl(profile.avatar_url) : undefined,
            text: r.text,
            imageUrl: r.image_url ? ensureStorageObjectPublicUrl(r.image_url) : undefined,
            likeCount: 0,
            likedByMe: false,
            createdAt: new Date(r.created_at),
          }
        })
        const commentIds = mapped.map((c) => c.id)
        if (commentIds.length > 0) {
          const { data: likesRows, error: likesError } = await supabase
            .from('comment_likes')
            .select('comment_id, user_id')
            .in('comment_id', commentIds)
          if (!likesError && Array.isArray(likesRows)) {
            const likeCountByCommentId: Record<string, number> = {}
            const likedByMe = new Set<string>()
            for (const row of likesRows as { comment_id: string; user_id: string }[]) {
              likeCountByCommentId[row.comment_id] = (likeCountByCommentId[row.comment_id] ?? 0) + 1
              if (currentUserRef.current?.id && row.user_id === currentUserRef.current.id) {
                likedByMe.add(row.comment_id)
              }
            }
            for (const comment of mapped) {
              comment.likeCount = likeCountByCommentId[comment.id] ?? 0
              comment.likedByMe = likedByMe.has(comment.id)
            }
          }
        }
        setComments((prev) => {
          const rest = prev.filter((c) => c.postId !== postId)
          return [...rest, ...mapped].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        })
      } catch (e) {
        console.warn('loadCommentsForPost', e)
      }
    },
    [supabase]
  )

  const refreshPosts = useCallback(async () => {
    await fetchPostsIntoState(false)
  }, [fetchPostsIntoState])

  const canLoadAdminProfiles = currentUser?.isAdmin || currentUser?.isAdminMaster

  const loadAdminUsersStats = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) return

    const [allRes, blockedRes] = await Promise.all([
      fetchAdminUsersList(session.access_token, { page: 1, pageSize: 1 }),
      fetchAdminUsersList(session.access_token, { page: 1, pageSize: 1, status: 'blocked' }),
    ])

    if (!('error' in allRes)) setAdminUsersTotal(allRes.total)
    if (!('error' in blockedRes)) setAdminBlockedUsersTotal(blockedRes.total)
  }, [supabase])

  const loadAdminProfiles = useCallback(
    async (
      overrides?: Partial<{
        page: number
        search: string
        role: AdminUsersListQuery['role']
        status: AdminUsersListQuery['status']
        order: AdminUsersListQuery['order']
      }>
    ) => {
      if (!canLoadAdminProfiles) return
      setAdminProfilesLoading(true)
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.access_token) return

        const query: AdminUsersListQuery = {
          ...adminListQueryRef.current,
          ...overrides,
          pageSize: ADMIN_USERS_PAGE_SIZE,
        }
        adminListQueryRef.current = query

        const result = await fetchAdminUsersList(session.access_token, query)
        if ('error' in result) {
          console.error('loadAdminProfiles error:', result.error)
          return
        }

        setAdminProfiles(result.users)
        setAdminProfilesPage(result.page)
        setAdminProfilesTotalPages(result.totalPages)
        setAdminProfilesTotal(result.total)
      } finally {
        setAdminProfilesLoading(false)
      }
    },
    [supabase, canLoadAdminProfiles]
  )

  const searchAdminProfiles = useCallback(
    async (search: string): Promise<AdminProfile[]> => {
      if (!canLoadAdminProfiles) return []
      const q = search.trim()
      if (!q) return []

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) return []

      const result = await fetchAdminUsersList(session.access_token, {
        page: 1,
        pageSize: ADMIN_USERS_SEARCH_LIMIT,
        search: q,
      })
      if ('error' in result) return []
      return result.users
    },
    [supabase, canLoadAdminProfiles]
  )

  const fetchAdminProfilesByIds = useCallback(
    async (ids: string[]): Promise<AdminProfile[]> => {
      if (!canLoadAdminProfiles || ids.length === 0) return []

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) return []

      const result = await fetchAdminUsersList(session.access_token, {
        page: 1,
        pageSize: ADMIN_USERS_PAGE_SIZE,
        ids: ids.join(','),
      })
      if ('error' in result) return []
      return result.users
    },
    [supabase, canLoadAdminProfiles]
  )

  useEffect(() => {
    if (!canLoadAdminProfiles) return
    let cancelled = false
    const load = async () => {
      if (cancelled) return
      await loadAdminUsersStats()
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [supabase, currentUser?.id, canLoadAdminProfiles, loadAdminUsersStats])

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  const updateUserRole = useCallback(
    async (
      userId: string,
      role: 'viewer' | 'moderator' | 'admin' | 'admin_master'
    ): Promise<{ ok: boolean; error?: string }> => {
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
      await loadAdminUsersStats()
      return { ok: true }
    },
    [getAuthHeaders, loadAdminProfiles]
  )

  const setUserSuspended = useCallback(
    async (userId: string, days: number | null): Promise<{ ok: boolean; error?: string }> => {
      const headers = await getAuthHeaders()
      const suspended_until =
        days === null || days <= 0 ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
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
      await loadAdminUsersStats()
      return { ok: true }
    },
    [getAuthHeaders, loadAdminProfiles]
  )

  const blockUser = useCallback(
    async (userId: string): Promise<{ ok: boolean; error?: string }> => {
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
      await loadAdminUsersStats()
      return { ok: true }
    },
    [getAuthHeaders, loadAdminProfiles]
  )

  const unblockUser = useCallback(
    async (userId: string): Promise<{ ok: boolean; error?: string }> => {
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
      await loadAdminUsersStats()
      return { ok: true }
    },
    [getAuthHeaders, loadAdminProfiles]
  )

  const deleteUser = useCallback(
    async (userId: string): Promise<{ ok: boolean; error?: string }> => {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers: { ...headers } })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        return { ok: false, error: (j as { error?: string }).error ?? res.statusText }
      }
      await loadAdminProfiles()
      await loadAdminUsersStats()
      return { ok: true }
    },
    [getAuthHeaders, loadAdminProfiles]
  )

  const addPost = useCallback(
    async (
      post: Omit<Post, 'id' | 'authorId' | 'authorName' | 'authorAvatar' | 'status' | 'createdAt'>
    ): Promise<{ ok: boolean; error?: string }> => {
      const u = currentUserRef.current
      if (!u) return { ok: false, error: 'Debes iniciar sesión' }
      if (u.suspendedUntil && new Date(u.suspendedUntil) > new Date()) {
        return { ok: false, error: 'Tu cuenta está suspendida. No podés publicar hasta que se cumpla la fecha indicada.' }
      }

      if (post.category === 'alertas' && !(u.isAdmin || u.isAdminMaster)) {
        return {
          ok: false,
          error: 'Solo administradores pueden publicar alertas. Informá a Mario por el chat.',
        }
      }

      const isProposedCategory = post.category === 'propuesta' && Boolean(post.proposedCategoryLabel?.trim())
      const isVenta = post.category === 'venta'
      const status: PostStatus =
        isProposedCategory || isVenta ? 'pending' : u.isAdmin ? 'approved' : 'pending'

      try {
        const { data, error } = await supabase
          .from('posts')
          .insert({
            author_id: u.id,
            title: post.title.trim(),
            description: post.description.trim(),
            category: post.category,
            status,
            whatsapp_number: post.whatsappNumber?.trim() || null,
            proposed_category_label: post.proposedCategoryLabel?.trim() || null,
            sale_subcategory: post.saleSubcategory?.trim() || null,
            sale_price: post.salePrice?.trim() || null,
          })
          .select('id, created_at')
          .single()

        if (error) {
          return {
            ok: false,
            error: formatCommunityRateLimitError(error.message) ?? error.message ?? 'Error al guardar la publicación',
          }
        }

        const mediaItems = post.media ?? []
        if (mediaItems.length > 0) {
          const mediaResults = await Promise.all(
            mediaItems.map((item, position) =>
              supabase.from('post_media').insert({
                post_id: data.id,
                url: item.url,
                type: item.type,
                position,
              })
            )
          )
          const mediaError = mediaResults.find((r) => r.error)
          if (mediaError?.error) {
            const headers = await getAuthHeaders()
            if (headers.Authorization) {
              await fetch(`/api/posts/${encodeURIComponent(data.id)}`, {
                method: 'DELETE',
                headers,
              })
            } else {
              await supabase.from('posts').delete().eq('id', data.id)
            }
            return { ok: false, error: mediaError.error.message ?? 'Error al guardar fotos o videos' }
          }
        }

        const newPost: Post = {
          ...post,
          id: data.id,
          authorId: u.id,
          authorName: u.name,
          authorAvatar: u.avatar,
          status,
          createdAt: new Date(data.created_at),
          media: mediaItems,
          proposedCategoryLabel: post.proposedCategoryLabel?.trim() || undefined,
          saleSubcategory: post.saleSubcategory?.trim() || undefined,
          salePrice: post.salePrice?.trim() || undefined,
        }
        setPosts((prev) => (prev.some((p) => p.id === newPost.id) ? prev : [newPost, ...prev]))
        return { ok: true }
      } catch {
        return { ok: false, error: 'Error de conexión. Intentá de nuevo.' }
      }
    },
    [getAuthHeaders, supabase]
  )

  const updatePost = useCallback(
    async (
      postId: string,
      patch: {
        title: string
        description: string
        whatsappNumber?: string | null
        saleSubcategory?: string | null
        salePrice?: string | null
      }
    ): Promise<{ ok: boolean; error?: string }> => {
      const headers = await getAuthHeaders()
      if (!headers.Authorization) return { ok: false, error: 'Sesión expirada' }

      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: patch.title,
          description: patch.description,
          whatsappNumber: patch.whatsappNumber,
          saleSubcategory: patch.saleSubcategory,
          salePrice: patch.salePrice,
        }),
      })
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        post?: {
          title?: string
          description?: string
          whatsappNumber?: string
          saleSubcategory?: string
          salePrice?: string
        }
      }
      if (!res.ok) return { ok: false, error: j.error ?? res.statusText }

      const updated = j.post
      if (updated) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  title: updated.title ?? p.title,
                  description: updated.description ?? p.description,
                  whatsappNumber: updated.whatsappNumber ?? p.whatsappNumber,
                  saleSubcategory:
                    updated.saleSubcategory !== undefined ? updated.saleSubcategory : p.saleSubcategory,
                  salePrice: updated.salePrice !== undefined ? updated.salePrice : p.salePrice,
                }
              : p
          )
        )
      }
      return { ok: true }
    },
    [getAuthHeaders]
  )

  const updatePostStatus = useCallback(
    async (postId: string, status: PostStatus, rejectedImages?: number[]): Promise<{ ok: boolean; error?: string }> => {
      const headers = await getAuthHeaders()
      if (!headers.Authorization) return { ok: false, error: 'Sesión expirada' }

      const res = await fetch('/api/moderation/post-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ postId, status, rejectedImages }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        return { ok: false, error: data.error ?? 'No se pudo actualizar la publicación' }
      }

      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post
          const nextMedia =
            status === 'approved' && rejectedImages?.length
              ? post.media.filter((_, index) => !rejectedImages.includes(index))
              : post.media
          return { ...post, status, media: nextMedia }
        })
      )
      return { ok: true }
    },
    [getAuthHeaders]
  )

  const deletePost = useCallback(
    async (postId: string) => {
      const headers = await getAuthHeaders()
      if (!headers.Authorization) return { ok: false, error: 'Sesión expirada' }

      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
        method: 'DELETE',
        headers,
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) return { ok: false, error: data.error ?? 'No se pudo eliminar la publicación' }

      setPosts((prev) => prev.filter((p) => p.id !== postId))
      setComments((prev) => prev.filter((c) => c.postId !== postId))
      fetchedCommentCountIdsRef.current.delete(postId)
      setCommentCountByPostId((prev) => {
        const next = { ...prev }
        delete next[postId]
        return next
      })
      return { ok: true }
    },
    [getAuthHeaders]
  )

  const setPostReaction = useCallback(
    async (postId: string, reaction: PostReactionType | null): Promise<{ ok: boolean; error?: string }> => {
      const u = currentUserRef.current
      if (!u) return { ok: false, error: 'Debés iniciar sesión para reaccionar' }
      const previous = myReactionByPostId[postId]

      if (reaction === null) {
        const { error } = await supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', u.id)
        if (error) return { ok: false, error: error.message ?? 'No se pudo quitar la reacción' }
      } else {
        const { error } = await supabase.from('post_reactions').upsert(
          {
            post_id: postId,
            user_id: u.id,
            reaction_type: reaction,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'post_id,user_id' }
        )
        if (error) {
          return {
            ok: false,
            error: formatCommunityRateLimitError(error.message) ?? error.message ?? 'No se pudo guardar la reacción',
          }
        }
      }

      setMyReactionByPostId((prev) => ({ ...prev, [postId]: reaction ?? undefined }))
      setPostReactionSummaryByPostId((prev) => {
        const current = prev[postId] ?? { like: 0, love: 0 }
        const next = { ...current }
        if (previous) next[previous] = Math.max(0, next[previous] - 1)
        if (reaction) next[reaction] += 1
        return { ...prev, [postId]: next }
      })
      return { ok: true }
    },
    [myReactionByPostId, supabase]
  )

  const addComment = useCallback(
    async (postId: string, text: string, imageFile?: File | null): Promise<{ ok: boolean; error?: string }> => {
      const u = currentUserRef.current
      const cfg = configRef.current
      if (!u || !cfg.commentsEnabled) return { ok: false, error: 'Comentarios deshabilitados' }
      if (u.suspendedUntil && new Date(u.suspendedUntil) > new Date()) {
        return { ok: false, error: 'Tu cuenta no puede comentar por el momento' }
      }
      const trimmed = text.trim()
      if (!trimmed && !imageFile) return { ok: false, error: 'Escribí un comentario o agregá una imagen' }
      let imageUrl: string | null = null
      if (imageFile) {
        try {
          imageUrl = await uploadCommentImage(u.id, imageFile)
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'No se pudo subir la imagen'
          return { ok: false, error: msg }
        }
      }

      let data: unknown = null
      let error: { message?: string } | null = null

      const withImageInsert = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: u.id,
          text: trimmed || '',
          image_url: imageUrl,
        })
        .select('id, post_id, author_id, text, image_url, created_at, profiles!comments_author_id_fkey(name, avatar_url)')
        .single()

      if (withImageInsert.error) {
        const fallbackInsert = await supabase
          .from('comments')
          .insert({
            post_id: postId,
            author_id: u.id,
            text: trimmed || '',
          })
          .select('id, post_id, author_id, text, created_at, profiles!comments_author_id_fkey(name, avatar_url)')
          .single()
        data = fallbackInsert.data
        error = fallbackInsert.error as { message?: string } | null
      } else {
        data = withImageInsert.data
        error = null
      }

      if (error) {
        return {
          ok: false,
          error: formatCommunityRateLimitError(error.message) ?? error.message ?? 'No se pudo publicar el comentario',
        }
      }

      const r = data as {
        id: string
        post_id: string
        author_id: string
        text: string
        image_url?: string | null
        created_at: string
        profiles?: { name: string | null; avatar_url: string | null } | { name: string | null; avatar_url: string | null }[] | null
      }
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
      const newComment: Comment = {
        id: String(r.id),
        postId: String(r.post_id),
        authorId: String(r.author_id),
        authorName: profile?.name?.trim() || u.name,
        authorAvatar: profile?.avatar_url
          ? ensureStorageObjectPublicUrl(profile.avatar_url)
          : u.avatar,
        text: r.text,
        imageUrl: r.image_url ? ensureStorageObjectPublicUrl(r.image_url) : undefined,
        likeCount: 0,
        likedByMe: false,
        createdAt: new Date(r.created_at),
      }
      setComments((prev) =>
        [...prev, newComment].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      )
      setCommentCountByPostId((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? 0) + 1,
      }))
      return { ok: true }
    },
    [supabase, uploadCommentImage]
  )

  const toggleCommentLike = useCallback(
    async (commentId: string): Promise<{ ok: boolean; error?: string }> => {
      const u = currentUserRef.current
      if (!u) return { ok: false, error: 'Debés iniciar sesión para dar me gusta' }
      const target = comments.find((c) => c.id === commentId)
      if (!target) return { ok: false, error: 'Comentario no encontrado' }
      if (target.likedByMe) {
        const { error } = await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', u.id)
        if (error) return { ok: false, error: error.message ?? 'No se pudo quitar el me gusta' }
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId ? { ...c, likedByMe: false, likeCount: Math.max(0, c.likeCount - 1) } : c
          )
        )
        return { ok: true }
      }
      const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: u.id })
      if (error) return { ok: false, error: error.message ?? 'No se pudo registrar el me gusta' }
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, likedByMe: true, likeCount: c.likeCount + 1 } : c))
      )
      return { ok: true }
    },
    [comments, supabase]
  )

  const deleteComment = useCallback(
    async (commentId: string): Promise<{ ok: boolean; error?: string }> => {
      const target = comments.find((c) => c.id === commentId)
      if (!target) return { ok: false, error: 'Comentario no encontrado' }

      const headers = await getAuthHeaders()
      if (!headers.Authorization) return { ok: false, error: 'Sesión expirada' }

      const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
        method: 'DELETE',
        headers,
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) return { ok: false, error: data.error ?? 'No se pudo eliminar el comentario' }

      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setCommentCountByPostId((prev) => ({
        ...prev,
        [target.postId]: Math.max(0, (prev[target.postId] ?? 0) - 1),
      }))
      return { ok: true }
    },
    [comments, getAuthHeaders]
  )

  const reportComment = useCallback(
    async (commentId: string, reason?: string): Promise<{ ok: boolean; error?: string }> => {
      const u = currentUserRef.current
      if (!u) return { ok: false, error: 'Debés iniciar sesión para reportar' }
      const target = comments.find((c) => c.id === commentId)
      if (!target) return { ok: false, error: 'Comentario no encontrado' }
      const cleanedReason = (reason ?? '').trim()
      const { error } = await supabase.from('comment_reports').insert({
        comment_id: target.id,
        post_id: target.postId,
        reporter_id: u.id,
        reason: cleanedReason || null,
      })
      if (error) {
        const msg = error.message ?? ''
        if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
          return { ok: false, error: 'Ya reportaste este comentario' }
        }
        return { ok: false, error: msg || 'No se pudo reportar el comentario' }
      }
      return { ok: true }
    },
    [comments, supabase]
  )

  const toggleBlockUser = useCallback((userId: string) => {
    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, isBlocked: !user.isBlocked } : user)))
  }, [])

  const value = useMemo<CommunityContextType>(
    () => ({
      posts,
      postsLoading,
      postsHasMore,
      postsLoadingMore,
      postReactionSummaryByPostId,
      myReactionByPostId,
      loadMorePosts,
      hydratePostFromServer,
      refreshPosts,
      addPost,
      updatePost,
      updatePostStatus,
      deletePost,
      setPostReaction,
      comments,
      commentCountByPostId,
      loadCommentsForPost,
      addComment,
      deleteComment,
      reportComment,
      toggleCommentLike,
      users,
      toggleBlockUser,
      adminUsersTotal,
      adminBlockedUsersTotal,
      adminProfiles,
      adminProfilesPage,
      adminProfilesTotalPages,
      adminProfilesTotal,
      adminProfilesLoading,
      loadAdminProfiles,
      searchAdminProfiles,
      fetchAdminProfilesByIds,
      updateUserRole,
      setUserSuspended,
      blockUser,
      unblockUser,
      deleteUser,
    }),
    [
      posts,
      postsLoading,
      postsHasMore,
      postsLoadingMore,
      postReactionSummaryByPostId,
      myReactionByPostId,
      loadMorePosts,
      hydratePostFromServer,
      refreshPosts,
      addPost,
      updatePost,
      updatePostStatus,
      deletePost,
      setPostReaction,
      comments,
      commentCountByPostId,
      loadCommentsForPost,
      addComment,
      deleteComment,
      reportComment,
      toggleCommentLike,
      users,
      toggleBlockUser,
      adminUsersTotal,
      adminBlockedUsersTotal,
      adminProfiles,
      adminProfilesPage,
      adminProfilesTotalPages,
      adminProfilesTotal,
      adminProfilesLoading,
      loadAdminProfiles,
      searchAdminProfiles,
      fetchAdminProfilesByIds,
      updateUserRole,
      setUserSuspended,
      blockUser,
      unblockUser,
      deleteUser,
    ]
  )

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>
}

export function useCommunity() {
  const ctx = useContext(CommunityContext)
  if (!ctx) throw new Error('useCommunity must be used within CommunityProvider')
  return ctx
}
