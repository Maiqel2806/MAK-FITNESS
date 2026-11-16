
from pathlib import Path
import os
import shutil
import sys
import tempfile

# Mejora exclusiva de la lista en Membresías.
# Ejecutar desde la raíz de gimnasio-admin.
ARCHIVO = Path('app/membresias/page.js')
RESPALDO = Path('app/membresias/page.js.antes-paginacion.bak')
MARCADOR = 'MAK_MEMBRESIAS_PAGINACION_PRECIO_V1'


def detener(mensaje):
    raise SystemExit(
        f'ERROR: {mensaje}\nNo se modificó ningún archivo.'
    )


if not ARCHIVO.is_file():
    detener(
        f'No se encontró {ARCHIVO}. '
        'Ejecuta desde la raíz del proyecto.'
    )

original = ARCHIVO.read_bytes()

try:
    codigo = original.decode('utf-8')
except UnicodeError:
    detener('No se pudo leer el archivo como UTF-8.')

salto = '\r\n' if '\r\n' in codigo else '\n'
codigo = codigo.replace('\r\n', '\n')

if MARCADOR in codigo:
    print(
        'La paginación y el orden por precio ya están aplicados. '
        'Sin cambios.'
    )
    sys.exit(0)


def cambiar_una(viejo, nuevo, descripcion):
    global codigo

    if codigo.count(viejo) != 1:
        detener(
            f'{descripcion}: se esperaba una coincidencia '
            f'y se encontraron {codigo.count(viejo)}.'
        )

    codigo = codigo.replace(viejo, nuevo, 1)


# ============================================================
# 1. ESTADO DE PAGINACIÓN
# ============================================================

cambiar_una(
    "  const [filtroEstado, setFiltroEstado] = useState('activa')\n",
    "  const [filtroEstado, setFiltroEstado] = useState('activa')\n"
    "  const [paginaMembresias, setPaginaMembresias] = useState(1)\n",
    'Estado de paginación',
)


# ============================================================
# 2. ORDEN AUTOMÁTICO Y DIEZ REGISTROS POR PÁGINA
# ============================================================

logica = '''  // MAK_MEMBRESIAS_PAGINACION_PRECIO_V1
  const membresiasOrdenadas = useMemo(() => {
    const listado = [...membresiasFiltradas]

    if (filtroEstado === 'activa') {
      listado.sort((a, b) => {
        const precioA = Number(a.plan_precio_snapshot || a.planes?.precio || 0)
        const precioB = Number(b.plan_precio_snapshot || b.planes?.precio || 0)
        const diferencia = precioB - precioA

        if (diferencia !== 0) return diferencia

        const nombreA = `${a.miembros?.nombre || ''} ${a.miembros?.apellido || ''}`
        const nombreB = `${b.miembros?.nombre || ''} ${b.miembros?.apellido || ''}`

        return nombreA.localeCompare(nombreB, 'es')
      })
    }

    return listado
  }, [membresiasFiltradas, filtroEstado])

  const totalPaginasMembresias = Math.max(
    1,
    Math.ceil(membresiasOrdenadas.length / 10)
  )

  const paginaMembresiasVisible = Math.min(
    paginaMembresias,
    totalPaginasMembresias
  )

  const membresiasPaginadas = useMemo(() => {
    const inicio = (paginaMembresiasVisible - 1) * 10

    return membresiasOrdenadas.slice(inicio, inicio + 10)
  }, [membresiasOrdenadas, paginaMembresiasVisible])

  const paginasVisiblesMembresias = Array.from(
    { length: totalPaginasMembresias },
    (_, indice) => indice + 1
  ).filter((pagina) =>
    pagina === 1 ||
    pagina === totalPaginasMembresias ||
    Math.abs(pagina - paginaMembresiasVisible) <= 1
  )

  useEffect(() => {
    setPaginaMembresias(1)
  }, [filtroEstado, busqueda, filtroMesVencidas])

'''

cambiar_una(
    '  const miembrosActivos = miembros.filter(\n',
    logica + '  const miembrosActivos = miembros.filter(\n',
    'Insertar orden y paginación',
)


# ============================================================
# 3. APLICAR PAGINACIÓN EN MÓVIL Y ESCRITORIO
# ============================================================

