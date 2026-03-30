import './globals.css'
import { Providers } from './providers'
import { Plus_Jakarta_Sans, Oswald } from 'next/font/google'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',
  display: 'swap',
  weight: ['600', '700'],
})

export const metadata = {
  title: 'CST Comunidad',
  description: 'Plataforma de difusión comunitaria',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'CST Comunidad' },
  themeColor: '#C06C3B',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${plusJakarta.variable} ${oswald.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#C06C3B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
