from pathlib import Path
import shutil
import sys


ROOT = Path(".")
BACKUP = Path("_backup_antes_login_mak_socios")


def error(msg):
    print("")
    print("ERROR:", msg)
    sys.exit(1)


def guardar(ruta, contenido):
    ruta = Path(ruta)

    if ruta.exists():
        respaldo = BACKUP / ruta
        respaldo.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        if not respaldo.exists():
            shutil.copy2(
                ruta,
                respaldo,
            )

    ruta.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    ruta.write_text(
        contenido,
        encoding="utf-8",
    )


if not Path("package.json").exists():
    error(
        "Ejecuta este script desde la raíz de mak-socios-app."
    )


env = Path(".env.local")

if not env.exists():
    error(
        "No existe .env.local."
    )


env_texto = env.read_text(
    encoding="utf-8"
)

for variable in [
    "NEXT_PUBLIC_SUPABASE_URL=",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=",
    "SUPABASE_SERVICE_ROLE_KEY=",
]:
    if variable not in env_texto:
        error(
            f"Falta {variable[:-1]} en .env.local."
        )


# ============================================================
# lib/supabase/server.js
# ============================================================

guardar(
    "lib/supabase/server.js",
    r"""import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },

        setAll(cookiesToSet, _headers) {
          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                cookieStore.set(
                  name,
                  value,
                  options
                )
              }
            )
          } catch {
            // Los Server Components no pueden
            // escribir cookies directamente.
            // proxy.js mantiene la sesión renovada.
          }
        },
      },
    }
  )
}
""",
)


# ============================================================
# lib/supabase/admin.js
# ============================================================

guardar(
    "lib/supabase/admin.js",
    r"""import 'server-only'

import {
  createClient,
} from '@supabase/supabase-js'

export function createAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRole) {
    throw new Error(
      'Falta la configuración privada de Supabase.'
    )
  }

  return createClient(
    url,
    serviceRole,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
""",
)


# ============================================================
# lib/supabase/client.js
# ============================================================

guardar(
    "lib/supabase/client.js",
    r"""import {
  createBrowserClient,
} from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
}
""",
)


# ============================================================
# lib/supabase/proxy.js
# ============================================================

guardar(
    "lib/supabase/proxy.js",
    r"""import {
  createServerClient,
} from '@supabase/ssr'

import {
  NextResponse,
} from 'next/server'

export async function updateSession(
  request
) {
  let response =
    NextResponse.next({
      request,
    })

  const supabase =
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },

          setAll(
            cookiesToSet,
            headers
          ) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value
                )
              }
            )

            response =
              NextResponse.next({
                request,
              })

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                response.cookies.set(
                  name,
                  value,
                  options
                )
              }
            )

            Object.entries(
              headers || {}
            ).forEach(
              ([
                key,
                value,
              ]) => {
                response.headers.set(
                  key,
                  value
                )
              }
            )
          },
        },
      }
    )

  // Verifica y actualiza la sesión.
  await supabase.auth.getClaims()

  return response
}
""",
)


# ============================================================
# proxy.js
# Next.js 16
# ============================================================

guardar(
    "proxy.js",
    r"""import {
  updateSession,
} from '@/lib/supabase/proxy'

export async function proxy(
  request
) {
  return await updateSession(
    request
  )
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
""",
)


# ============================================================
# API LOGIN
# ============================================================

