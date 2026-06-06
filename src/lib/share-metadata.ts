import type { Metadata } from 'next'
import { getAppPublicOrigin } from '@/lib/app-public-url'

const DEFAULT_OG_IMAGE_PATH = '/Assets/logo-mobil-launcher-512.png'
const OG_DESCRIPTION_MAX = 200

export function truncateForOgDescription(text: string, max = OG_DESCRIPTION_MAX): string {
	const t = text.replace(/\s+/g, ' ').trim()
	if (!t) return 'Publicación en CST Comunidad — Comunidad de Santo Tomé'
	if (t.length <= max) return t
	return `${t.slice(0, max - 1).trimEnd()}…`
}

export function absolutePublicUrl(pathOrUrl: string): string {
	const origin = getAppPublicOrigin()
	if (!pathOrUrl?.trim()) return `${origin}${DEFAULT_OG_IMAGE_PATH}`
	const raw = pathOrUrl.trim()
	if (/^https?:\/\//i.test(raw)) return raw
	return `${origin}${raw.startsWith('/') ? raw : `/${raw}`}`
}

export function defaultOgImageUrl(): string {
	return absolutePublicUrl(DEFAULT_OG_IMAGE_PATH)
}

/** WhatsApp/FB leen mejor object/public que render/image de Supabase. */
export function ensureStorageObjectPublicUrl(url: string): string {
	try {
		const parsed = new URL(url.trim())
		const renderMarker = '/storage/v1/render/image/public/'
		const objectMarker = '/storage/v1/object/public/'
		if (parsed.pathname.includes(renderMarker)) {
			parsed.pathname = parsed.pathname.replace(renderMarker, objectMarker)
			parsed.search = ''
		}
		return parsed.toString()
	} catch {
		return url
	}
}

/** og:image debe ser URL absoluta https; preferimos la URL pública directa del storage. */
export function openGraphImageUrl(storedUrl: string | null | undefined): string {
	if (!storedUrl?.trim()) return defaultOgImageUrl()
	const raw = ensureStorageObjectPublicUrl(storedUrl.trim())
	return absolutePublicUrl(raw)
}

export function buildShareMetadata(opts: {
	title: string
	description: string
	pageUrl: string
	imageUrl?: string | null
	siteName?: string
	type?: 'article' | 'website'
}): Metadata {
	const description = truncateForOgDescription(opts.description)
	const image = openGraphImageUrl(opts.imageUrl)
	const siteName = opts.siteName ?? 'CST Comunidad'
	const documentTitle = opts.title.includes(siteName) ? opts.title : `${opts.title} · ${siteName}`

	const hasPostImage = Boolean(opts.imageUrl?.trim())

	return {
		title: documentTitle,
		description,
		openGraph: {
			type: opts.type ?? 'article',
			title: opts.title,
			description,
			url: opts.pageUrl,
			siteName,
			locale: 'es_AR',
			images: [
				{
					url: image,
					secureUrl: image,
					alt: opts.title,
					width: hasPostImage ? 1200 : 512,
					height: hasPostImage ? 630 : 512,
					type: hasPostImage ? 'image/jpeg' : 'image/png',
				},
			],
		},
		twitter: {
			card: 'summary_large_image',
			title: opts.title,
			description,
			images: [{ url: image, alt: opts.title }],
		},
		alternates: {
			canonical: opts.pageUrl,
		},
		other: {
			'og:image:secure_url': image,
			'og:image:width': String(hasPostImage ? 1200 : 512),
			'og:image:height': String(hasPostImage ? 630 : 512),
		},
	}
}
