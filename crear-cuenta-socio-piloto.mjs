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

const codigo = String(
  process.argv[2] || ''
).trim()

if (!codigo) {
  console.error('')
  console.error(
    'Debes indicar el código del socio.'
  )
  console.error('')
  console.error(
    'Ejemplo:'
  )
  console.error(
    'node crear-cuenta-socio-piloto.mjs 12345'
  )
  process.exit(1)
}

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL

const serviceRole =
  process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRole) {
  throw new Error(
    'Faltan las credenciales de Supabase.'
  )
}

const supabase = createClient(
  url,
  serviceRole,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

console.log('')
console.log(
  '=== CREACIÓN DE CUENTA PILOTO MAK SOCIOS ==='
)
console.log('')


// ============================================================
// 1. BUSCAR SOCIO
// ============================================================

const {
  data: miembro,
  error: errorMiembro,
} = await supabase
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
    `No existe un socio con código ${codigo}.`
  )
}

const cedula =
  String(
    miembro.cedula || ''
  ).trim()

if (!cedula) {
  throw new Error(
    'Este socio no tiene cédula. Para la prueba piloto utiliza un socio que sí tenga cédula.'
  )
}


// ============================================================
// 2. VERIFICAR QUE NO TENGA CUENTA
// ============================================================

const {
  data: cuentaExistente,
  error: errorCuenta,
} = await supabase
  .from('socio_cuentas_app')
  .select(`
    id,
    auth_user_id
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

if (cuentaExistente) {
  throw new Error(
    'Este socio ya tiene una cuenta MAK Socios vinculada.'
  )
}


// ============================================================
// 3. IDENTIDAD TÉCNICA
//
// El cliente nunca verá este correo.
// Se basa en el UUID del miembro, no en su cédula.
// ============================================================

const identificador =
  miembro.id.replaceAll('-', '')

const authEmail =
  `socio.${identificador}@auth.makfitness.app`


// ============================================================
// 4. CREAR USUARIO AUTH
// ============================================================

console.log(
  `Preparando cuenta para código: ${codigo}`
)

console.log(
  'Creando usuario en Supabase Auth...'
)

const {
  data: authData,
  error: errorAuth,
} =
  await supabase.auth.admin.createUser({
    email: authEmail,
    password: cedula,
    email_confirm: true,

    app_metadata: {
      mak_tipo_usuario: 'socio',
      miembro_id: miembro.id,
    },

    user_metadata: {
      codigo_acceso:
        miembro.codigo_acceso,
    },
  })

if (errorAuth) {
  throw new Error(
    `No se pudo crear el usuario Auth: ${errorAuth.message}`
  )
}

const authUser =
  authData?.user

if (!authUser?.id) {
  throw new Error(
    'Supabase no devolvió el usuario creado.'
  )
}


// ============================================================
// 5. VINCULAR CUENTA
// ============================================================

console.log(
  'Vinculando cuenta con el socio...'
)

const {
  error: errorVinculo,
} = await supabase
  .from('socio_cuentas_app')
  .insert({
    miembro_id:
      miembro.id,

    auth_user_id:
      authUser.id,

    auth_email:
      authEmail,

    tipo_clave_inicial:
      'cedula',

    cambio_clave_obligatorio:
      false,

    clave_cambiada:
      false,

    aviso_cambio_clave_visto:
      false,

    activo:
      true,
  })

if (errorVinculo) {

  console.log(
    'Falló el vínculo. Revirtiendo usuario Auth...'
  )

  const {
    error: errorRollback,
  } =
    await supabase.auth.admin.deleteUser(
      authUser.id
    )

  if (errorRollback) {
    console.error(
      'ATENCIÓN: también falló la reversión del usuario Auth.'
    )
  }

  throw new Error(
    `No se pudo vincular la cuenta: ${errorVinculo.message}`
  )
}


// ============================================================
// 6. VALIDACIÓN FINAL
// ============================================================

const {
  data: validacion,
  error: errorValidacion,
} = await supabase
  .from('socio_cuentas_app')
  .select(`
    miembro_id,
    auth_user_id,
    tipo_clave_inicial,
    cambio_clave_obligatorio,
    clave_cambiada,
    activo
  `)
  .eq(
    'miembro_id',
    miembro.id
  )
  .single()

if (errorValidacion) {
  throw new Error(
    errorValidacion.message
  )
}

console.log('')
console.log(
  'CUENTA PILOTO CREADA CORRECTAMENTE'
)
console.log('')
console.log(
  `Código de acceso: ${codigo}`
)
console.log(
  `Tipo de clave inicial: ${validacion.tipo_clave_inicial}`
)
console.log(
  `Cambio obligatorio: ${validacion.cambio_clave_obligatorio}`
)
console.log(
  `Cuenta activa: ${validacion.activo}`
)
console.log('')
console.log(
  'La contraseña inicial NO se mostró.'
)
console.log(
  'Para este socio corresponde a su cédula registrada.'
)
console.log('')
console.log(
  'No se modificó ningún otro socio.'
)