'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React from 'react'
import { Button } from '@/app/components/ui/button'

/**
 * Renderiza el texto de un mensaje de chat respetando saltos de línea y
 * convirtiendo enlaces a targets tappables:
 *  - `/post/<uuid>` → ruta interna (Next Link): abre la publicación dentro de la app
 *  - `https://.../post/<uuid>` → ruta interna si el host coincide; de lo contrario, enlace externo
 *  - Otras URLs http(s) → enlace externo (`target="_blank"`)
 *  - `wa.me/<número>` o `+<número>` detrás de "WhatsApp:" → enlace a WhatsApp
 *
 * El componente es read-only; no mutar la fila original del mensaje.
 */

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i

const POST_PATH_RE = new RegExp(`(?:^|\\s|\\b)(/post/${UUID_RE.source})`, 'gi')
const URL_RE = /(https?:\/\/[^\s)]+)/gi
const WA_RE = /(https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[^\s)]+)/i

const POST_PATH_ONLY_RE = new RegExp(`^/post/${UUID_RE.source}$`, 'i')
const ABS_POST_RE = /https?:\/\/[^/\s]+\/post\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
const WA_ME_RE = /https:\/\/wa\.me\/\d+/i

function extractInternalPostPath(content: string): string | null {
	const rel = content.match(new RegExp(`/post/${UUID_RE.source}`, 'i'))
	if (rel) return rel[0]
	const abs = content.match(ABS_POST_RE)
	if (!abs) return null
	try {
		return new URL(abs[0]).pathname
	} catch {
		return null
	}
}

function extractWaMeUrl(content: string): string | null {
	const m = content.match(WA_ME_RE)
	return m ? m[0] : null
}

/**
 * Quita del texto las líneas que ya mostramos como botones (post / WhatsApp),
 * para no repetir URL cruda debajo de los botones.
 */
function displayTextWithoutActionLines(raw: string, postPath: string | null, waUrl: string | null): string {
	const lines = raw.split(/\r?\n/)
	const out: string[] = []
	for (const line of lines) {
		const t = line.trim()
		if (!t) {
			out.push('')
			continue
		}
		if (postPath && POST_PATH_ONLY_RE.test(t)) continue
		if (postPath && t === postPath) continue
		if (waUrl && (t === waUrl || t.includes(waUrl))) continue
		if (/^WhatsApp de contacto:/i.test(t) && waUrl && t.includes('wa.me')) continue
		try {
			if (postPath && ABS_POST_RE.test(t) && new URL(t.trim()).pathname === postPath) continue
		} catch {
			/* ignore */
		}
		out.push(line)
	}
	return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

type Token =
	| { type: 'text'; value: string }
	| { type: 'post'; path: string }
	| { type: 'url'; url: string; internalPath?: string }

function tokenize(content: string): Token[] {
	const tokens: Token[] = []
	let remaining = content

	while (remaining.length > 0) {
		const urlMatch = URL_RE.exec(remaining)
		URL_RE.lastIndex = 0
		const postMatch = POST_PATH_RE.exec(remaining)
		POST_PATH_RE.lastIndex = 0

		const urlIdx = urlMatch ? urlMatch.index : -1
		const postIdx = postMatch ? postMatch.index + (postMatch[0].length - postMatch[1]!.length) : -1

		if (urlIdx === -1 && postIdx === -1) {
			tokens.push({ type: 'text', value: remaining })
			break
		}

		const takePost =
			postIdx !== -1 && (urlIdx === -1 || postIdx <= urlIdx)

		if (takePost && postMatch) {
			const path = postMatch[1]!
			const beforeIdx = postIdx
			if (beforeIdx > 0) tokens.push({ type: 'text', value: remaining.slice(0, beforeIdx) })
			tokens.push({ type: 'post', path })
			remaining = remaining.slice(beforeIdx + path.length)
			continue
		}

		if (urlMatch) {
			const url = urlMatch[1]!
			if (urlIdx > 0) tokens.push({ type: 'text', value: remaining.slice(0, urlIdx) })
			let internalPath: string | undefined
			try {
				const u = new URL(url)
				const m = u.pathname.match(new RegExp(`^/post/${UUID_RE.source}`, 'i'))
				if (m && typeof window !== 'undefined' && u.origin === window.location.origin) {
					internalPath = u.pathname
				}
			} catch {
				/* ignore */
			}
			tokens.push({ type: 'url', url, internalPath })
			remaining = remaining.slice(urlIdx + url.length)
			continue
		}

		tokens.push({ type: 'text', value: remaining })
		break
	}

	return tokens
}

interface MessageContentProps {
	content: string
	/** Color del enlace: cambia según el color del globo (propio = texto claro, ajeno = bordó). */
	variant?: 'light' | 'dark'
	onNavigate?: () => void
}

export function MessageContent({ content, variant = 'dark', onNavigate }: MessageContentProps) {
	const router = useRouter()
	const linkClass =
		variant === 'light'
			? 'underline underline-offset-2 font-semibold text-white hover:text-white/90 break-words'
			: 'underline underline-offset-2 font-semibold text-[#8B0015] hover:text-[#5A000E] break-words'

	const postPath = React.useMemo(() => extractInternalPostPath(content), [content])
	const waUrl = React.useMemo(() => extractWaMeUrl(content), [content])
	const displayBody = React.useMemo(
		() => displayTextWithoutActionLines(content, postPath, waUrl),
		[content, postPath, waUrl]
	)
	const tokens = React.useMemo(() => tokenize(displayBody), [displayBody])

	const postBtnClass =
		variant === 'light'
			? 'w-full bg-white text-[#8B0015] hover:bg-white/90 border-0'
			: 'w-full bg-[#8B0015] text-white hover:bg-[#5A000E] border-0'

	return (
		<div className="space-y-2">
			{displayBody ? (
				<p className="text-sm whitespace-pre-wrap break-words">
					{tokens.map((t, i) => {
						if (t.type === 'text') return <React.Fragment key={i}>{t.value}</React.Fragment>
						if (t.type === 'post') {
							return (
								<Link
									key={i}
									href={t.path}
									className={linkClass}
									onClick={() => {
										onNavigate?.()
										router.prefetch?.(t.path)
									}}
								>
									{t.path}
								</Link>
							)
						}
						if (t.internalPath) {
							return (
								<Link
									key={i}
									href={t.internalPath}
									className={linkClass}
									onClick={() => onNavigate?.()}
								>
									{t.url}
								</Link>
							)
						}
						const isWhatsApp = WA_RE.test(t.url)
						return (
							<a
								key={i}
								href={t.url}
								target="_blank"
								rel="noopener noreferrer"
								className={linkClass}
								aria-label={isWhatsApp ? 'Abrir WhatsApp' : undefined}
							>
								{t.url}
							</a>
						)
					})}
				</p>
			) : null}

			{postPath ? (
				<Button asChild size="sm" className={postBtnClass}>
					<Link
						href={postPath}
						onClick={() => {
							onNavigate?.()
							router.prefetch?.(postPath)
						}}
					>
						Ver publicación
					</Link>
				</Button>
			) : null}

			{waUrl ? (
				<Button asChild size="sm" className="w-full border-0 bg-[#25D366] text-white hover:bg-[#20bd5a]">
					<a href={waUrl} target="_blank" rel="noopener noreferrer">
						Abrir WhatsApp
					</a>
				</Button>
			) : null}
		</div>
	)
}
