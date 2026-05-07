import { Geist } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'

const geist = Geist({
  subsets: ['latin'],
})

export const metadata = {
  title: 'MAK FITNESS',
  description: 'Sistema de administración de gimnasio',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${geist.className} min-h-screen bg-gray-50 text-gray-900`}>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  )
}