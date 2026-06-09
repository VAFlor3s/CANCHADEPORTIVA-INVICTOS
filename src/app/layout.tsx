import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Invictos — Cancha Sintética',
  description: 'Sistema de gestión Cancha Sintética Invictos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