guardar(
    "app/api/auth/login/route.js",
    r"""import {
  NextResponse,
} from 'next/server'

import {
  createAdminClient,
} from '@/lib/supabase/admin'

import {
  createClient,
} from '@/lib/supabase/server'


function respuestaError(
  mensaje,
  status
) {
  return NextResponse.json(
    {
      ok: false,
      error: mensaje,
    },
    {
      status,
    }
  )
}


export async function POST(
  request
) {
  try {
    const body =
      await request.json()

    const codigo =
      String(
        body?.codigo || ''
      )
        .trim()
        .toUpperCase()

    const password =
      String(
        body?.password || ''
      )

    if (
      !codigo ||
      !password
    ) {
      return respuestaError(
        'Ingresa tu código único y contraseña.',
        400
      )
    }

    if (
      codigo.length > 50 ||
      !/^[A-Z0-9_-]+$/.test(
        codigo
      )
    ) {
      return respuestaError(
        'Código o contraseña incorrectos.',
        401
      )
    }

    const admin =
      createAdminClient()

    // El correo técnico nunca sale
    // de esta ruta de servidor.
    const {
      data: miembro,
      error: errorMiembro,
    } = await admin
      .from('miembros')
      .select('id')
      .eq(
        'codigo_acceso',
        codigo
      )
      .maybeSingle()

    if (
      errorMiembro ||
      !miembro
    ) {
      return respuestaError(
        'Código o contraseña incorrectos.',
        401
      )
    }

    const {
      data: cuenta,
      error: errorCuenta,
    } = await admin
      .from(
        'socio_cuentas_app'
      )
      .select(`
        miembro_id,
        auth_user_id,
        auth_email,
        tipo_clave_inicial,
        cambio_clave_obligatorio,
        clave_cambiada,
        activo
      `)
      .eq(
        'miembro_id',
        miembro.id
      )
      .maybeSingle()

    if (
      errorCuenta ||
      !cuenta ||
      !cuenta.activo ||
      !cuenta.auth_email
    ) {
      return respuestaError(
        'Código o contraseña incorrectos.',
        401
      )
    }

    const supabase =
      await createClient()

    const {
      data: login,
      error: errorLogin,
    } =
      await supabase.auth
        .signInWithPassword({
          email:
            cuenta.auth_email,

          password,
        })

    if (
      errorLogin ||
      !login?.user
    ) {
      return respuestaError(
        'Código o contraseña incorrectos.',
        401
      )
    }

    const usuario =
      login.user

    const identidadValida =
      usuario.id ===
        cuenta.auth_user_id &&
      usuario.app_metadata
        ?.mak_tipo_usuario ===
        'socio' &&
      usuario.app_metadata
        ?.miembro_id ===
        miembro.id

    if (!identidadValida) {
      await supabase.auth.signOut()

      return respuestaError(
        'La cuenta no corresponde a un socio MAK válido.',
        403
      )
    }

    // No bloqueamos el acceso si solamente
    // falla el registro estadístico de último acceso.
    await admin
      .from(
        'socio_cuentas_app'
      )
      .update({
        ultimo_acceso_at:
          new Date().toISOString(),
      })
      .eq(
        'miembro_id',
        miembro.id
      )

    return NextResponse.json({
      ok: true,

      cambio_clave_obligatorio:
        cuenta
          .cambio_clave_obligatorio,

      clave_cambiada:
        cuenta.clave_cambiada,
    })

  } catch (error) {
    console.error(
      'LOGIN MAK SOCIOS:',
      error
    )

    return respuestaError(
      'No fue posible iniciar sesión. Intenta nuevamente.',
      500
    )
  }
}
""",
)


# ============================================================
# API LOGOUT
# ============================================================

guardar(
    "app/api/auth/logout/route.js",
    r"""import {
  NextResponse,
} from 'next/server'

import {
  createClient,
} from '@/lib/supabase/server'


export async function POST(
  request
) {
  const supabase =
    await createClient()

  await supabase.auth.signOut()

  return NextResponse.redirect(
    new URL(
      '/login',
      request.url
    ),
    {
      status: 303,
    }
  )
}
""",
)


# ============================================================
# app/page.js
# ============================================================

guardar(
    "app/page.js",
    r"""import {
  redirect,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'


export default async function Home() {
  const supabase =
    await createClient()

  const {
    data,
    error,
  } =
    await supabase.auth.getClaims()

  if (
    !error &&
    data?.claims?.sub
  ) {
    redirect('/inicio')
  }

  redirect('/login')
}
""",
)


# ============================================================
# LOGIN
# ============================================================

