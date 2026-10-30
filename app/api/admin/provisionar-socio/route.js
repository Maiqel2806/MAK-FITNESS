import { NextResponse } from 'next/server'
import { crearAdminSupabase, provisionarSocio } from '@/lib/mak-provisionar-socio.mjs'

export const runtime = 'nodejs'

function responder(datos, status = 200) {
  return NextResponse.json(datos, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  })
}

export async function POST(request) {
  // El endpoint exige un JWT explicito. Nunca acepta service_role desde navegador.
  const token = (request.headers.get('authorization') || '')
    .replace(/^Bearer\s+/i, '').trim()
  if (!token) return responder({ ok: false, error: 'Sesion requerida.' }, 401)

  try {
    const admin = crearAdminSupabase()
    const { data: sesion, error: errorSesion } = await admin.auth.getUser(token)
    if (errorSesion || !sesion?.user) {
      return responder({ ok: false, error: 'Sesion administrativa no valida.' }, 401)
    }

    const { data: perfil, error: errorPerfil } = await admin
      .from('admin_usuarios')
      .select('rol, activo')
      .eq('auth_user_id', sesion.user.id)
      .maybeSingle()
    if (errorPerfil || !perfil?.activo ||
      !['dueno', 'administrador', 'empleado'].includes(perfil.rol)) {
      return responder({ ok: false, error: 'No autorizado.' }, 403)
    }

    const body = await request.json().catch(() => null)
    const miembroId = body?.miembro_id
    const resultado = await provisionarSocio(admin, miembroId)
    return responder(resultado)
  } catch (error) {
    // No imprimir documentos personales ni credenciales.
    const motivo = String(error?.message || 'Error al crear acceso.')
    console.error('MAK PROVISIONAR SOCIO:', motivo)
    return responder({ ok: false, error: motivo }, 422)
  }
}
