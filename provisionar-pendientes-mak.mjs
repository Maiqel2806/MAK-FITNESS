// MAK_AUTO_ACCESO_V1 - regularizar socios creados antes de la integracion.
import { loadEnvFile } from 'node:process'
import { crearAdminSupabase, provisionarSocio } from './lib/mak-provisionar-socio.mjs'

try { loadEnvFile('.env.local') }
catch { throw new Error('No se pudo cargar .env.local') }

const modo = process.argv[2] || 'revisar'
if (!['revisar', 'socio', 'aplicar'].includes(modo)) {
  throw new Error('Modos validos: revisar | socio CODIGO | aplicar CONFIRMO')
}
if (modo === 'aplicar' && process.argv[3] !== 'CONFIRMO') {
  throw new Error('Debes ejecutar: aplicar CONFIRMO')
}
if (modo === 'socio' && !process.argv[3]) {
  throw new Error('Debes indicar un codigo MAK.')
}

const admin = crearAdminSupabase()
async function leerTabla(tabla, campos) {
  const todos = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await admin.from(tabla).select(campos).range(desde, desde + 999)
    if (error) throw error
    todos.push(...data)
    if (data.length < 1000) break
  }
  return todos
}

const [miembros, cuentas] = await Promise.all([
  leerTabla('miembros', 'id, codigo_acceso, cedula, estado'),
  leerTabla('socio_cuentas_app', 'miembro_id')
])
const cuentasExistentes = new Set(cuentas.map(c => c.miembro_id))
const pendientes = miembros.filter(m => m.estado === 'activo' && !cuentasExistentes.has(m.id))
const validos = pendientes.filter(m => /^\d{10}$/.test(String(m.cedula || '').replace(/[.\s-]/g, '')))
const sinDocumento = pendientes.filter(m => !/^\d{10}$/.test(String(m.cedula || '').replace(/[.\s-]/g, '')))
console.log('Cuentas registradas:', cuentas.length)
console.log('Miembros activos sin cuenta:', pendientes.length)
console.log('Con cedula elegible:', validos.length)
console.log('Sin documento valido:', sinDocumento.map(m => m.codigo_acceso).join(', ') || 'ninguno')

if (modo === 'revisar') {
  console.log('SIMULACION: no se modifico ninguna cuenta.')
  process.exit(0)
}
const elegidos = modo === 'socio'
  ? validos.filter(m => String(m.codigo_acceso).trim() === String(process.argv[3]).trim())
  : validos
if (!elegidos.length) {
  console.log('No hay socios elegibles para este modo. Sin cambios.')
  process.exit(0)
}
let errores = 0
for (const socio of elegidos) {
  try {
    const resultado = await provisionarSocio(admin, socio.id)
    console.log('OK:', socio.codigo_acceso, resultado.creada ? 'creada' : 'existente')
  } catch (e) {
    console.error('ERROR:', socio.codigo_acceso, e.message)
    errores++
  }
}
console.log('Finalizado. Incidencias:', errores)
if (errores) process.exitCode = 1
