import fs from 'node:fs'
import path from 'node:path'

const archivo = path.join(
  process.cwd(),
  'app',
  'membresias',
  'page.js'
)

if (!fs.existsSync(archivo)) {
  console.error('ERROR: No se encontró app/membresias/page.js')
  console.error('Ejecuta el script desde la carpeta donde está package.json.')
  process.exit(1)
}

const original = fs.readFileSync(archivo, 'utf8')
let codigo = original

function error(mensaje) {
  console.error(`ERROR: ${mensaje}`)
  console.error('No se modificó page.js.')
  process.exit(1)
}

if (
  codigo.includes(
    'const [filtroMesVencidas, setFiltroMesVencidas]'
  )
) {
  console.log('El filtro mensual ya está instalado.')
  process.exit(0)
}

// ============================================================
// 1. FUNCIONES PARA LOS MESES
// ============================================================

const marcadorSumarDias = 'function sumarDias(fecha, dias) {'

if (!codigo.includes(marcadorSumarDias)) {
  error('No se encontró function sumarDias().')
}

codigo = codigo.replace(
  marcadorSumarDias,
  `function obtenerMesActual() {
  return obtenerFechaHoy().slice(0, 7)
}

function formatearMes(valor) {
  if (!valor || valor === 'todas') {
    return 'Todas las caducadas'
  }

  const [year, month] = valor.split('-').map(Number)

  const fecha = new Date(
    year,
    month - 1,
    1
  )

  const texto = new Intl.DateTimeFormat(
    'es-EC',
    {
      month: 'long',
      year: 'numeric',
    }
  ).format(fecha)

  return (
    texto.charAt(0).toUpperCase() +
    texto.slice(1)
  )
}

function sumarDias(fecha, dias) {`
)

// ============================================================
// 2. CREAR ESTADO DEL FILTRO
// ============================================================

