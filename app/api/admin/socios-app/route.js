import { randomBytes } from 'node:crypto'

import {
  NextResponse,
} from 'next/server'

import {
  createClient,
} from '@supabase/supabase-js'


export const runtime = 'nodejs'


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


function respuestaError(
  mensaje,
  status = 400
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


function esUuid(valor) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(valor || '').trim()
  )
}


function crearEmailInterno(
  miembroId
) {
  const identificador =
    String(miembroId)
      .replaceAll('-', '')

  return `socio.${identificador}@auth.makfitness.app`
}


function generarClaveTemporal() {
  return `MAK-${randomBytes(8)
    .toString('hex')
    .toUpperCase()}`
}


async function verificarDueno(
  request,
  supabaseAdmin
) {
  const authHeader =
    request.headers.get(
      'authorization'
    ) || ''

  const token =
    authHeader
      .replace(
        'Bearer ',
        ''
      )
      .trim()

  if (!token) {
    return {
      autorizado: false,
      error: 'Sesión no válida.',
    }
  }

  const {
    data: userData,
    error: userError,
  } =
    await supabaseAdmin.auth
      .getUser(token)

  if (
    userError ||
    !userData?.user
  ) {
    return {
      autorizado: false,
      error: 'Sesión no válida.',
    }
  }

  const {
    data: perfil,
    error: perfilError,
  } =
    await supabaseAdmin
      .from('admin_usuarios')
      .select(
        'id, rol, activo'
      )
      .eq(
        'auth_user_id',
        userData.user.id
      )
      .maybeSingle()

  if (
    perfilError ||
    !perfil ||
    perfil.rol !== 'dueno' ||
    !perfil.activo
  ) {
    return {
      autorizado: false,
      error:
        'No tienes permisos para administrar accesos MAK Socios.',
    }
  }

  return {
    autorizado: true,
    user: userData.user,
    perfil,
  }
}


async function obtenerMiembro(
  supabaseAdmin,
  miembroId
) {
  return supabaseAdmin
    .from('miembros')
    .select(`
      id,
      codigo_acceso,
      nombre,
      apellido,
      cedula,
      estado
    `)
    .eq(
      'id',
      miembroId
    )
    .maybeSingle()
}


async function obtenerCuenta(
  supabaseAdmin,
  miembroId
) {
  return supabaseAdmin
    .from('socio_cuentas_app')
    .select(`
      id,
      miembro_id,
      auth_user_id,
      auth_email,
      tipo_clave_inicial,
      cambio_clave_obligatorio,
      clave_cambiada,
      activo,
      ultimo_acceso_at,
      created_at
    `)
    .eq(
      'miembro_id',
      miembroId
    )
    .maybeSingle()
}


// ============================================================
// CONSULTAR ESTADO DE ACCESO MAK SOCIOS
// ============================================================

export async function GET(
  request
) {
  try {
    const supabaseAdmin =
      crearSupabaseAdmin()

    const verificacion =
      await verificarDueno(
        request,
        supabaseAdmin
      )

    if (
      !verificacion.autorizado
    ) {
      return respuestaError(
        verificacion.error,
        403
      )
    }

    const {
      searchParams,
    } =
      new URL(
        request.url
      )

    const miembroId =
      String(
        searchParams.get(
          'miembro_id'
        ) || ''
      ).trim()

    if (
      !esUuid(miembroId)
    ) {
      return respuestaError(
        'ID de socio no válido.',
        400
      )
    }

    const {
      data: miembro,
      error: errorMiembro,
    } =
      await obtenerMiembro(
        supabaseAdmin,
        miembroId
      )

    if (
      errorMiembro
    ) {
      console.error(
        'MAK SOCIOS GET MIEMBRO:',
        errorMiembro
      )

      return respuestaError(
        'No fue posible consultar el socio.',
        500
      )
    }

    if (!miembro) {
      return respuestaError(
        'Socio no encontrado.',
        404
      )
    }

    const {
      data: cuenta,
      error: errorCuenta,
    } =
      await obtenerCuenta(
        supabaseAdmin,
        miembroId
      )

    if (
      errorCuenta
    ) {
      console.error(
        'MAK SOCIOS GET CUENTA:',
        errorCuenta
      )

      return respuestaError(
        'No fue posible consultar el acceso MAK Socios.',
        500
      )
    }

    return NextResponse.json({
      ok: true,

      miembro: {
        id:
          miembro.id,

        codigo_acceso:
          miembro.codigo_acceso,

        nombre:
          miembro.nombre,

        apellido:
          miembro.apellido,

        estado:
          miembro.estado,
      },

      tiene_cuenta:
        Boolean(cuenta),

      cuenta:
        cuenta || null,
    })

  } catch (error) {
    console.error(
      'GET ACCESO MAK SOCIOS:',
      error
    )

    return respuestaError(
      'No fue posible consultar el acceso MAK Socios.',
      500
    )
  }
}


