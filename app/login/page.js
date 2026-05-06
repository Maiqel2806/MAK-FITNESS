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

    const { data: authEmail, error: errorUsuario } = await supabase.rpc(
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

    const { error: errorLogin } = await supabase.auth.signInWithPassword({
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
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black">
            <Dumbbell size={28} className="text-white" />
          </div>

          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            MAK FITNESS
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Ingresa con tu usuario del sistema.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={iniciarSesion} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Usuario
            </label>

            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              placeholder="admin"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Contraseña
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              placeholder="Tu contraseña"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn size={18} />
            {cargando ? 'Ingresando...' : 'Ingresar al sistema'}
          </button>
        </form>
      </div>
    </div>
  )
}