guardar(
    "app/login/page.js",
    r"""'use client'

import {
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import {
  Dumbbell,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  ShieldCheck,
  UserRound,
} from 'lucide-react'


export default function LoginPage() {
  const router =
    useRouter()

  const [
    codigo,
    setCodigo,
  ] = useState('')

  const [
    password,
    setPassword,
  ] = useState('')

  const [
    mostrarPassword,
    setMostrarPassword,
  ] = useState(false)

  const [
    cargando,
    setCargando,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')


  async function iniciarSesion(
    evento
  ) {
    evento.preventDefault()

    if (
      !codigo.trim() ||
      !password
    ) {
      setError(
        'Ingresa tu código único y contraseña.'
      )
      return
    }

    setCargando(true)
    setError('')

    try {
      const respuesta =
        await fetch(
          '/api/auth/login',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              codigo:
                codigo.trim(),

              password,
            }),
          }
        )

      const resultado =
        await respuesta.json()

      if (
        !respuesta.ok ||
        !resultado?.ok
      ) {
        throw new Error(
          resultado?.error ||
          'No fue posible iniciar sesión.'
        )
      }

      router.replace(
        '/inicio'
      )

      router.refresh()

    } catch (errorLogin) {
      setError(
        errorLogin.message
      )

      setCargando(false)
    }
  }


  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white">

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">

        <div className="mb-8 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400 text-zinc-950 shadow-lg shadow-cyan-400/20">
            <Dumbbell size={32} />
          </div>

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.35em] text-cyan-400">
            MAK FITNESS
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight">
            MAK Socios
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Tu entrenamiento, membresía y progreso en un solo lugar.
          </p>

        </div>


        <section className="rounded-3xl border border-white/10 bg-zinc-900 p-5 shadow-2xl sm:p-7">

          <div className="mb-6">

            <h2 className="text-xl font-bold">
              Iniciar sesión
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Ingresa con el código único asignado en MAK FITNESS.
            </p>

          </div>


          <form
            onSubmit={
              iniciarSesion
            }
            className="space-y-5"
          >

            <div>

              <label className="mb-2 block text-sm font-semibold text-zinc-200">
                Código único
              </label>

              <div className="relative">

                <UserRound
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                />

                <input
                  type="text"
                  autoComplete="username"
                  inputMode="text"
                  value={codigo}
                  onChange={(evento) =>
                    setCodigo(
                      evento.target.value
                    )
                  }
                  placeholder="Ej: 12292"
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950 py-3.5 pl-12 pr-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400"
                />

              </div>

            </div>


            <div>

              <label className="mb-2 block text-sm font-semibold text-zinc-200">
                Contraseña
              </label>

              <div className="relative">

                <KeyRound
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                />

                <input
                  type={
                    mostrarPassword
                      ? 'text'
                      : 'password'
                  }
                  autoComplete="current-password"
                  value={password}
                  onChange={(evento) =>
                    setPassword(
                      evento.target.value
                    )
                  }
                  placeholder="Tu contraseña"
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950 py-3.5 pl-12 pr-12 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400"
                />

                <button
                  type="button"
                  onClick={() =>
                    setMostrarPassword(
                      (actual) =>
                        !actual
                    )
                  }
                  aria-label={
                    mostrarPassword
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-white"
                >
                  {mostrarPassword
                    ? (
                      <EyeOff
                        size={19}
                      />
                    )
                    : (
                      <Eye
                        size={19}
                      />
                    )}
                </button>

              </div>

            </div>


            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}


            <button
              type="submit"
              disabled={cargando}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-4 text-sm font-black text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn size={19} />

              {cargando
                ? 'Ingresando...'
                : 'Ingresar'}
            </button>

          </form>


          <div className="mt-6 border-t border-white/10 pt-5">

            <button
              type="button"
              onClick={() =>
                window.alert(
                  'Para recuperar tu contraseña, comunícate directamente con MAK FITNESS. En el siguiente paso conectaremos este botón al WhatsApp oficial.'
                )
              }
              className="w-full text-center text-sm font-semibold text-cyan-400 transition hover:text-cyan-300"
            >
              ¿Olvidaste tu contraseña?
            </button>

          </div>

        </section>


        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">

          <ShieldCheck
            size={20}
            className="mt-0.5 shrink-0 text-cyan-400"
          />

          <p className="text-xs leading-5 text-zinc-500">
            Tu acceso es personal. Nunca compartas tu contraseña con otros socios.
          </p>

        </div>

      </div>

    </main>
  )
}
""",
)


# ============================================================
# INICIO PROTEGIDO
# ============================================================