const regexFiltroEstado =
  /(\s*const\s+\[filtroEstado,\s*setFiltroEstado\]\s*=\s*useState\(\s*['"]activa['"]\s*\)\s*)/

const coincidenciaFiltroEstado =
  codigo.match(regexFiltroEstado)

if (!coincidenciaFiltroEstado) {
  error('No se encontró filtroEstado.')
}

codigo = codigo.replace(
  regexFiltroEstado,
  `$1
  const [filtroMesVencidas, setFiltroMesVencidas] = useState(
    obtenerMesActual()
  )
`
)

// ============================================================
// 3. GENERAR LISTA DE MESES CON CADUCADOS
// ============================================================

const marcadorFiltradas =
  '  const membresiasFiltradas = useMemo(() => {'

if (!codigo.includes(marcadorFiltradas)) {
  error('No se encontró membresiasFiltradas.')
}

codigo = codigo.replace(
  marcadorFiltradas,
  `  const mesesDisponiblesVencidas = useMemo(() => {
    const meses = new Set([
      obtenerMesActual(),
    ])

    Array.from(
      ultimaMembresiaVencidaPorSocio.values()
    ).forEach((membresia) => {
      if (
        idsSociosConMembresiaActualOFutura.has(
          membresia.miembro_id
        )
      ) {
        return
      }

      const fechaFin = String(
        membresia.fecha_fin || ''
      )

      if (fechaFin.length >= 7) {
        meses.add(
          fechaFin.slice(0, 7)
        )
      }
    })

    return Array.from(meses).sort(
      (a, b) => b.localeCompare(a)
    )
  }, [
    ultimaMembresiaVencidaPorSocio,
    idsSociosConMembresiaActualOFutura,
  ])

  const membresiasFiltradas = useMemo(() => {`
)

// ============================================================
// 4. REEMPLAZAR COMPLETAMENTE LA LÓGICA DE VENCIDAS
// ============================================================

const regexVencidas =
  /(\}\s*else if\s*\(\s*filtroEstado\s*===\s*['"]vencida['"]\s*\)\s*\{)[\s\S]*?(?=\}\s*else if\s*\(\s*filtroEstado\s*===\s*['"]todas['"]\s*\)\s*\{)/

if (!regexVencidas.test(codigo)) {
  error(
    'No se encontró la sección "vencida" dentro de membresiasFiltradas.'
  )
}

codigo = codigo.replace(
  regexVencidas,
  `} else if (filtroEstado === 'vencida') {
        const ultimaVencida =
          ultimaMembresiaVencidaPorSocio.get(
            membresia.miembro_id
          )

        const coincideMes =
          filtroMesVencidas === 'todas' ||
          String(
            membresia.fecha_fin || ''
          ).startsWith(
            filtroMesVencidas
          )

        coincideEstado =
          membresia.estado_real === 'vencida' &&
          !idsSociosConMembresiaActualOFutura.has(
            membresia.miembro_id
          ) &&
          ultimaVencida?.id === membresia.id &&
          coincideMes
      `
)

// ============================================================
// 5. AGREGAR filtroMesVencidas AL useMemo
// ============================================================

const inicioFiltradas =
  codigo.indexOf(
    'const membresiasFiltradas = useMemo'
  )

const finFiltradas =
  codigo.indexOf(
    'const miembrosActivos',
    inicioFiltradas
  )

if (
  inicioFiltradas === -1 ||
  finFiltradas === -1
) {
  error(
    'No se pudo localizar completamente membresiasFiltradas.'
  )
}

let bloqueFiltradas =
  codigo.slice(
    inicioFiltradas,
    finFiltradas
  )

if (
  !bloqueFiltradas.includes(
    'filtroMesVencidas,'
  )
) {
  const regexDependencia =
    /(\n\s*filtroEstado,\s*\n)/

  if (!regexDependencia.test(bloqueFiltradas)) {
    error(
      'No se encontró filtroEstado en las dependencias.'
    )
  }

  bloqueFiltradas =
    bloqueFiltradas.replace(
      regexDependencia,
      `$1    filtroMesVencidas,\n`
    )

  codigo =
    codigo.slice(0, inicioFiltradas) +
    bloqueFiltradas +
    codigo.slice(finFiltradas)
}

// ============================================================
// 6. CONTADOR PARA EL MES SELECCIONADO
// ============================================================

const indiceContador =
  codigo.indexOf(
    'const membresiasVencidas ='
  )

const indiceSuspendidas =
  codigo.indexOf(
    'const membresiasSuspendidas =',
    indiceContador
  )

if (
  indiceContador === -1 ||
  indiceSuspendidas === -1
) {
  error(
    'No se encontró el contador de membresías vencidas.'
  )
}

const antesSuspendidas =
  codigo.slice(0, indiceSuspendidas)

const despuesSuspendidas =
  codigo.slice(indiceSuspendidas)

codigo =
  antesSuspendidas +
  `const membresiasVencidasPeriodo = Array.from(
    ultimaMembresiaVencidaPorSocio.values()
  ).filter(
    (item) =>
      !idsSociosConMembresiaActualOFutura.has(
        item.miembro_id
      ) &&
      (
        filtroMesVencidas === 'todas' ||
        String(
          item.fecha_fin || ''
        ).startsWith(
          filtroMesVencidas
        )
      )
  ).length

  ` +
  despuesSuspendidas

// ============================================================
// 7. INSERTAR SELECTOR DE MES EN LA INTERFAZ
// ============================================================

const indiceTitulo =
  codigo.indexOf('Listado de membresías')

if (indiceTitulo === -1) {
  error(
    'No se encontró el título Listado de membresías.'
  )
}

const indiceCarga =
  codigo.indexOf(
    '{cargando ? (',
    indiceTitulo
  )

if (indiceCarga === -1) {
  error(
    'No se encontró el listado visual de membresías.'
  )
}

const filtroVisual = `
        {filtroEstado === 'vencida' && (
          <div className="mx-4 mt-4 flex flex-col gap-3 rounded-xl border border-red-100 bg-red-50/50 p-4 sm:flex-row sm:items-center sm:justify-between md:mx-5">

            <div>
              <p className="text-sm font-semibold text-gray-900">
                Filtrar socios caducados
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {filtroMesVencidas === 'todas'
                  ? \`\${membresiasVencidasPeriodo} socio\${membresiasVencidasPeriodo === 1 ? '' : 's'} sin renovar en total\`
                  : \`\${membresiasVencidasPeriodo} socio\${membresiasVencidasPeriodo === 1 ? '' : 's'} sin renovar en \${formatearMes(filtroMesVencidas).toLowerCase()}\`}
              </p>
            </div>

            <select
              value={filtroMesVencidas}
              onChange={(e) =>
                setFiltroMesVencidas(
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 outline-none focus:border-black sm:w-auto"
            >
              <option value="todas">
                Todas las caducadas ({membresiasVencidas})
              </option>

              {mesesDisponiblesVencidas.map(
                (mes) => (
                  <option
                    key={mes}
                    value={mes}
                  >
                    {formatearMes(mes)}
                    {mes === obtenerMesActual()
                      ? ' (mes actual)'
                      : ''}
                  </option>
                )
              )}
            </select>

          </div>
        )}

        `

codigo =
  codigo.slice(0, indiceCarga) +
  filtroVisual +
  codigo.slice(indiceCarga)

// ============================================================
// 8. VALIDAR ANTES DE GUARDAR
// ============================================================

const comprobaciones = [
  'filtroMesVencidas',
  'mesesDisponiblesVencidas',
  'membresiasVencidasPeriodo',
  'coincideMes',
  'Todas las caducadas',
]

for (const comprobacion of comprobaciones) {
  if (!codigo.includes(comprobacion)) {
    error(
      `Falló la validación final: ${comprobacion}`
    )
  }
}

// ============================================================
// 9. RESPALDO
// ============================================================

const respaldo =
  `${archivo}.antes-filtro-mensual.bak`

fs.copyFileSync(
  archivo,
  respaldo
)

fs.writeFileSync(
  archivo,
  codigo,
  'utf8'
)

console.log('')
console.log('========================================')
console.log(' FILTRO DE CADUCADAS INSTALADO')
console.log('========================================')
console.log('')
console.log('Archivo modificado:')
console.log(archivo)
console.log('')
console.log('Respaldo:')
console.log(respaldo)
console.log('')
console.log('Ahora ejecuta:')
console.log('')
console.log('npm run dev')
console.log('')