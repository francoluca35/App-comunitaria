import type { Metadata } from 'next'
import { postPermalink } from '@/lib/app-public-url'
import { buildShareMetadata } from '@/lib/share-metadata'
import { getApprovedPostForShare } from '@/lib/server/post-for-share'
import PostDetailClient from './PostDetailClient'

type PageProps = { params: Promise<{ postId: string }> }

/** Metadatos frescos al compartir (edición de texto/imagen en el post). */
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { postId } = await params
	const post = await getApprovedPostForShare(postId)

	if (!post) {
		return {
			title: 'Publicación · CST Comunidad',
			description: 'Plataforma de difusión comunitaria — Comunidad de Santo Tomé',
		}
	}

	return buildShareMetadata({
		title: post.title,
		description: post.description,
		pageUrl: postPermalink(post.id),
		imageUrl: post.imageUrl,
		type: 'article',
	})
}

export default async function PostDetailPage({ params }: PageProps) {
	const { postId } = await params
	return <PostDetailClient postId={postId} />
}
