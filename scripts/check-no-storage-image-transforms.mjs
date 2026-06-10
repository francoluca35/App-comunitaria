/**
 * Falla si el código vuelve a generar URLs /render/image/ de Supabase (Image Transformations).
 * Ejecutar: npm run check:storage-urls
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const SRC = join(ROOT, 'src')

const ALLOWLIST = new Set([
	'src/lib/storage-image.ts',
	'src/lib/server/storage-path.ts',
])

const FORBIDDEN = '/storage/v1/render/image/'

function walk(dir) {
	const out = []
	for (const name of readdirSync(dir)) {
		const full = join(dir, name)
		if (statSync(full).isDirectory()) {
			if (name === 'node_modules' || name === '.next') continue
			out.push(...walk(full))
		} else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(name)) {
			out.push(full)
		}
	}
	return out
}

const violations = []

for (const file of walk(SRC)) {
	const rel = relative(ROOT, file).replace(/\\/g, '/')
	if (ALLOWLIST.has(rel)) continue
	const text = readFileSync(file, 'utf8')
	if (!text.includes(FORBIDDEN)) continue
	const lines = text.split('\n')
	lines.forEach((line, i) => {
		if (line.includes(FORBIDDEN)) {
			violations.push(`${rel}:${i + 1}: ${line.trim()}`)
		}
	})
}

if (violations.length > 0) {
	console.error('URLs de transformación de Supabase detectadas (prohibidas):\n')
	for (const v of violations) console.error(`  ${v}`)
	console.error('\nUsá ensureStorageObjectPublicUrl o buildSupabasePublicStorageUrl en src/lib/storage-image.ts')
	process.exit(1)
}

console.log('OK: no hay URLs /render/image/ fuera de los módulos permitidos.')
