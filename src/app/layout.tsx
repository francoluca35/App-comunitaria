import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Providers } from './providers'
import { getAppPublicOrigin } from '@/lib/app-public-url'
import { Montserrat, Open_Sans } from 'next/font/google'

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
  weight: ['500', '600', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL(getAppPublicOrigin()),
  title: 'CST Comunidad',
  description: 'Plataforma de difusión comunitaria — Comunidad de Santo Tomé',
  manifest: '/manifest.json',
  applicationName: 'CST Comunidad',
  appleWebApp: {
    capable: true,
    title: 'CST Comunidad',
    statusBarStyle: 'default',
  },
  /** Web / Android: favicon y tamaños estándar PWA. */
  icons: {
    icon: [
      { url: '/Assets/logo-mobil-launcher-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/Assets/logo-mobil-launcher-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/Assets/logo-mobil-launcher-96.png',
    /** iPhone / iPad: variantes -i (Apple touch icon). */
    apple: [
      { url: '/Assets/logo-mobil-120-i.png', sizes: '120x120', type: 'image/png' },
      { url: '/Assets/logo-mobil-180-i.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#8B0015',
  /** Chrome Android: encoge el viewport con el teclado cuando sea posible (menos solapamiento). */
  interactiveWidget: 'resizes-content',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${openSans.variable} ${montserrat.variable}`}>
      <body className={`${openSans.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
