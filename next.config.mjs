/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
