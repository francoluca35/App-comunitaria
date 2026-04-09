/** @type {import('next').NextConfig} */

function supabaseStorageRemotePattern() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!raw || typeof raw !== 'string') return null
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return {
      protocol: u.protocol.replace(':', ''),
      hostname: u.hostname,
      port: u.port || undefined,
      pathname: '/storage/v1/object/**',
    }
  } catch {
    return null
  }
}

const supabasePattern = supabaseStorageRemotePattern()

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      ...(supabasePattern ? [supabasePattern] : []),
    ],
  },
  async redirects() {
    return [
      /** Rutas antiguas: muchos bloqueadores de anuncios bloquean URLs con "publicidad(es)" y rompen los chunks de Next. */
      { source: '/publicidades', destination: '/cartelera', permanent: true },
      { source: '/publicidades/crear', destination: '/cartelera/crear', permanent: true },
      { source: '/publicidades/:id', destination: '/cartelera/:id', permanent: true },
    ]
  },
}

export default nextConfig
