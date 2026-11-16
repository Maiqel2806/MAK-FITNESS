import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const modo = process.argv[2] || 'revisar'

if (!['revisar', 'socio', 'todos'].includes(modo)) {
  throw new Error('Modo inválido.')
}

if (modo === 'todos' && process.argv[3] !== 'CONFIRMO') {
  throw new Error('Para ejecutar usa: todos CONFIRMO')
}

if (modo === 'socio' && !process.argv[3]) {
  throw new Error('Indica el código MAK del socio.')
}

for (const linea of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const texto = linea.trim()
  if (!texto || texto.startsWith('#')) continue

  const posicion = texto.indexOf('=')
  if (posicion < 1) continue

  const nombre = texto.slice(0, posicion).trim()
  const valor = texto.slice(posicion + 1).trim()
    .replace(/^["']|["']$/g, '')

  if (!process.env[nombre]) process.env[nombre] = valor
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  throw new Error('Faltan credenciales de Supabase.')
}

const admin = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

async function leer(tabla, campos) {
  const resultado = []

  for (let inicio = 0; ; inicio += 1000) {
    const { data, error } = await admin
      .from(tabla)
      .select(campos)
      .range(inicio, inicio + 999)

    if (error) throw error

    resultado.push(...data)

    if (data.length < 1000) break
  }

  return resultado
}

async function leerUsuariosAuth() {
  const resultado = []

  for (let pagina = 1; ; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page: pagina,
      perPage: 1000
    })

    if (error) throw error

    resultado.push(...data.users)

    if (data.users.length < 1000) break
  }

  return new Map(resultado.map(u => [u.id, u]))
}

const [miembros, cuentas, usuarios] = await Promise.all([
  leer('miembros', 'id,codigo_acceso,cedula,estado'),
  leer(
    'socio_cuentas_app',
    'miembro_id,auth_user_id,tipo_clave_inicial,clave_cambiada,activo'
  ),
  leerUsuariosAuth()
])

const miembrosPorId = new Map(miembros.map(m => [m.id, m]))
const candidatos = []
const sinCedula = []

for (const cuenta of cuentas) {
  // No modificar al socio piloto ni contraseñas personalizadas.
  if (
    !cuenta.activo ||
    cuenta.clave_cambiada ||
    cuenta.tipo_clave_inicial !== 'aleatoria'
  ) continue

  const miembro = miembrosPorId.get(cuenta.miembro_id)

  if (!miembro || miembro.estado !== 'activo') continue

  const cedula = String(miembro.cedula || '')
    .replace(/[\s.-]/g, '')

  if (!/^\d{10}$/.test(cedula)) {
    sinCedula.push(miembro.codigo_acceso)
    continue
  }

  const usuario = usuarios.get(cuenta.auth_user_id)

  if (
    !usuario ||
    usuario.app_metadata?.mak_tipo_usuario !== 'socio' ||
    String(usuario.app_metadata?.miembro_id) !== String(miembro.id)
  ) {
    throw new Error(
      `Identidad Auth inconsistente para código ${miembro.codigo_acceso}.`
    )
  }

  candidatos.push({
    miembro,
    cuenta,
    cedula
  })
}

console.log('Proyecto:', new URL(url).hostname)
console.log('Socios registrados:', miembros.length)
console.log('Cuentas existentes:', cuentas.length)
console.log('Cuentas elegibles:', candidatos.length)
console.log('Sin cédula válida:', sinCedula.length)

if (sinCedula.length) {
  console.log(
    'Revisar códigos:',
    sinCedula.join(', ')
  )
}

if (modo === 'revisar') {
  console.log('SIMULACIÓN: no se modificó ninguna contraseña.')
  process.exit(0)
}

const seleccionados = modo === 'socio'
  ? candidatos.filter(
      x => String(x.miembro.codigo_acceso).trim().toUpperCase() ===
        String(process.argv[3]).trim().toUpperCase()
    )
  : candidatos

if (!seleccionados.length) {
  throw new Error('No existen cuentas elegibles para esta operación.')
}

let actualizadas = 0
let errores = 0

for (const x of seleccionados) {
  // Actualizar la contraseña exclusivamente en Supabase Auth.
  const cambio = await admin.auth.admin.updateUserById(
    x.cuenta.auth_user_id,
    { password: x.cedula }
  )

  if (cambio.error) {
    console.error(
      'Error Auth en código:',
      x.miembro.codigo_acceso,
      cambio.error.code || cambio.error.message
    )
    errores++
    continue
  }

  const estado = await admin
    .from('socio_cuentas_app')
    .update({
      tipo_clave_inicial: 'cedula',
      cambio_clave_obligatorio: false,
      clave_cambiada: false,
      aviso_cambio_clave_visto: false
    })
    .eq('miembro_id', x.miembro.id)
    .eq('tipo_clave_inicial', 'aleatoria')
    .eq('clave_cambiada', false)

  if (estado.error) {
    console.error(
      'Revisar estado de cuenta:',
      x.miembro.codigo_acceso,
      estado.error.message
    )
    errores++
    continue
  }

  actualizadas++
  console.log(
    `Actualizada ${actualizadas}/${seleccionados.length}:`,
    x.miembro.codigo_acceso
  )
}

console.log('TOTAL ACTUALIZADAS:', actualizadas)
console.log('INCIDENCIAS:', errores)

if (errores) process.exitCode = 1
