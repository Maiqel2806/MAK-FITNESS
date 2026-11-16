import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const responder = (datos, status = 200) =>
  NextResponse.json(datos, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  })

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )
}

function urlPublica() {
  const valor =
    process.env.MAK_CLIENTES_URL ||
    process.env.NEXT_PUBLIC_MAK_CLIENTES_URL

  if (!valor) throw new Error('Falta MAK_CLIENTES_URL.')

  const url = new URL(valor)

  const local = process.env.NODE_ENV !== 'production' &&
    ['localhost', '127.0.0.1'].includes(url.hostname)

  if (url.protocol !== 'https:' && !local) {
    throw new Error('El dominio de MAK Clientes debe usar HTTPS.')
  }

  return url.origin
}

export async function POST(request) {
  // MAK_ORIGEN_CORREGIDO_V2
  const origen = request.headers.get('origin')
  const sitio = request.headers.get('sec-fetch-site')

  if (
    !origen ||
    (sitio && !['same-origin', 'none'].includes(sitio))
  ) {
    return responder({ error: 'Origen no autorizado.' }, 403)
  }

  let origenNavegador
  let urlServidor

  try {
    origenNavegador = new URL(origen)
    urlServidor = new URL(request.url)
  } catch {
    return responder({ error: 'Origen no autorizado.' }, 403)
  }

  const protocolo =
    request.headers.get('x-forwarded-proto')?.split(',')[0].trim() ||
    urlServidor.protocol.replace(':', '')

  const hosts = [
    request.headers.get('host'),
    request.headers.get('x-forwarded-host'),
    urlServidor.host
  ]
    .filter(Boolean)
    .map(host => host.trim().toLowerCase())

  const protocoloValido =
    origenNavegador.protocol === `${protocolo}:`

  const hostValido =
    hosts.includes(origenNavegador.host.toLowerCase())

  const httpsProduccion =
    process.env.NODE_ENV !== 'production' ||
    origenNavegador.protocol === 'https:'

  if (!protocoloValido || !hostValido || !httpsProduccion) {
    return responder({ error: 'Origen no autorizado.' }, 403)
  }

  const bearer = request.headers.get('authorization') || ''
  const token = bearer.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    return responder({ error: 'Sesión requerida.' }, 401)
  }

  const admin = adminClient()

  try {
    const { data: usuario, error: errorUsuario } =
      await admin.auth.getUser(token)

    if (errorUsuario || !usuario?.user) {
      return responder({ error: 'Sesión no válida.' }, 401)
    }

    const { data: perfil, error: errorPerfil } = await admin
      .from('admin_usuarios')
      .select('rol, activo')
      .eq('auth_user_id', usuario.user.id)
      .maybeSingle()

    if (
      errorPerfil ||
      perfil?.rol !== 'dueno' ||
      perfil.activo !== true
    ) {
      return responder({ error: 'Acceso no autorizado.' }, 403)
    }

    const body = await request.json().catch(() => null)
    const id = String(body?.miembro_id || '').trim()

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ) {
      return responder({ error: 'Socio no válido.' }, 400)
    }

    const { data: miembro, error: errorMiembro } = await admin
      .from('miembros')
      .select('id, codigo_acceso, nombre, apellido, telefono')
      .eq('id', id)
      .maybeSingle()

    if (errorMiembro || !miembro) {
      return responder({ error: 'Socio no encontrado.' }, 404)
    }

    const base = urlPublica()

    const { data: existente, error: errorCuenta } = await admin
      .from('socio_cuentas_app')
      .select('auth_user_id, auth_email, activo, clave_cambiada')
      .eq('miembro_id', miembro.id)
      .maybeSingle()

    if (errorCuenta) throw errorCuenta

    let cuenta = existente

    // Aprovisionar cuenta si se trata de un socio nuevo.
    if (!cuenta) {
      const email =
        `socio.${miembro.id.replaceAll('-', '')}@auth.makfitness.app`

      const claveInterna = randomBytes(24).toString('base64url')

      const { data: creado, error: errorCreacion } =
        await admin.auth.admin.createUser({
          email,
          password: claveInterna,
          email_confirm: true,
          app_metadata: {
            mak_tipo_usuario: 'socio',
            miembro_id: miembro.id
          },
          user_metadata: {
            codigo_acceso: miembro.codigo_acceso
          }
        })

      if (errorCreacion || !creado?.user) {
        throw errorCreacion || new Error('No se pudo crear Auth.')
      }

      const vinculo = await admin
        .from('socio_cuentas_app')
        .insert({
          miembro_id: miembro.id,
          auth_user_id: creado.user.id,
          auth_email: email,
          tipo_clave_inicial: 'aleatoria',
          cambio_clave_obligatorio: true,
          clave_cambiada: false,
          aviso_cambio_clave_visto: false,
          activo: true
        })

      if (vinculo.error) {
        // Reversión del usuario recién creado, solo si
        // no quedó vinculado a una cuenta.
        const { data: vinculado, error: errorLectura } =
          await admin
            .from('socio_cuentas_app')
            .select('id')
            .eq('auth_user_id', creado.user.id)
            .maybeSingle()

        if (!errorLectura && !vinculado) {
          const borrado = await admin.auth.admin.deleteUser(creado.user.id)
          if (borrado.error) {
            console.error('MAK: usuario Auth pendiente de revisión.')
          }
        }

        throw vinculo.error
      }

      cuenta = {
        auth_user_id: creado.user.id,
        auth_email: email,
        activo: true,
        clave_cambiada: false
      }
    }

    if (!cuenta.activo) {
      return responder({ error: 'La cuenta está inactiva.' }, 403)
    }

    const { data: authData, error: errorAuth } =
      await admin.auth.admin.getUserById(cuenta.auth_user_id)

    const authUser = authData?.user

    if (
      errorAuth ||
      !authUser ||
      authUser.app_metadata?.mak_tipo_usuario !== 'socio' ||
      String(authUser.app_metadata?.miembro_id) !== String(miembro.id)
    ) {
      return responder({ error: 'Identidad de cuenta no válida.' }, 409)
    }

    let tipo = 'ingreso'
    let enlace = new URL('/login', base).toString()

    // No restablecer contraseñas ya personalizadas.
    if (!cuenta.clave_cambiada) {
      const { data: enlaceData, error: errorEnlace } =
        await admin.auth.admin.generateLink({
          type: 'recovery',
          email: authUser.email
        })

      if (errorEnlace || !enlaceData?.properties?.hashed_token) {
        throw errorEnlace || new Error('No se generó el enlace.')
      }

      if (enlaceData.user?.id !== cuenta.auth_user_id) {
        throw new Error('El enlace no coincide con el socio.')
      }

      const destino = new URL('/activar', base)
      destino.searchParams.set(
        'token_hash',
        enlaceData.properties.hashed_token
      )

      enlace = destino.toString()
      tipo = 'activacion'
    }

    return responder({
      ok: true,
      tipo,
      nombre: [miembro.nombre, miembro.apellido]
        .filter(Boolean).join(' '),
      codigo: miembro.codigo_acceso,
      telefono: miembro.telefono,
      enlace
    })
  } catch (error) {
    console.error('MAK INVITACION:', error.code || error.message)

    return responder({
      error: 'No se pudo preparar la invitación.'
    }, 503)
  }
}
