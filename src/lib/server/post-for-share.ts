import {
	mapSupabasePostRow,
	POSTS_SELECT,
	type SupabasePostRow,
} from '@/app/providers/post-mapper'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export type PostShareSnapshot = {
	id: string
	title: string
	description: string
	imageUrl: string | null
}

/**
 * Datos mínimos de un post aprobado para Open Graph / WhatsApp / Facebook.
 * Solo publicaciones visibles en el feed (status = approved).
 */
export async function getApprovedPostForShare(postId: string): Promise<PostShareSnapshot | null> {
	const trimmed = postId?.trim()
	if (!trimmed || trimmed.length > 64) return null

	const client = createServiceRoleClient() ?? createClient()
	const { data, error } = await client
		.from('posts')
		.select(POSTS_SELECT)
		.eq('id', trimmed)
		.eq('status', 'approved')
		.maybeSingle()

	if (error || !data) return null

	const post = mapSupabasePostRow(data as SupabasePostRow)
	const firstImage = post.media.find((m) => m.type === 'image')?.url ?? null

	return {
		id: post.id,
		title: post.title,
		description: post.description,
		imageUrl: firstImage,
	}
}
