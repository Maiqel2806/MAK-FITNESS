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

    async function verificarSesion({ mostrarCarga = false } = {}) {
      if (mostrarCarga) {
        setCargando(true)
      }

      setError('')

      const { data } = await supabase.auth.getSession()
      const sesionActual = data.session

      if (!activo) return

      if (!sesionActual) {
        setSesion(null)
        setPerfil(null)

        if (!esRutaPublica) {
          router.replace('/login')
        }

        if (mostrarCarga) {
          setCargando(false)
        }

        return
      }

      const perfilActual = await cargarPerfil(sesionActual.user.id)

      if (!activo) return

      if (!perfilActual) {
        await supabase.auth.signOut()
        setSesion(null)
        setPerfil(null)
        setError('Tu usuario no está activo o no tiene permisos configurados.')
        router.replace('/login')

        if (mostrarCarga) {
          setCargando(false)
        }

        return
      }

      setSesion(sesionActual)
      setPerfil(perfilActual)

      if (pathname === '/login') {
        router.replace('/dashboard')

        if (mostrarCarga) {
          setCargando(false)
        }

        return
      }

      if (!rutaPermitida(pathname, perfilActual)) {
        router.replace('/dashboard')

        if (mostrarCarga) {
          setCargando(false)
        }

        return
      }

      if (mostrarCarga) {
        setCargando(false)
      }
    }

    verificarSesion({ mostrarCarga: true })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setSesion(null)
        setPerfil(null)

        if (!esRutaPublica) {
          router.replace('/login')
        }

        return
      }

      verificarSesion({ mostrarCarga: false })
    })

    return () => {
      activo = false
      subscription.unsubscribe()
    }
  }, [pathname, router, esRutaPublica])

  if (esRutaPublica) {
    return (
      <main className="safe-screen min-h-screen bg-gray-100">
        {children}
      </main>
    )
  }

  if (cargando) {
    return (
      <div className="safe-screen flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-900">Cargando sistema...</p>
          <p className="mt-1 text-sm text-gray-500">Verificando permisos</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="safe-screen flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!sesion || !perfil) return null

  return (
    <UserProvider perfil={perfil}>
      <div className="safe-screen min-h-screen bg-gray-100 md:flex">
        <Sidebar perfil={perfil} />

        <main className="safe-content min-h-screen flex-1 px-4 py-5 pt-24 md:px-6 md:py-6 md:pt-6 lg:px-8">
          <div className="safe-content mx-auto max-w-[1440px]">
            {children}
          </div>
        </main>
      </div>
    </UserProvider>
  )
}