'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { UserProvider } from '@/components/UserContext'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

const rutasPublicas = ['/login']

const rutasEmpleado = [
  '/dashboard',
  '/miembros',
  '/membresias',
  '/asistencia',
  '/inventario',
]

function rutaPermitida(pathname, perfil) {
  if (!perfil) return false

  if (perfil.rol === 'dueno') return true

  if (perfil.rol === 'empleado') {
    return rutasEmpleado.some((ruta) => pathname.startsWith(ruta))
  }

  return false
}

export default function AppShell({ children }) {
  const pathname = usePathname()
  const router = useRouter()

  const [cargando, setCargando] = useState(true)
  const [sesion, setSesion] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [error, setError] = useState('')

  const esRutaPublica = rutasPublicas.includes(pathname)

  useEffect(() => {
    let activo = true

    async function cargarPerfil(userId) {
      const { data, error } = await supabase
        .from('admin_usuarios')
        .select('id, usuario, nombre, rol, activo')
        .eq('auth_user_id', userId)
        .single()

      if (error || !data || !data.activo) return null

      return data
    }

    async function verificarSesion() {
      setCargando(true)
      setError('')

      const { data } = await supabase.auth.getSession()
      const sesionActual = data.session

      if (!activo) return

      setSesion(sesionActual)

      if (!sesionActual) {
        setPerfil(null)

        if (!esRutaPublica) {
          router.replace('/login')
        }

        setCargando(false)
        return
      }

      const perfilActual = await cargarPerfil(sesionActual.user.id)

      if (!perfilActual) {
        await supabase.auth.signOut()
        setSesion(null)
        setPerfil(null)
        setError('Tu usuario no está activo o no tiene permisos configurados.')
        router.replace('/login')
        setCargando(false)
        return
      }

      setPerfil(perfilActual)

      if (pathname === '/login') {
        router.replace('/dashboard')
        setCargando(false)
        return
      }

      if (!rutaPermitida(pathname, perfilActual)) {
        router.replace('/dashboard')
        setCargando(false)
        return
      }

      setCargando(false)
    }

    verificarSesion()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      verificarSesion()
    })

    return () => {
      activo = false
      subscription.unsubscribe()
    }
  }, [pathname, router, esRutaPublica])

  if (esRutaPublica) {
    return (
      <main className="min-h-screen bg-gray-100">
        {children}
      </main>
    )
  }

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-900">Cargando sistema...</p>
          <p className="mt-1 text-sm text-gray-500">Verificando permisos</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!sesion || !perfil) return null

  return (
    <UserProvider perfil={perfil}>
      <div className="min-h-screen bg-gray-100 md:flex">
        <Sidebar perfil={perfil} />

        <main className="min-h-screen flex-1 overflow-auto p-4 pt-20 md:p-6">
          {children}
        </main>
      </div>
    </UserProvider>
  )
}