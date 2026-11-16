import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

function cargarEnv() {
  if (!fs.existsSync('.env.local')) {
    throw new Error('No existe .env.local')
  }

  const contenido = fs.readFileSync(
    '.env.local',
    'utf8'
  )

  for (const lineaOriginal of contenido.split(/\r?\n/)) {
    const linea = lineaOriginal.trim()

    if (
      !linea ||
      linea.startsWith('#') ||
      !linea.includes('=')
    ) {
      continue
    }

    const posicion = linea.indexOf('=')

    const clave =
      linea.slice(0, posicion).trim()

    let valor =
      linea.slice(posicion + 1).trim()

    if (
      (valor.startsWith('"') &&
        valor.endsWith('"')) ||
      (valor.startsWith("'") &&
        valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1)
    }

    if (!process.env[clave]) {
      process.env[clave] = valor
    }
  }
}

cargarEnv()

const codigo =
  String(process.argv[2] || '').trim()

if (!codigo) {
  console.error('')
  console.error(
    'Debes indicar el código del socio.'
  )
  console.error('')
  console.error(
    'Ejemplo: node probar-login-socio-piloto.mjs 12292'
  )
  process.exit(1)
}

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL

const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const serviceRole =
  process.env.SUPABASE_SERVICE_ROLE_KEY

if (
  !url ||
  !publishableKey ||
  !serviceRole
) {
  throw new Error(
    'Faltan variables de Supabase en .env.local.'
  )
}


// ============================================================
// CLIENTE ADMINISTRATIVO
// Solo para resolver la cuenta piloto.
// ============================================================

const admin = createClient(
  url,
  serviceRole,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)


// ============================================================
// 1. BUSCAR SOCIO
// ============================================================

const {
  data: miembro,
  error: errorMiembro,
} = await admin
  .from('miembros')
  .select(`
    id,
    codigo_acceso,
    cedula
  `)
  .eq('codigo_acceso', codigo)
  .maybeSingle()

if (errorMiembro) {
  throw new Error(
    errorMiembro.message
  )
}

if (!miembro) {
  throw new Error(
    `No existe el socio con código ${codigo}.`
  )
}

const cedula =
  String(miembro.cedula || '').trim()

if (!cedula) {
  throw new Error(
    'Este piloto debe tener cédula registrada.'
  )
}


// ============================================================
// 2. OBTENER CUENTA VINCULADA
// ============================================================

const {
  data: cuenta,
  error: errorCuenta,
} = await admin
  .from('socio_cuentas_app')
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

if (errorCuenta) {
  throw new Error(
    errorCuenta.message
  )
}

if (!cuenta) {
  throw new Error(
    'El socio todavía no tiene cuenta MAK Socios.'
  )
}

if (!cuenta.activo) {
  throw new Error(
    'La cuenta del socio está desactivada.'
  )
}

if (!cuenta.auth_email) {
  throw new Error(
    'La cuenta no tiene identidad Auth configurada.'
  )
}


// ============================================================
// 3. CLIENTE NORMAL
// Este representa lo que utilizará MAK Socios.
// ============================================================

const cliente = createClient(
  url,
  publishableKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

console.log('')
console.log(
  '=== PRUEBA DE LOGIN MAK SOCIOS ==='
)
console.log('')
console.log(
  `Código probado: ${codigo}`
)
console.log(
  'Autenticando con código + contraseña inicial...'
)


// ============================================================
// 4. LOGIN REAL CON SUPABASE AUTH
// ============================================================

const {
  data: login,
  error: errorLogin,
} =
  await cliente.auth.signInWithPassword({
    email: cuenta.auth_email,
    password: cedula,
  })

if (errorLogin) {
  throw new Error(
    `LOGIN FALLÓ: ${errorLogin.message}`
  )
}

if (!login?.user?.id) {
  throw new Error(
    'Supabase no devolvió un usuario autenticado.'
  )
}


// ============================================================
// 5. VALIDAR IDENTIDAD AUTH
// ============================================================

if (
  login.user.id !==
  cuenta.auth_user_id
) {
  throw new Error(
    'El usuario autenticado no corresponde a la cuenta vinculada.'
  )
}

if (
  login.user.app_metadata
    ?.mak_tipo_usuario !==
  'socio'
) {
  throw new Error(
    'El usuario Auth no está identificado como socio MAK.'
  )
}

if (
  login.user.app_metadata
    ?.miembro_id !==
  miembro.id
) {
  throw new Error(
    'El miembro_id de Auth no coincide con el socio.'
  )
}


// ============================================================
// 6. PROBAR LA FUNCIÓN DE IDENTIDAD CON SESIÓN REAL
// ============================================================

const {
  data: miembroAutenticado,
  error: errorRpc,
} = await cliente.rpc(
  'socio_miembro_id_actual'
)

if (errorRpc) {
  throw new Error(
    `Falló socio_miembro_id_actual(): ${errorRpc.message}`
  )
}

if (
  miembroAutenticado !==
  miembro.id
) {
  throw new Error(
    'La sesión autenticada resolvió un miembro incorrecto.'
  )
}


// ============================================================
// 7. CERRAR SESIÓN DE PRUEBA
// ============================================================

await cliente.auth.signOut()


// ============================================================
// RESULTADO
// ============================================================

console.log('')
console.log(
  'LOGIN PILOTO VALIDADO CORRECTAMENTE'
)
console.log('')
console.log(
  '✓ Código único reconocido'
)
console.log(
  '✓ Contraseña inicial aceptada'
)
console.log(
  '✓ Supabase Auth autenticó al socio correcto'
)
console.log(
  '✓ auth_user_id coincide'
)
console.log(
  '✓ miembro_id coincide'
)
console.log(
  '✓ El usuario está marcado como socio MAK'
)
console.log(
  '✓ socio_miembro_id_actual() funciona con la sesión real'
)
console.log(
  '✓ La sesión de prueba fue cerrada'
)
console.log('')
console.log(
  `Cambio de contraseña obligatorio: ${cuenta.cambio_clave_obligatorio}`
)
console.log(
  `Contraseña personalizada todavía registrada: ${cuenta.clave_cambiada}`
)
console.log('')
console.log(
  'No se mostró la cédula ni el correo técnico.'
)