ancla_lista = 'membresiasFiltradas.map((membresia) => {'

if codigo.count(ancla_lista) != 2:
    detener(
        'No se encontraron exactamente los dos listados '
        '(móvil y escritorio).'
    )

codigo = codigo.replace(
    ancla_lista,
    'membresiasPaginadas.map((membresia) => {'
)


# ============================================================
# 4. BARRA DE NAVEGACIÓN
# ============================================================

pie_original = '''            </div>
          </>
        )}
      </div>
    </div>
  )
}
'''

pie_nuevo = '''            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
              <p className="text-sm text-gray-600">
                Mostrando <span className="font-semibold">{(paginaMembresiasVisible - 1) * 10 + 1}</span>
                {' - '}
                <span className="font-semibold">{Math.min(paginaMembresiasVisible * 10, membresiasOrdenadas.length)}</span>
                {' de '}
                <span className="font-semibold">{membresiasOrdenadas.length}</span> membresías

                {filtroEstado === 'activa' && (
                  <span className="ml-2 text-xs text-gray-500">
                    · Mayor precio primero
                  </span>
                )}
              </p>

              {totalPaginasMembresias > 1 && (
                <nav
                  aria-label="Páginas de membresías"
                  className="flex flex-wrap items-center gap-1.5"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setPaginaMembresias(
                        Math.max(1, paginaMembresiasVisible - 1)
                      )
                    }
                    disabled={paginaMembresiasVisible === 1}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Anterior
                  </button>

                  {paginasVisiblesMembresias.map((pagina, indice) => (
                    <span
                      key={pagina}
                      className="inline-flex items-center gap-1.5"
                    >
                      {indice > 0 &&
                        pagina - paginasVisiblesMembresias[indice - 1] > 1 && (
                          <span className="px-1 text-sm text-gray-400">
                            …
                          </span>
                        )}

                      <button
                        type="button"
                        onClick={() => setPaginaMembresias(pagina)}
                        aria-label={`Ir a la página ${pagina}`}
                        aria-current={
                          pagina === paginaMembresiasVisible
                            ? 'page'
                            : undefined
                        }
                        className={`min-w-9 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                          pagina === paginaMembresiasVisible
                            ? 'border-black bg-black text-white'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pagina}
                      </button>
                    </span>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setPaginaMembresias(
                        Math.min(
                          totalPaginasMembresias,
                          paginaMembresiasVisible + 1
                        )
                      )
                    }
                    disabled={
                      paginaMembresiasVisible === totalPaginasMembresias
                    }
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </nav>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
'''

cambiar_una(
    pie_original.rstrip('\n'),
    pie_nuevo.rstrip('\n'),
    'Insertar barra de páginas',
)


# ============================================================
# 5. VALIDACIONES ANTES DE GUARDAR
# ============================================================

if (
    codigo.count(MARCADOR) != 1
    or codigo.count('membresiasPaginadas.map(') != 2
):
    detener('Falló la validación de la mejora.')

for funcion in [
    'async function guardarMembresia(evento)',
    'function renovarMembresia(membresia)',
    "supabase.rpc('registrar_membresia_inteligente'",
]:
    if funcion not in codigo:
        detener(f'Falta la función existente: {funcion}')


# ============================================================
# 6. RESPALDO Y ESCRITURA ATÓMICA
# ============================================================

if not RESPALDO.exists():
    shutil.copy2(ARCHIVO, RESPALDO)

fd, temporal = tempfile.mkstemp(
    prefix='page.',
    suffix='.tmp',
    dir=str(ARCHIVO.parent),
)

os.close(fd)

try:
    Path(temporal).write_bytes(
        codigo.replace('\n', salto).encode('utf-8')
    )

    os.replace(temporal, ARCHIVO)
finally:
    if os.path.exists(temporal):
        os.unlink(temporal)


print('\nMEJORA DE MEMBRESÍAS APLICADA CORRECTAMENTE')
print(' - 10 membresías por página en móvil y escritorio.')
print(' - Vigentes: precio de mayor a menor.')
print(' - Orden automático al registrar nuevas membresías.')
print(' - Filtros, búsqueda, renovaciones y roles conservados.')
print(f' - Respaldo: {RESPALDO}')