import type { Post, PostMediaItem, PostStatus } from './types'

export function normalizePostMediaRows(
  rows: { url: string; position: number; type?: string | null }[] | null | undefined
): PostMediaItem[] {
  const list = Array.isArray(rows) ? rows : []
  return [...list]
    .sort((a, b) => a.position - b.position)
    .map((m) => ({
      url: m.url,
      type: m.type === 'video' ? 'video' : 'image',
    }))
}

/** Un solo post por id (evita duplicados si addPost y realtime INSERT agregan la misma fila). */
export function dedupePostsById(posts: Post[]): Post[] {
  const seen = new Set<string>()
  const out: Post[] = []
  for (const p of posts) {
    if (seen.has(p.id)) continue
    seen.add(p.id)
    out.push(p)
  }
  return out
}

export const POSTS_FEED_PAGE_SIZE = 20

export const POSTS_SELECT =
  'id, title, description, category, proposed_category_label, status, whatsapp_number, created_at, author_id, profiles(name, avatar_url), post_media(url, position, type)'

export type SupabasePostRow = {
  id: string
  title: string
  description: string
  category: string
  proposed_category_label: string | null
  status: string
  whatsapp_number: string | null
  created_at: string
  author_id: string
  profiles?: { name: string | null; avatar_url: string | null } | { name: string | null; avatar_url: string | null }[] | null
  post_media?: { url: string; position: number; type?: string | null }[] | null
}

export function mapSupabasePostRow(row: SupabasePostRow): Post {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  const media = normalizePostMediaRows(row.post_media)
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    proposedCategoryLabel: row.proposed_category_label ?? undefined,
    media,
    authorId: row.author_id,
    authorName: profile?.name ?? row.author_id.slice(0, 8),
    authorAvatar: profile?.avatar_url ?? undefined,
    status: row.status as PostStatus,
    createdAt: new Date(row.created_at),
    whatsappNumber: row.whatsapp_number ?? undefined,
  }
}
