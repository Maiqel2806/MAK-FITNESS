import { createClient } from '@supabase/supabase-js'

// MAK_AUTO_ACCESO_V1. Solo desde servidor con la clave service_role.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function crearAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan variables de Supabase en el servidor.')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export async function provisionarSocio(admin, miembroId) {
  if (!UUID.test(String(miembroId || ''))) {
    throw new Error('ID del socio no valido.')
  }

  const { data: miembro, error: errorMiembro } = await admin
    .from('miembros')
    .select('id, codigo_acceso, cedula, estado')
    .eq('id', miembroId)
    .maybeSingle()
  if (errorMiembro) throw errorMiembro
  if (!miembro) throw new Error('No se encontro al socio.')

  const { data: cuenta, error: errorCuenta } = await admin
    .from('socio_cuentas_app')
    .select('auth_user_id, auth_email, activo')
    .eq('miembro_id', miembro.id)
    .maybeSingle()
  if (errorCuenta) throw errorCuenta

  // Nunca cambiar ni restablecer credenciales de cuentas ya existentes.
  if (cuenta) {
    if (!cuenta.activo) throw new Error('La cuenta de este socio esta desactivada.')
    if (!cuenta.auth_user_id || !cuenta.auth_email) {
      throw new Error('La cuenta existente no tiene vinculacion Auth completa.')
    }
    const { data: authExistente, error: errorExistente } =
      await admin.auth.admin.getUserById(cuenta.auth_user_id)
    if (errorExistente || !authExistente?.user ||
      authExistente.user.app_metadata?.mak_tipo_usuario !== 'socio' ||
      String(authExistente.user.app_metadata?.miembro_id) !== String(miembro.id)) {
      throw new Error('La cuenta existente requiere revision de identidad Auth.')
    }
    return { ok: true, creada: false, codigo: miembro.codigo_acceso }
  }

  if (miembro.estado !== 'activo') {
    throw new Error('El socio no esta activo. No se genero acceso.')
  }
  const cedula = String(miembro.cedula || '').replace(/[.\s-]/g, '')
  if (!/^\d{10}$/.test(cedula)) {
    throw new Error('El socio necesita una cedula registrada de 10 digitos.')
  }
  if (!miembro.codigo_acceso) {
    throw new Error('El socio no tiene codigo de acceso MAK.')
  }

  const email = `socio.${miembro.id.replaceAll('-', '')}@auth.makfitness.app`
  const { data: nuevo, error: errorAuth } = await admin.auth.admin.createUser({
    email,
    password: cedula,
    email_confirm: true,
    app_metadata: { mak_tipo_usuario: 'socio', miembro_id: miembro.id },
    user_metadata: { codigo_acceso: miembro.codigo_acceso }
  })
  if (errorAuth || !nuevo?.user?.id) {
    throw new Error(`No se creo la identidad Auth: ${errorAuth?.code || errorAuth?.message || 'desconocido'}`)
  }

  const { error: errorVinculo } = await admin.from('socio_cuentas_app').insert({
    miembro_id: miembro.id,
    auth_user_id: nuevo.user.id,
    auth_email: email,
    tipo_clave_inicial: 'cedula',
    cambio_clave_obligatorio: false,
    clave_cambiada: false,
    aviso_cambio_clave_visto: false,
    activo: true
  })

  if (errorVinculo) {
    // Si otro proceso vinculo la cuenta, no alteramos la cuenta de ese proceso.
    const { data: vinculo, error: errLectura } = await admin
      .from('socio_cuentas_app')
      .select('id, auth_user_id')
      .eq('miembro_id', miembro.id)
      .maybeSingle()
    if (!errLectura && vinculo?.auth_user_id === nuevo.user.id) {
      return { ok: true, creada: true, codigo: miembro.codigo_acceso }
    }
    // Revertir SOLO el nuevo usuario Auth creado por esta llamada si no quedo vinculado.
    const { data: vinculado, error: errUsuario } = await admin
      .from('socio_cuentas_app')
      .select('id')
      .eq('auth_user_id', nuevo.user.id)
      .maybeSingle()
    if (!errUsuario && !vinculado) {
      const { error: errBorrado } = await admin.auth.admin.deleteUser(nuevo.user.id)
      if (errBorrado) console.error('MAK: identidad sin vincular; revision manual necesaria.')
    }
    if (vinculo && !errLectura) {
      return { ok: true, creada: false, codigo: miembro.codigo_acceso }
    }
    throw new Error(`Cuenta Auth creada, pero no se pudo vincular: ${errorVinculo.code || errorVinculo.message}`)
  }

  return { ok: true, creada: true, codigo: miembro.codigo_acceso }
}
