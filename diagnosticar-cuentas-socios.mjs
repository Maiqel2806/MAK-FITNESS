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

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL

const serviceRole =
  process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) {
  throw new Error(
    'Falta NEXT_PUBLIC_SUPABASE_URL'
  )
}

if (!serviceRole) {
  throw new Error(
    'Falta SUPABASE_SERVICE_ROLE_KEY'
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
  '=== DIAGNÓSTICO DE CUENTAS MAK SOCIOS ==='
)
console.log('')


// ============================================================
// 1. MIEMBROS
// ============================================================

const {
  data: miembros,
  error: errorMiembros,
} = await supabase
  .from('miembros')
  .select(`
    id,
    codigo_acceso,
    cedula
  `)
  .order('created_at', {
    ascending: true,
  })

if (errorMiembros) {
  throw new Error(
    `No se pudieron leer miembros: ${errorMiembros.message}`
  )
}


// ============================================================
// 2. CUENTAS YA VINCULADAS
// ============================================================

const {
  data: cuentas,
  error: errorCuentas,
} = await supabase
  .from('socio_cuentas_app')
  .select(`
    miembro_id,
    auth_user_id,
    tipo_clave_inicial,
    activo
  `)

if (errorCuentas) {
  throw new Error(
    `No se pudieron leer socio_cuentas_app: ${errorCuentas.message}`
  )
}

const cuentasPorMiembro =
  new Map(
    (cuentas || []).map(
      (cuenta) => [
        cuenta.miembro_id,
        cuenta,
      ]
    )
  )


// ============================================================
// 3. VALIDACIÓN DE DATOS
// ============================================================

let conCedula = 0
let sinCedula = 0
let conCodigo = 0
let sinCodigo = 0
let yaVinculados = 0
let pendientes = 0

const pendientesAleatorios = []

for (const miembro of miembros || []) {

  const codigo =
    String(
      miembro.codigo_acceso || ''
    ).trim()

  const cedula =
    String(
      miembro.cedula || ''
    ).trim()

  if (codigo) {
    conCodigo += 1
  } else {
    sinCodigo += 1
  }

  if (cedula) {
    conCedula += 1
  } else {
    sinCedula += 1
  }

  if (
    cuentasPorMiembro.has(
      miembro.id
    )
  ) {
    yaVinculados += 1
  } else {
    pendientes += 1
  }

  if (
    codigo &&
    !cedula &&
    !cuentasPorMiembro.has(
      miembro.id
    )
  ) {
    pendientesAleatorios.push(
      codigo
    )
  }
}


// ============================================================
// 4. USUARIOS AUTH EXISTENTES
// ============================================================

let authTotal = 0
let authSociosDetectados = 0

let pagina = 1
const porPagina = 1000

while (true) {

  const {
    data,
    error,
  } =
    await supabase.auth.admin.listUsers({
      page: pagina,
      perPage: porPagina,
    })

  if (error) {
    throw new Error(
      `No se pudieron revisar usuarios Auth: ${error.message}`
    )
  }

  const usuarios =
    data?.users || []

  authTotal +=
    usuarios.length

  authSociosDetectados +=
    usuarios.filter(
      (usuario) =>
        usuario.app_metadata
          ?.mak_tipo_usuario ===
        'socio'
    ).length

  if (
    usuarios.length <
    porPagina
  ) {
    break
  }

  pagina += 1
}


// ============================================================
// 5. RESULTADO
// ============================================================

console.log(
  `Miembros encontrados: ${miembros.length}`
)

console.log(
  `Con código único: ${conCodigo}`
)

console.log(
  `Sin código único: ${sinCodigo}`
)

console.log(
  `Con cédula: ${conCedula}`
)

console.log(
  `Sin cédula: ${sinCedula}`
)

console.log(
  `Cuentas socio ya vinculadas: ${yaVinculados}`
)

console.log(
  `Cuentas socio pendientes: ${pendientes}`
)

console.log(
  `Usuarios totales en Supabase Auth: ${authTotal}`
)

console.log(
  `Usuarios Auth identificados como socio MAK: ${authSociosDetectados}`
)

console.log('')

if (pendientesAleatorios.length) {

  console.log(
    'Socios que requerirán contraseña temporal aleatoria:'
  )

  for (
    const codigo
    of pendientesAleatorios
  ) {
    console.log(
      ` - Código ${codigo}`
    )
  }

  console.log('')
}

console.log(
  '=== RESULTADO ==='
)

if (
  sinCodigo === 0 &&
  pendientes === miembros.length &&
  yaVinculados === 0
) {

  console.log(
    'LISTO PARA PREPARAR LA MIGRACIÓN.'
  )

  console.log(
    `${conCedula} cuentas usarán cédula como contraseña inicial.`
  )

  console.log(
    `${sinCedula} cuenta(s) usarán contraseña temporal aleatoria.`
  )

} else if (
  yaVinculados > 0
) {

  console.log(
    'ATENCIÓN: ya existen cuentas de socio vinculadas.'
  )

  console.log(
    'No se debe ejecutar una migración masiva hasta revisarlas.'
  )

} else {

  console.log(
    'ATENCIÓN: existen datos que deben revisarse antes de migrar.'
  )
}

console.log('')
console.log(
  'Este diagnóstico NO creó ni modificó usuarios.'
)