guardar(
    "app/inicio/page.js",
    r"""import {
  redirect,
} from 'next/navigation'

import {
  Dumbbell,
  LockKeyhole,
  LogOut,
  Salad,
  TrendingUp,
  UserRound,
} from 'lucide-react'

import {
  createClient,
} from '@/lib/supabase/server'


export default async function InicioPage() {
  const supabase =
    await createClient()

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims()

  const userId =
    claimsData?.claims?.sub

  if (
    claimsError ||
    !userId
  ) {
    redirect('/login')
  }


  const {
    data: cuenta,
    error: errorCuenta,
  } = await supabase
    .from('socio_cuentas_app')
    .select(`
      miembro_id,
      tipo_clave_inicial,
      cambio_clave_obligatorio,
      clave_cambiada,
      aviso_cambio_clave_visto,
      activo
    `)
    .eq(
      'auth_user_id',
      userId
    )
    .maybeSingle()


  if (
    errorCuenta ||
    !cuenta ||
    !cuenta.activo
  ) {
    redirect('/login')
  }


  const codigo =
    claimsData
      ?.claims
      ?.user_metadata
      ?.codigo_acceso ||
    'Socio MAK'


  return (
    <main className="min-h-screen bg-zinc-100 pb-24">

      <header className="bg-zinc-950 px-4 pb-8 pt-6 text-white">

        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">

          <div>

            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-400">
              MAK FITNESS
            </p>

            <h1 className="mt-1 text-2xl font-black">
              Hola, {codigo}
            </h1>

          </div>


          <form
            action="/api/auth/logout"
            method="post"
          >

            <button
              type="submit"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Cerrar sesión"
            >
              <LogOut size={19} />
            </button>

          </form>

        </div>

      </header>


      <div className="mx-auto -mt-4 w-full max-w-5xl px-4">

        {!cuenta.clave_cambiada &&
          !cuenta.cambio_clave_obligatorio && (

          <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">

            <div className="flex gap-3">

              <LockKeyhole
                size={22}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div>

                <p className="font-bold text-amber-900">
                  Protege tu cuenta
                </p>

                <p className="mt-1 text-sm leading-5 text-amber-800">
                  Estás utilizando tu contraseña inicial. Recomendamos crear una contraseña personal.
                </p>

                <p className="mt-2 text-xs font-semibold text-amber-700">
                  El cambio será opcional para este tipo de cuenta.
                </p>

              </div>

            </div>

          </section>
        )}


        {cuenta.cambio_clave_obligatorio && (

          <section className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">

            <div className="flex gap-3">

              <LockKeyhole
                size={22}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>

                <p className="font-bold text-red-900">
                  Debes cambiar tu contraseña
                </p>

                <p className="mt-1 text-sm leading-5 text-red-800">
                  Tu cuenta utiliza una contraseña temporal. Antes de utilizar MAK Socios deberás crear una contraseña personal.
                </p>

              </div>

            </div>

          </section>
        )}


        <section className="rounded-3xl bg-white p-5 shadow-sm">

          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Acceso validado
          </p>

          <h2 className="mt-2 text-2xl font-black text-zinc-950">
            Bienvenido a MAK Socios
          </h2>

          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Tu cuenta ya está conectada de forma segura con tu registro de MAK FITNESS.
          </p>

        </section>


        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <UserRound
              className="text-cyan-600"
              size={23}
            />

            <p className="mt-3 font-bold text-zinc-900">
              Mi membresía
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Próximo paso
            </p>
          </div>


          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <Dumbbell
              className="text-cyan-600"
              size={23}
            />

            <p className="mt-3 font-bold text-zinc-900">
              Mi rutina
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Próximamente
            </p>
          </div>


          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <TrendingUp
              className="text-cyan-600"
              size={23}
            />

            <p className="mt-3 font-bold text-zinc-900">
              Progreso
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Próximamente
            </p>
          </div>


          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <Salad
              className="text-cyan-600"
              size={23}
            />

            <p className="mt-3 font-bold text-zinc-900">
              Snack Bar
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Próximamente
            </p>
          </div>

        </div>

      </div>

    </main>
  )
}
""",
)


# ============================================================
# LAYOUT
# ============================================================

guardar(
    "app/layout.js",
    r"""import './globals.css'

export const metadata = {
  title:
    'MAK Socios | MAK FITNESS',

  description:
    'Membresía, entrenamiento y progreso para socios MAK FITNESS.',

  viewport:
    'width=device-width, initial-scale=1, maximum-scale=1',
}


export default function RootLayout({
  children,
}) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  )
}
""",
)


# ============================================================
# CSS
# ============================================================

guardar(
    "app/globals.css",
    r"""@import "tailwindcss";

:root {
  --background: #f4f4f5;
  --foreground: #18181b;
}

* {
  box-sizing: border-box;
}

html {
  background: var(--background);
}

body {
  margin: 0;
  min-height: 100vh;
  background: var(--background);
  color: var(--foreground);
  font-family:
    Arial,
    Helvetica,
    sans-serif;
}

button,
input,
textarea,
select {
  font: inherit;
}

button {
  -webkit-tap-highlight-color: transparent;
}
""",
)


print("")
print(
    "BASE DE LOGIN MAK SOCIOS CREADA CORRECTAMENTE"
)
print("")
print(
    "Archivos preparados:"
)
print(
    " - lib/supabase/server.js"
)
print(
    " - lib/supabase/admin.js"
)
print(
    " - lib/supabase/client.js"
)
print(
    " - lib/supabase/proxy.js"
)
print(
    " - proxy.js"
)
print(
    " - app/api/auth/login/route.js"
)
print(
    " - app/api/auth/logout/route.js"
)
print(
    " - app/page.js"
)
print(
    " - app/login/page.js"
)
print(
    " - app/inicio/page.js"
)
print(
    " - app/layout.js"
)
print(
    " - app/globals.css"
)
print("")
print(
    "NO se modificó gimnasio-admin."
)
print(
    "NO se crearon nuevas cuentas de socios."
)
print(
    "NO se expuso SUPABASE_SERVICE_ROLE_KEY al navegador."
)