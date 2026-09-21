'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dumbbell, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function LoginPage() {
  const router = useRouter()

  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function iniciarSesion(evento) {
    evento.preventDefault()

    setCargando(true)
    setError('')

    const usuarioLimpio = usuario.trim().toLowerCase()

    if (!usuarioLimpio || !password.trim()) {
      setError('Ingresa tu usuario y contraseña.')
      setCargando(false)
      return
    }

    const {
      data: authEmail,
      error: errorUsuario,
    } = await supabase.rpc(
      'obtener_email_login',
      {
        p_usuario: usuarioLimpio,
      }
    )

    if (errorUsuario || !authEmail) {
      setError('Usuario o contraseña incorrectos.')
      setCargando(false)
      return
    }

    const {
      error: errorLogin,
    } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    })

    if (errorLogin) {
      setError('Usuario o contraseña incorrectos.')
      setCargando(false)
      return
    }

    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat p-4"
      style={{
        backgroundImage: "url('/login-bg.jpg')",
      }}
    >
      {/* Capa oscura sobre la imagen */}
      <div className="absolute inset-0 bg-black/65" />

      {/* Detalle visual MAK */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-cyan-500/10" />

      {/* Login */}
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-md md:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-black shadow-lg">
              <Dumbbell
                size={30}
                className="text-[#02AFBB]"
              />
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight text-gray-900">
              MAK FITNESS
            </h1>

            <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#02AFBB]" />

            <p className="mt-4 text-sm text-gray-500">
              Sistema Administrativo
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Entrenamiento real, para resultados reales
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <form
            onSubmit={iniciarSesion}
            className="space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Usuario
              </label>

              <input
                value={usuario}
                onChange={(e) =>
                  setUsuario(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-sm text-gray-900 outline-none transition focus:border-[#02AFBB] focus:ring-2 focus:ring-[#02AFBB]/20"
                placeholder="Ingresa tu usuario"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Contraseña
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-sm text-gray-900 outline-none transition focus:border-[#02AFBB] focus:ring-2 focus:ring-[#02AFBB]/20"
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn size={18} />

              {cargando
                ? 'Ingresando...'
                : 'Ingresar al sistema'}
            </button>
          </form>

          <div className="mt-7 border-t border-gray-100 pt-5 text-center">
            <p className="text-xs text-gray-400">
              MAK FITNESS · Sistema de gestión
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-xs font-medium text-white/70">
          #entrenareal
        </p>
      </div>
    </div>
  )
}