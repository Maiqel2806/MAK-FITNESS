import { Geist } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'

const geist = Geist({
  subsets: ['latin'],
})

export const metadata = {
  title: 'MAK FITNESS Admin',
  description: 'Sistema de administración de gimnasio',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={geist.className}>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  )
}