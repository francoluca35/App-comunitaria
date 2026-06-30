/**
 * Genera miniaturas _thumb.webp faltantes en Storage (bucket publicaciones).
 *
 * Uso local (requiere .env.local con SUPABASE_SERVICE_ROLE_KEY):
 *   node scripts/backfill-storage-thumbnails.mjs
 *   node scripts/backfill-storage-thumbnails.mjs --limit=50
 *
 * Vía API desplegada (requiere CRON_SECRET):
 *   node scripts/backfill-storage-thumbnails.mjs --url=https://tu-dominio.com
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const THUMB_SUFFIX = '_thumb.webp'
const THUMB_MAX = 480
const BUCKET = 'publicaciones'
const IMAGE_PATH_RE = /\.(jpe?g|png|webp|heic|heif|avif)$/i

function loadEnvLocal() {
	const path = join(ROOT, '.env.local')
	if (!existsSync(path)) return
	for (const line of readFileSync(path, 'utf8').split('\n')) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('#')) continue
		const eq = trimmed.indexOf('=')
		if (eq <= 0) continue
		const key = trimmed.slice(0, eq).trim()
		let value = trimmed.slice(eq + 1).trim()
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1)
		}
		if (process.env[key] === undefined) process.env[key] = value
	}
}

function parseArgs() {
	const out = { limit: 25, url: null, offset: 0 }
	for (const arg of process.argv.slice(2)) {
		if (arg.startsWith('--limit=')) out.limit = Math.min(parseInt(arg.slice(8), 10) || 25, 100)
		else if (arg.startsWith('--offset=')) out.offset = parseInt(arg.slice(9), 10) || 0
		else if (arg.startsWith('--url=')) out.url = arg.slice(6).replace(/\/$/, '')
	}
	return out
}

function pathFromUrl(url, bucket) {
	try {
		const parsed = new URL(url)
		const prefix = `/storage/v1/object/public/${bucket}/`
		const idx = parsed.pathname.indexOf(prefix)
		if (idx === -1) return null
		const path = decodeURIComponent(parsed.pathname.slice(idx + prefix.length).split('?')[0])
		if (!path || path.includes('..')) return null
		return path
	} catch {
		return null
	}
}

function thumbObjectPath(objectPath) {
	const path = objectPath.replace(/^\/+/, '')
	const slash = path.lastIndexOf('/')
	const dir = slash >= 0 ? path.slice(0, slash + 1) : ''
	const filename = slash >= 0 ? path.slice(slash + 1) : path
	const dot = filename.lastIndexOf('.')
	const base = dot > 0 ? filename.slice(0, dot) : filename
	return `${dir}${base}${THUMB_SUFFIX}`
}

function isImagePath(path) {
	if (!path || path.includes('..')) return false
	if (path.endsWith(THUMB_SUFFIX)) return false
	return IMAGE_PATH_RE.test(path)
}

async function collectPaths(client) {
	const paths = new Set()

	const { data: media, error: mediaErr } = await client.from('post_media').select('url, type')
	if (mediaErr) throw new Error(`post_media: ${mediaErr.message}`)
	for (const row of media ?? []) {
		if (row.type === 'video') continue
		const p = pathFromUrl(row.url, BUCKET)
		if (p && isImagePath(p)) paths.add(p)
	}

	const { data: pubs, error: pubErr } = await client.from('publicidad_requests').select('images')
	if (pubErr) throw new Error(`publicidad_requests: ${pubErr.message}`)
	for (const row of pubs ?? []) {
		for (const url of Array.isArray(row.images) ? row.images : []) {
			const p = pathFromUrl(url, BUCKET)
			if (p && isImagePath(p)) paths.add(p)
		}
	}

	const { data: comments, error: comErr } = await client
		.from('comments')
		.select('image_url')
		.not('image_url', 'is', null)
	if (comErr) throw new Error(`comments: ${comErr.message}`)
	for (const row of comments ?? []) {
		const p = pathFromUrl(row.image_url, BUCKET)
		if (p && isImagePath(p)) paths.add(p)
	}

	return [...paths].sort()
}

async function exists(client, objectPath) {
	const { data, error } = await client.storage.from(BUCKET).download(objectPath)
	return !error && Boolean(data)
}

async function generateThumb(buffer) {
	return sharp(buffer)
		.rotate()
		.resize(THUMB_MAX, THUMB_MAX, { fit: 'inside', withoutEnlargement: true })
		.webp({ quality: 78 })
		.toBuffer()
}

async function backfillDirect(client, limit) {
	const all = await collectPaths(client)
	let created = 0
	let skipped = 0
	let errors = 0

	for (const objectPath of all) {
		const thumbPath = thumbObjectPath(objectPath)
		if (await exists(client, thumbPath)) {
			skipped++
			continue
		}
		const { data: original, error: dlErr } = await client.storage.from(BUCKET).download(objectPath)
		if (dlErr || !original) {
			skipped++
			console.warn(`  omitido (sin original): ${objectPath}`)
			continue
		}
		try {
			const thumb = await generateThumb(Buffer.from(await original.arrayBuffer()))
			const { error: upErr } = await client.storage.from(BUCKET).upload(thumbPath, thumb, {
				contentType: 'image/webp',
				cacheControl: 'public, max-age=31536000, immutable',
				upsert: true,
			})
			if (upErr) {
				errors++
				console.error(`  error ${objectPath}: ${upErr.message}`)
			} else {
				created++
				console.log(`  creado: ${thumbPath}`)
			}
		} catch (e) {
			errors++
			console.error(`  error ${objectPath}:`, e instanceof Error ? e.message : e)
		}
	}

	return { totalCandidates: all.length, created, skipped, errors }
}

async function backfillViaApi(baseUrl, limit, secret) {
	let offset = 0
	let totalCreated = 0
	let totalErrors = 0

	while (true) {
		const res = await fetch(`${baseUrl}/api/cron/backfill-thumbnails?limit=${limit}&offset=${offset}`, {
			headers: { Authorization: `Bearer ${secret}` },
		})
		const body = await res.json()
		if (!res.ok) {
			throw new Error(body.error ?? `HTTP ${res.status}`)
		}
		totalCreated += body.created ?? 0
		totalErrors += body.errors ?? 0
		console.log(
			`batch offset=${offset}: created=${body.created} skipped=${body.skipped} errors=${body.errors} remaining=${body.remaining}`
		)
		if ((body.remaining ?? 0) <= 0 || (body.processed ?? 0) <= 0) break
		offset += body.processed ?? limit
	}

	return { totalCreated, totalErrors }
}

loadEnvLocal()
const args = parseArgs()

if (args.url) {
	const secret = process.env.CRON_SECRET?.trim()
	if (!secret) {
		console.error('Falta CRON_SECRET en .env.local')
		process.exit(1)
	}
	const { totalCreated, totalErrors } = await backfillViaApi(args.url, args.limit, secret)
	console.log(`Listo vía API. Creadas: ${totalCreated}. Errores: ${totalErrors}.`)
	process.exit(totalErrors > 0 ? 1 : 0)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
if (!url || !key) {
	console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
	process.exit(1)
}

const client = createClient(url, key)
console.log(`Backfill directo en bucket "${BUCKET}"…`)
const result = await backfillDirect(client, args.limit)
console.log(
	`Listo. Candidatos: ${result.totalCandidates}. Creadas: ${result.created}. Omitidas: ${result.skipped}. Errores: ${result.errors}.`
)
process.exit(result.errors > 0 ? 1 : 0)
