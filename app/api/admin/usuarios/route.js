import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function crearSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

function limpiarUsuario(usuario) {
  return String(usuario || '').trim().toLowerCase()
}

function validarUsuario(usuario) {
  return /^[a-zA-Z0-9._-]{3,30}$/.test(usuario)
}

function crearEmailInterno(usuario) {
  return `${usuario}@makfitness.local`
}

async function verificarDueno(request, supabaseAdmin) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) {
    return {
      autorizado: false,
      error: 'Sesión no válida.',
    }
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)

  if (userError || !userData?.user) {
    return {
      autorizado: false,
      error: 'Sesión no válida.',
    }
  }

  const { data: perfil, error: perfilError } = await supabaseAdmin
    .from('admin_usuarios')
    .select('id, rol, activo')
    .eq('auth_user_id', userData.user.id)
    .single()

  if (perfilError || !perfil || perfil.rol !== 'dueno' || !perfil.activo) {
    return {
      autorizado: false,
      error: 'No tienes permisos para gestionar usuarios.',
    }
  }

  return {
    autorizado: true,
    user: userData.user,
    perfil,
  }
}

export async function GET(request) {
  const supabaseAdmin = crearSupabaseAdmin()
  const verificacion = await verificarDueno(request, supabaseAdmin)

  if (!verificacion.autorizado) {
    return NextResponse.json(
      { error: verificacion.error },
      { status: 403 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('admin_usuarios')
    .select('id, auth_user_id, usuario, auth_email, nombre, rol, activo, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }

  return NextResponse.json({ usuarios: data || [] })
}

export async function POST(request) {
  const supabaseAdmin = crearSupabaseAdmin()
  const verificacion = await verificarDueno(request, supabaseAdmin)

  if (!verificacion.autorizado) {
    return NextResponse.json(
      { error: verificacion.error },
      { status: 403 }
    )
  }

  const body = await request.json()

  const usuario = limpiarUsuario(body.usuario)
  const nombre = String(body.nombre || '').trim()
  const password = String(body.password || '')
  const rol = body.rol === 'dueno' ? 'dueno' : 'empleado'
  const activo = Boolean(body.activo ?? true)

  if (!validarUsuario(usuario)) {
    return NextResponse.json(
      { error: 'El usuario debe tener entre 3 y 30 caracteres. Solo letras, números, punto, guion o guion bajo.' },
      { status: 400 }
    )
  }

  if (!nombre) {
    return NextResponse.json(
      { error: 'El nombre es obligatorio.' },
      { status: 400 }
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 6 caracteres.' },
      { status: 400 }
    )
  }

  const authEmail = crearEmailInterno(usuario)

  const respuestaAuth = await supabaseAdmin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: {
      usuario,
      nombre,
      rol,
    },
  })

  if (respuestaAuth.error) {
    return NextResponse.json(
      { error: respuestaAuth.error.message },
      { status: 400 }
    )
  }

  const authUser = respuestaAuth.data.user

  const { data, error } = await supabaseAdmin
    .from('admin_usuarios')
    .insert({
      auth_user_id: authUser.id,
      usuario,
      auth_email: authEmail,
      nombre,
      rol,
      activo,
    })
    .select('id, auth_user_id, usuario, auth_email, nombre, rol, activo, created_at')
    .single()

  if (error) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.id)

    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }

  return NextResponse.json({ usuario: data })
}

export async function PATCH(request) {
  const supabaseAdmin = crearSupabaseAdmin()
  const verificacion = await verificarDueno(request, supabaseAdmin)

  if (!verificacion.autorizado) {
    return NextResponse.json(
      { error: verificacion.error },
      { status: 403 }
    )
  }

  const body = await request.json()

  const id = body.id
  const nombre = String(body.nombre || '').trim()
  const rol = body.rol === 'dueno' ? 'dueno' : 'empleado'
  const activo = Boolean(body.activo)
  const password = String(body.password || '')

  if (!id) {
    return NextResponse.json(
      { error: 'ID de usuario requerido.' },
      { status: 400 }
    )
  }

  if (!nombre) {
    return NextResponse.json(
      { error: 'El nombre es obligatorio.' },
      { status: 400 }
    )
  }

  const { data: usuarioActual, error: errorUsuarioActual } = await supabaseAdmin
    .from('admin_usuarios')
    .select('*')
    .eq('id', id)
    .single()

  if (errorUsuarioActual || !usuarioActual) {
    return NextResponse.json(
      { error: 'Usuario no encontrado.' },
      { status: 404 }
    )
  }

  if (password && password.length < 6) {
    return NextResponse.json(
      { error: 'La nueva contraseña debe tener al menos 6 caracteres.' },
      { status: 400 }
    )
  }

  if (password) {
    const { error: errorPassword } = await supabaseAdmin.auth.admin.updateUserById(
      usuarioActual.auth_user_id,
      {
        password,
        user_metadata: {
          usuario: usuarioActual.usuario,
          nombre,
          rol,
        },
      }
    )

    if (errorPassword) {
      return NextResponse.json(
        { error: errorPassword.message },
        { status: 400 }
      )
    }
  } else {
    const { error: errorMetadata } = await supabaseAdmin.auth.admin.updateUserById(
      usuarioActual.auth_user_id,
      {
        user_metadata: {
          usuario: usuarioActual.usuario,
          nombre,
          rol,
        },
      }
    )

    if (errorMetadata) {
      return NextResponse.json(
        { error: errorMetadata.message },
        { status: 400 }
      )
    }
  }

  const { data, error } = await supabaseAdmin
    .from('admin_usuarios')
    .update({
      nombre,
      rol,
      activo,
    })
    .eq('id', id)
    .select('id, auth_user_id, usuario, auth_email, nombre, rol, activo, created_at')
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }

  return NextResponse.json({ usuario: data })
}

export async function DELETE(request) {
  const supabaseAdmin = crearSupabaseAdmin()
  const verificacion = await verificarDueno(request, supabaseAdmin)

  if (!verificacion.autorizado) {
    return NextResponse.json(
      { error: verificacion.error },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'ID de usuario requerido.' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('admin_usuarios')
    .update({
      activo: false,
    })
    .eq('id', id)
    .select('id, auth_user_id, usuario, auth_email, nombre, rol, activo, created_at')
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }

  return NextResponse.json({ usuario: data })
}