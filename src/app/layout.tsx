import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'Comunidad',
  description: 'Plataforma de difusión comunitaria',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
