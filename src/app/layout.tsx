import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'Comunidad',
  description: 'Plataforma de difusión comunitaria',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Comunidad' },
  themeColor: '#4f46e5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