// ============================================================
// CREAR ACCESO MAK SOCIOS
// ============================================================

export async function POST(
  request
) {
  let authUserCreado = null

  try {
    const supabaseAdmin =
      crearSupabaseAdmin()

    const verificacion =
      await verificarDueno(
        request,
        supabaseAdmin
      )

    if (
      !verificacion.autorizado
    ) {
      return respuestaError(
        verificacion.error,
        403
      )
    }

    const body =
      await request.json()

    const miembroId =
      String(
        body?.miembro_id || ''
      ).trim()

    if (
      !esUuid(miembroId)
    ) {
      return respuestaError(
        'ID de socio no válido.',
        400
      )
    }

    // --------------------------------------------------------
    // 1. LEER SOCIO DESDE BASE DE DATOS
    // --------------------------------------------------------

    const {
      data: miembro,
      error: errorMiembro,
    } =
      await obtenerMiembro(
        supabaseAdmin,
        miembroId
      )

    if (
      errorMiembro
    ) {
      console.error(
        'MAK SOCIOS POST MIEMBRO:',
        errorMiembro
      )

      return respuestaError(
        'No fue posible consultar el socio.',
        500
      )
    }

    if (!miembro) {
      return respuestaError(
        'Socio no encontrado.',
        404
      )
    }

    const codigo =
      String(
        miembro.codigo_acceso || ''
      )
        .trim()
        .toUpperCase()

    if (!codigo) {
      return respuestaError(
        'El socio no tiene un código de acceso válido.',
        409
      )
    }

    // --------------------------------------------------------
    // 2. EVITAR CUENTAS DUPLICADAS
    // --------------------------------------------------------

    const {
      data: cuentaExistente,
      error: errorCuentaExistente,
    } =
      await obtenerCuenta(
        supabaseAdmin,
        miembroId
      )

    if (
      errorCuentaExistente
    ) {
      console.error(
        'MAK SOCIOS CUENTA EXISTENTE:',
        errorCuentaExistente
      )

      return respuestaError(
        'No fue posible verificar el acceso MAK Socios.',
        500
      )
    }

    if (
      cuentaExistente
    ) {
      return NextResponse.json({
        ok: true,
        estado: 'existente',

        mensaje:
          'El socio ya tiene una cuenta MAK Socios.',

        miembro: {
          id:
            miembro.id,

          codigo_acceso:
            codigo,

          nombre:
            miembro.nombre,

          apellido:
            miembro.apellido,
        },

        cuenta: {
          id:
            cuentaExistente.id,

          activo:
            cuentaExistente.activo,

          tipo_clave_inicial:
            cuentaExistente
              .tipo_clave_inicial,

          cambio_clave_obligatorio:
            cuentaExistente
              .cambio_clave_obligatorio,

          clave_cambiada:
            cuentaExistente
              .clave_cambiada,

          ultimo_acceso_at:
            cuentaExistente
              .ultimo_acceso_at,
        },
      })
    }

    // --------------------------------------------------------
    // 3. DEFINIR CONTRASEÑA INICIAL
    // --------------------------------------------------------

    const cedula =
      String(
        miembro.cedula || ''
      ).trim()

    const usarCedula =
      cedula.length >= 6

    const passwordInicial =
      usarCedula
        ? cedula
        : generarClaveTemporal()

    const tipoClaveInicial =
      usarCedula
        ? 'cedula'
        : 'aleatoria'

    const cambioClaveObligatorio =
      !usarCedula

    // --------------------------------------------------------
    // 4. CREAR IDENTIDAD AUTH
    // --------------------------------------------------------

    const authEmail =
      crearEmailInterno(
        miembro.id
      )

    const {
      data: authData,
      error: errorAuth,
    } =
      await supabaseAdmin.auth.admin
        .createUser({
          email:
            authEmail,

          password:
            passwordInicial,

          email_confirm:
            true,

          app_metadata: {
            mak_tipo_usuario:
              'socio',

            miembro_id:
              miembro.id,
          },

          user_metadata: {
            codigo_acceso:
              codigo,

            nombre:
              miembro.nombre,

            apellido:
              miembro.apellido,
          },
        })

    if (
      errorAuth ||
      !authData?.user?.id
    ) {
      console.error(
        'MAK SOCIOS CREATE AUTH:',
        errorAuth
      )

      return respuestaError(
        'No fue posible crear la identidad del socio. Verifica que no exista una cuenta técnica previa para este miembro.',
        409
      )
    }

    authUserCreado =
      authData.user

    // --------------------------------------------------------
    // 5. VINCULAR AUTH CON MIEMBROS
    // --------------------------------------------------------

    const {
      data: cuentaCreada,
      error: errorVinculo,
    } =
      await supabaseAdmin
        .from(
          'socio_cuentas_app'
        )
        .insert({
          miembro_id:
            miembro.id,

          auth_user_id:
            authUserCreado.id,

          auth_email:
            authEmail,

          tipo_clave_inicial:
            tipoClaveInicial,

          cambio_clave_obligatorio:
            cambioClaveObligatorio,

          clave_cambiada:
            false,

          activo:
            true,
        })
        .select(`
          id,
          miembro_id,
          auth_user_id,
          tipo_clave_inicial,
          cambio_clave_obligatorio,
          clave_cambiada,
          activo,
          created_at
        `)
        .single()

    if (
      errorVinculo ||
      !cuentaCreada
    ) {
      console.error(
        'MAK SOCIOS VINCULO:',
        errorVinculo
      )

      const {
        error: errorRollback,
      } =
        await supabaseAdmin
          .auth.admin
          .deleteUser(
            authUserCreado.id
          )

      if (
        errorRollback
      ) {
        console.error(
          'ATENCION: FALLO ROLLBACK AUTH MAK SOCIOS:',
          errorRollback
        )
      }

      authUserCreado = null

      return respuestaError(
        'No fue posible vincular la cuenta MAK Socios. No se realizaron cambios definitivos.',
        500
      )
    }

    // --------------------------------------------------------
    // 6. RESPUESTA
    // --------------------------------------------------------

    return NextResponse.json({
      ok: true,
      estado: 'creada',

      mensaje:
        'Acceso MAK Socios creado correctamente.',

      miembro: {
        id:
          miembro.id,

        codigo_acceso:
          codigo,

        nombre:
          miembro.nombre,

        apellido:
          miembro.apellido,
      },

      cuenta: {
        id:
          cuentaCreada.id,

        activo:
          cuentaCreada.activo,

        tipo_clave_inicial:
          cuentaCreada
            .tipo_clave_inicial,

        cambio_clave_obligatorio:
          cuentaCreada
            .cambio_clave_obligatorio,
      },

      credenciales: usarCedula
        ? {
            usuario:
              codigo,

            tipo_clave:
              'cedula',

            mensaje:
              'La contraseña inicial corresponde a la cédula registrada del socio.',
          }
        : {
            usuario:
              codigo,

            tipo_clave:
              'temporal',

            password_temporal:
              passwordInicial,

            mensaje:
              'Entrega esta contraseña temporal al socio. Deberá cambiarla al ingresar.',
          },
    })

  } catch (error) {
    console.error(
      'POST ACCESO MAK SOCIOS:',
      error
    )

    return respuestaError(
      'No fue posible crear el acceso MAK Socios.',
      500
    )
  }
}
