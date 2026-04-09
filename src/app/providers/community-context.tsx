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
import { MOCK_POSTS, MOCK_USERS } from '@/app/providers/constants'
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
import type {
  AdminProfile,
  Comment,
  CommunityContextType,
  Post,
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
  const fetchedCommentCountIdsRef = useRef<Set<string>>(new Set())
  const [users, setUsers] = useState<User[]>(MOCK_USERS)
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([])
  const [adminProfilesLoading, setAdminProfilesLoading] = useState(false)

  const fetchPostsIntoState = useCallback(
    async (showLoading: boolean, isCancelled?: () => boolean) => {
      const bail = () => isCancelled?.() ?? false
      if (showLoading) setPostsLoading(true)
      feedNextOffsetRef.current = 0
      try {
        const u = currentUserRef.current
        if (u?.isAdmin || u?.isModerator) {
          const { data, error } = await supabase
            .from('posts')
            .select(POSTS_SELECT)
            .order('created_at', { ascending: false })
          if (bail()) return
          if (error) {
            if (showLoading) {
              setPosts(MOCK_POSTS)
              setPostsHasMore(false)
            }
            return
          }
          const mapped = (data ?? []).map((row) => mapSupabasePostRow(row as SupabasePostRow))
          if (bail()) return
          setPosts(dedupePostsById(mapped))
          feedNextOffsetRef.current = mapped.length
          setPostsHasMore(false)
          return
        }

        const { data, error } = await supabase
          .from('posts')
          .select(POSTS_SELECT)
          .order('created_at', { ascending: false })
          .range(0, POSTS_FEED_PAGE_SIZE - 1)

        if (bail()) return
        if (error) {
          if (showLoading) {
            setPosts(MOCK_POSTS)
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
            .order('created_at', { ascending: false })
          if (bail()) return
          if (!mineErr && mine?.length) {
            const mineMapped = mine.map((row) => mapSupabasePostRow(row as SupabasePostRow))
            list = dedupePostsById([...mineMapped, ...list])
          }
        }

        if (bail()) return
        setPosts(list)
      } catch {
        if (showLoading) {
          setPosts(MOCK_POSTS)
          setPostsHasMore(false)
        }
      } finally {
        if (showLoading && !bail()) setPostsLoading(false)
      }
    },
    [supabase]
  )

  const loadMorePosts = useCallback(async () => {
    const u = currentUserRef.current
    if (u?.isAdmin || u?.isModerator) return
    if (loadMoreInFlightRef.current || !postsHasMoreRef.current) return
    loadMoreInFlightRef.current = true
    setPostsLoadingMore(true)
    try {
      const from = feedNextOffsetRef.current
      const to = from + POSTS_FEED_PAGE_SIZE - 1
      const { data, error } = await supabase
        .from('posts')
        .select(POSTS_SELECT)
        .order('created_at', { ascending: false })
        .range(from, to)
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
  }, [authLoading, fetchPostsIntoState, currentUser?.id, currentUser?.isAdmin, currentUser?.isModerator])

  useEffect(() => {
    if (!currentUser?.isAdmin && !currentUser?.isModerator) return
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
  }, [currentUser?.isAdmin, currentUser?.isModerator, supabase])

  const refreshCommentCountsForPostIds = useCallback(
    async (postIds: string[]) => {
      const unique = [...new Set(postIds)].filter(Boolean)
      if (unique.length === 0) return
      const CHUNK = 100
      try {
        const merged: Record<string, number> = {}
        for (let i = 0; i < unique.length; i += CHUNK) {
          const chunk = unique.slice(i, i + CHUNK)
          const { data: rpcRows, error: rpcError } = await supabase.rpc('comment_counts_for_posts', {
            p_post_ids: chunk,
          })
          if (!rpcError && Array.isArray(rpcRows)) {
            Object.assign(merged, commentCountsFromRpcRows(rpcRows))
          } else {
            if (rpcError) console.warn('comment_counts_for_posts (RPC):', rpcError.message)
            const { data, error } = await supabase.from('comments').select('post_id').in('post_id', chunk)
            if (error) {
              console.warn('refreshCommentCountsForPostIds (fallback):', error.message)
              continue
            }
            for (const row of data ?? []) {
              const pid = String((row as { post_id: string }).post_id)
              merged[pid] = (merged[pid] ?? 0) + 1
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

  useEffect(() => {
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

  const loadCommentsForPost = useCallback(
    async (postId: string) => {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('id, post_id, author_id, text, created_at, profiles(name, avatar_url)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true })
        if (error) {
          console.warn('loadCommentsForPost:', error.message)
          return
        }
        const mapped: Comment[] = (data ?? []).map((row: unknown) => {
          const r = row as {
            id: string
            post_id: string
            author_id: string
            text: string
            created_at: string
            profiles?: { name: string | null; avatar_url: string | null } | { name: string | null; avatar_url: string | null }[] | null
          }
          const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
          return {
            id: String(r.id),
            postId: String(r.post_id),
            authorId: String(r.author_id),
            authorName: profile?.name?.trim() || 'Usuario',
            authorAvatar: profile?.avatar_url ?? undefined,
            text: r.text,
            createdAt: new Date(r.created_at),
          }
        })
        setComments((prev) => {
          const rest = prev.filter((c) => c.postId !== postId)
          return [...rest, ...mapped].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        })
        setCommentCountByPostId((prev) => ({ ...prev, [postId]: mapped.length }))
      } catch (e) {
        console.warn('loadCommentsForPost', e)
      }
    },
    [supabase]
  )

  const refreshPosts = useCallback(async () => {
    await fetchPostsIntoState(false)
  }, [fetchPostsIntoState])

  useEffect(() => {
    if (!currentUser?.isAdmin) return
    let cancelled = false
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
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
    return () => {
      cancelled = true
    }
  }, [supabase, currentUser?.id, currentUser?.isAdmin])

  const loadAdminProfiles = useCallback(async () => {
    if (!currentUser?.isAdmin) return
    setAdminProfilesLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (!res.ok) return
      const data: AdminProfile[] = await res.json()
      setAdminProfiles(data)
      setUsers(data.map(adminProfileToUser))
    } finally {
      setAdminProfilesLoading(false)
    }
  }, [supabase, currentUser?.isAdmin])

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  const updateUserRole = useCallback(
    async (userId: string, role: 'viewer' | 'moderator' | 'admin'): Promise<{ ok: boolean; error?: string }> => {
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

      const isProposedCategory = post.category === 'propuesta' && Boolean(post.proposedCategoryLabel?.trim())
      const status: PostStatus = isProposedCategory ? 'pending' : u.isAdmin ? 'approved' : 'pending'

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
          })
          .select('id, created_at')
          .single()

        if (error) {
          return { ok: false, error: error.message ?? 'Error al guardar la publicación' }
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
            await supabase.from('posts').delete().eq('id', data.id)
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
        }
        setPosts((prev) => (prev.some((p) => p.id === newPost.id) ? prev : [newPost, ...prev]))
        return { ok: true }
      } catch {
        return { ok: false, error: 'Error de conexión. Intentá de nuevo.' }
      }
    },
    [supabase]
  )

  const updatePostStatus = useCallback(
    async (postId: string, status: PostStatus, _rejectedImages?: number[]) => {
      await supabase.from('posts').update({ status, updated_at: new Date().toISOString() }).eq('id', postId)
      setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, status } : post)))
    },
    [supabase]
  )

  const deletePost = useCallback(
    async (postId: string) => {
      const { error } = await supabase.from('posts').delete().eq('id', postId)
      if (error) return { ok: false, error: error.message }
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
    [supabase]
  )

  const addComment = useCallback(
    async (postId: string, text: string): Promise<{ ok: boolean; error?: string }> => {
      const u = currentUserRef.current
      const cfg = configRef.current
      if (!u || !cfg.commentsEnabled) return { ok: false, error: 'Comentarios deshabilitados' }
      if (u.suspendedUntil && new Date(u.suspendedUntil) > new Date()) {
        return { ok: false, error: 'Tu cuenta no puede comentar por el momento' }
      }
      const trimmed = text.trim()
      if (!trimmed) return { ok: false, error: 'Escribí un comentario' }

      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: u.id,
          text: trimmed,
        })
        .select('id, post_id, author_id, text, created_at, profiles(name, avatar_url)')
        .single()

      if (error) {
        return { ok: false, error: error.message ?? 'No se pudo publicar el comentario' }
      }

      const r = data as {
        id: string
        post_id: string
        author_id: string
        text: string
        created_at: string
        profiles?: { name: string | null; avatar_url: string | null } | { name: string | null; avatar_url: string | null }[] | null
      }
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
      const newComment: Comment = {
        id: String(r.id),
        postId: String(r.post_id),
        authorId: String(r.author_id),
        authorName: profile?.name?.trim() || u.name,
        authorAvatar: profile?.avatar_url ?? u.avatar,
        text: r.text,
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
    [supabase]
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
      loadMorePosts,
      hydratePostFromServer,
      refreshPosts,
      addPost,
      updatePostStatus,
      deletePost,
      comments,
      commentCountByPostId,
      loadCommentsForPost,
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
    }),
    [
      posts,
      postsLoading,
      postsHasMore,
      postsLoadingMore,
      loadMorePosts,
      hydratePostFromServer,
      refreshPosts,
      addPost,
      updatePostStatus,
      deletePost,
      comments,
      commentCountByPostId,
      loadCommentsForPost,
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
    ]
  )

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>
}

export function useCommunity() {
  const ctx = useContext(CommunityContext)
  if (!ctx) throw new Error('useCommunity must be used within CommunityProvider')
  return ctx
}
