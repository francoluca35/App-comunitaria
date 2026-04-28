/**
 * Genera íconos PWA sin transparencia (Android rellena el alpha en blanco).
 * Origen: public/Assets/logo-mobil.png
 */
import sharp from 'sharp'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const src = join(root, 'public/Assets/logo-mobil.png')
const BG = '#180008'

const base = sharp(src).ensureAlpha().flatten({ background: BG })

await base.clone().resize(512, 512, { fit: 'contain', background: BG }).png().toFile(join(root, 'public/Assets/logo-mobil-launcher-512.png'))

await base.clone().resize(192, 192, { fit: 'contain', background: BG }).png().toFile(join(root, 'public/Assets/logo-mobil-launcher-192.png'))

await base.clone().resize(96, 96, { fit: 'contain', background: BG }).png().toFile(join(root, 'public/Assets/logo-mobil-launcher-96.png'))

console.log('OK: logo-mobil-launcher-{96,192,512}.png (fondo opaco #180008)')
