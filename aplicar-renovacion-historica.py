from pathlib import Path
import shutil, sys

PATH = Path('app/membresias/page.js')
MARKER = 'MAK_RENOVACION_HISTORICA_V1'


def fail(msg):
    print('\nERROR:', msg)
    print('No se modificó app/membresias/page.js.')
    sys.exit(1)


def rep_once(text, old, new, label):
    count = text.count(old)

    if count != 1:
        fail(
            f'{label}: se esperaba 1 coincidencia '
            f'y se encontraron {count}.'
        )

    return text.replace(old, new, 1)


if not PATH.is_file():
    fail(
        'Ejecuta este script desde la raíz '
        'del proyecto gimnasio-admin.'
    )


raw = PATH.read_bytes()

newline = '\r\n' if b'\r\n' in raw else '\n'

text = (
    raw
    .decode('utf-8')
    .replace('\r\n', '\n')
)


if MARKER in text:
    print(
        '\nRENOVACIÓN HISTÓRICA '
        'YA ESTÁ APLICADA'
    )
    sys.exit(0)


required = [
    'MAK_PAGOS_SEGUROS_V1',
    'registrar_membresia_con_pagos',
    'corregir_pago_mak',
    'pagos_historial',
    'MAK_MEMBRESIAS_PAGINACION_PRECIO_V1',
]


for item in required:
    if item not in text:
        fail(
            f'Falta requisito previo: {item}'
        )


# ============================================================
# 1. FORMULARIO BASE
# ============================================================

old = """const membresiaInicial = {
  miembro_id: '',
  plan_id: '',
  fecha_inicio: obtenerFechaHoy(),
  notas: '',
  renovacion_de_membresia_id: null,
  operacion_id: '',
  pagos: [crearPagoMembresia()],
}
"""

new = """const membresiaInicial = {
  miembro_id: '',
  plan_id: '',
  fecha_inicio: obtenerFechaHoy(),
  notas: '',
  renovacion_de_membresia_id: null,
  mantener_mismo_plan: null,
  plan_historico_nombre: '',
  plan_historico_precio: '',
  plan_historico_duracion_dias: null,
  plan_historico_duracion_meses: null,
  operacion_id: '',
  pagos: [crearPagoMembresia()],
}
"""

text = rep_once(
    text,
    old,
    new,
    'formulario base'
)


# ============================================================
# 2. ESTADOS
# ============================================================

old = """  const [detallePagos, setDetallePagos] = useState(null)
  const [historialPagos, setHistorialPagos] = useState([])
  const [cargandoHistorialPagos, setCargandoHistorialPagos] = useState(false)
"""

new = """  // MAK_RENOVACION_HISTORICA_V1
  const [confirmacionRenovacion, setConfirmacionRenovacion] = useState(null)
  const [detallePagos, setDetallePagos] = useState(null)
  const [historialPagos, setHistorialPagos] = useState([])
  const [historialRenovaciones, setHistorialRenovaciones] = useState([])
  const [cargandoHistorialPagos, setCargandoHistorialPagos] = useState(false)
  const [cargandoHistorialRenovaciones, setCargandoHistorialRenovaciones] = useState(false)
"""

text = rep_once(
    text,
    old,
    new,
    'estados renovación'
)


# ============================================================
# 3. RESET AL CAMBIAR SOCIO
# ============================================================

old = """      if (campo === 'miembro_id') {
        nuevo.fecha_inicio = valor ? calcularFechaInicioInteligente(valor) : obtenerFechaHoy()
        nuevo.renovacion_de_membresia_id = null
      }
"""

new = """      if (campo === 'miembro_id') {
        nuevo.fecha_inicio = valor ? calcularFechaInicioInteligente(valor) : obtenerFechaHoy()
        nuevo.renovacion_de_membresia_id = null
        nuevo.mantener_mismo_plan = null
        nuevo.plan_historico_nombre = ''
        nuevo.plan_historico_precio = ''
        nuevo.plan_historico_duracion_dias = null
        nuevo.plan_historico_duracion_meses = null
      }
"""

text = rep_once(
    text,
    old,
    new,
    'actualizar socio'
)


# ============================================================
# 4. RENOVACIÓN CON DECISIÓN
# ============================================================

start = text.find(
    "  function renovarMembresia(membresia) {\n"
)

end = text.find(
    "  function limpiarMembresia() {\n",
    start
)


if start == -1 or end == -1:
    fail(
        'No se encontró el bloque '
        'renovarMembresia/limpiarMembresia.'
    )


replacement = r'''  function esMembresiaMensualHistorica(membresia) {
    const mesesSnapshot = Number(
      membresia.plan_duracion_meses_snapshot || 0
    )

    if (mesesSnapshot === 1) {
      return true
    }

    return (
      !membresia.plan_duracion_meses_snapshot &&
      Number(
        membresia.plan_duracion_dias_snapshot || 0
      ) === 30
    )
  }

  function prepararFormularioRenovacion(
    membresia,
    mantenerMismoPlan
  ) {
    const fechaInicio =
      calcularFechaInicioInteligente(
        membresia.miembro_id
      )

    const precioHistorico = Number(
      membresia.plan_precio_snapshot ??
      membresia.planes?.precio ??
      0
    )

    const nombreHistorico =
      membresia.plan_nombre_snapshot ||
      membresia.planes?.nombre ||
      'Plan registrado'

    setFormMembresia({
      ...membresiaInicial,

      miembro_id:
        membresia.miembro_id,

      plan_id:
        mantenerMismoPlan
          ? (
              membresia.plan_id ||
              ''
            )
          : '',

      fecha_inicio:
        fechaInicio,

      notas:
        mantenerMismoPlan
          ? `Renovación conservando ${nombreHistorico} por ${formatearDinero(precioHistorico)}.`
          : `Renovación con cambio de plan desde ${nombreHistorico}.`,

      renovacion_de_membresia_id:
        membresia.id,

      mantener_mismo_plan:
        Boolean(
          mantenerMismoPlan
        ),

      plan_historico_nombre:
        nombreHistorico,

      plan_historico_precio:
        precioHistorico,

      plan_historico_duracion_dias:
        membresia
          .plan_duracion_dias_snapshot ??
        null,

      plan_historico_duracion_meses:
        membresia
          .plan_duracion_meses_snapshot ??
        (
          Number(
            membresia
              .plan_duracion_dias_snapshot ||
            0
          ) === 30
            ? 1
            : null
        ),

      operacion_id:
        crearIdOperacion(),

      pagos: [
        crearPagoMembresia(
          mantenerMismoPlan
            ? precioHistorico
            : ''
        ),
      ],
    })

    setConfirmacionRenovacion(
      null
    )

    cerrarFormularios()

    setMostrarMembresia(
      true
    )

    setError('')

    if (mantenerMismoPlan) {

      setMensaje(
        `Se conservarán el plan y el precio histórico: ${nombreHistorico} · ${formatearDinero(precioHistorico)}.`
      )

    } else if (
      esMembresiaMensualHistorica(
        membresia
      )
    ) {

      setMensaje(
        `Selecciona uno de los planes activos actuales. No se conservará automáticamente ${nombreHistorico}.`
      )

    } else {

      setMensaje(
        `El plan anterior (${nombreHistorico}) no es mensual y no se renueva automáticamente. Selecciona un plan activo actual.`
      )
    }

    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    }, 100)
  }

  function renovarMembresia(
    membresia
  ) {
    setError('')
    setMensaje('')

    if (
      esMembresiaMensualHistorica(
        membresia
      )
    ) {

      cerrarFormularios()

      setConfirmacionRenovacion(
        membresia
      )

      return
    }

    prepararFormularioRenovacion(
      membresia,
      false
    )
  }

'''

text = (
    text[:start] +
    replacement +
    text[end:]
)


# ============================================================
# 5. VALIDACIÓN DEL GUARDADO
# ============================================================

old = """    const plan = planes.find((item) => item.id === formMembresia.plan_id)

    if (!formMembresia.miembro_id) {
      setError('Debes seleccionar un miembro.')
      setGuardandoMembresia(false)
      return
    }

    if (!plan) {
      setError('Debes seleccionar un plan válido.')
      setGuardandoMembresia(false)
      return
    }

    if (plan.es_upgrade || plan.codigo === 'MENSUAL_FIDELIZACION') {
      setError('El mensual fidelización no se registra directamente. Usa el botón “Ampliar a mensual fidelización” desde un plan semanal fidelización vigente.')
      setGuardandoMembresia(false)
      return
    }

    if (!formMembresia.fecha_inicio) {
      setError('La fecha de inicio es obligatoria.')
      setGuardandoMembresia(false)
      return
    }

    const errorPagos = validarPagosMembresia(
      formMembresia.pagos,
      plan.precio,
      esAdminPagos
    )
"""

new = """    const esRenovacion = Boolean(
      formMembresia
        .renovacion_de_membresia_id
    )

    const mantenerMismoPlan =
      esRenovacion &&
      formMembresia
        .mantener_mismo_plan === true

    const plan = planes.find(
      (item) =>
        item.id ===
        formMembresia.plan_id
    )

    if (!formMembresia.miembro_id) {
      setError(
        'Debes seleccionar un miembro.'
      )

      setGuardandoMembresia(false)
      return
    }

    if (
      esRenovacion &&
      formMembresia
        .mantener_mismo_plan === null
    ) {

      setError(
        'Debes indicar si la renovación conserva el plan anterior o cambia de plan.'
      )

      setGuardandoMembresia(false)
      return
    }

    if (
      !mantenerMismoPlan &&
      !plan
    ) {

      setError(
        'Debes seleccionar un plan válido.'
      )

      setGuardandoMembresia(false)
      return
    }

    if (
      !mantenerMismoPlan &&
      (
        plan.es_upgrade ||
        plan.codigo ===
          'MENSUAL_FIDELIZACION'
      )
    ) {

      setError(
        'El mensual fidelización no se registra directamente. Usa el botón “Ampliar a mensual fidelización” desde un plan semanal fidelización vigente.'
      )

      setGuardandoMembresia(false)
      return
    }

    if (!formMembresia.fecha_inicio) {

      setError(
        'La fecha de inicio es obligatoria.'
      )

      setGuardandoMembresia(false)
      return
    }

    const precioObjetivo =
      mantenerMismoPlan
        ? Number(
            formMembresia
              .plan_historico_precio ||
            0
          )
        : Number(
            plan?.precio ||
            0
          )

    const errorPagos =
      validarPagosMembresia(
        formMembresia.pagos,
        precioObjetivo,
        esAdminPagos
      )
"""

text = rep_once(
    text,
    old,
    new,
    'validación guardar membresía'
)


# ============================================================
# 6. RPC DE RENOVACIÓN
# ============================================================

old = """    const { error } = await supabase.rpc('registrar_membresia_con_pagos', {
      p_miembro_id: formMembresia.miembro_id,
      p_plan_id: formMembresia.plan_id,
      p_pagos: pagosOperacion,
      p_fecha_inicio_manual: formMembresia.fecha_inicio,
      p_renovacion_de_membresia_id: formMembresia.renovacion_de_membresia_id || null,
      p_notas: formMembresia.notas || null,
      p_operacion_id: operacionId,
    })

    if (error) {
"""

new = """    const respuestaRegistro =
      esRenovacion

        ? await supabase.rpc(
            'registrar_renovacion_con_pagos',
            {
              p_miembro_id:
                formMembresia.miembro_id,

              p_membresia_anterior_id:
                formMembresia
                  .renovacion_de_membresia_id,

              p_mantener_mismo_plan:
                mantenerMismoPlan,

              p_plan_nuevo_id:
                mantenerMismoPlan
                  ? null
                  : formMembresia.plan_id,

              p_pagos:
                pagosOperacion,

              p_notas:
                formMembresia.notas ||
                null,

              p_operacion_id:
                operacionId,
            }
          )

        : await supabase.rpc(
            'registrar_membresia_con_pagos',
            {
              p_miembro_id:
                formMembresia.miembro_id,

              p_plan_id:
                formMembresia.plan_id,

              p_pagos:
                pagosOperacion,

              p_fecha_inicio_manual:
                formMembresia.fecha_inicio,

              p_renovacion_de_membresia_id:
                null,

              p_notas:
                formMembresia.notas ||
                null,

              p_operacion_id:
                operacionId,
            }
          )

    const {
      error,
    } = respuestaRegistro

    if (error) {
"""

text = rep_once(
    text,
    old,
    new,
    'RPC guardar membresía'
)


old = """    setMensaje('Membresía y pagos registrados correctamente.')
"""

new = """    setMensaje(
      esRenovacion
        ? 'Renovación y pagos registrados correctamente. La decisión quedó guardada en el historial.'
        : 'Membresía y pagos registrados correctamente.'
    )
"""

text = rep_once(
    text,
    old,
    new,
    'mensaje guardar'
)


# ============================================================
# 7. CARGAR HISTORIAL DE RENOVACIONES
# ============================================================

anchor = """  async function abrirHistorialPagos(membresia) {
"""

helper = r'''  async function cargarHistorialRenovacionesMiembro(
    miembroId
  ) {
    setCargandoHistorialRenovaciones(
      true
    )

    const {
      data,
      error: errorHistorial,
    } = await supabase
      .from(
        'membresias_renovacion_historial'
      )
      .select(`
        id,
        miembro_id,
        membresia_anterior_id,
        membresia_nueva_id,
        decision,
        plan_anterior_nombre,
        plan_anterior_precio,
        plan_nuevo_nombre,
        plan_nuevo_precio,
        fecha_inicio_anterior,
        fecha_fin_anterior,
        fecha_inicio_nueva,
        fecha_fin_nueva,
        motivo,
        realizado_por,
        fecha_evento
      `)
      .eq(
        'miembro_id',
        miembroId
      )
      .order(
        'fecha_evento',
        {
          ascending: false,
        }
      )

    setCargandoHistorialRenovaciones(
      false
    )

    if (errorHistorial) {
      throw new Error(
        errorHistorial.message
      )
    }

    setHistorialRenovaciones(
      data || []
    )
  }

'''

if text.count(anchor) != 1:
    fail(
        'No se encontró '
        'abrirHistorialPagos.'
    )


text = text.replace(
    anchor,
    helper + anchor,
    1
)


old = """    setDetallePagos(membresia)
    setHistorialPagos([])
    setPagoCorreccion(null)
    setCargandoHistorialPagos(true)
    setError('')

    try {
      await cargarHistorialPagosMembresia(membresia.id)
    } catch (errorHistorial) {
      setError(errorHistorial.message)
    } finally {
      setCargandoHistorialPagos(false)
    }
"""

new = """    setDetallePagos(membresia)
    setHistorialPagos([])
    setHistorialRenovaciones([])
    setPagoCorreccion(null)
    setCargandoHistorialPagos(true)
    setError('')

    try {

      await Promise.all([
        cargarHistorialPagosMembresia(
          membresia.id
        ),

        cargarHistorialRenovacionesMiembro(
          membresia.miembro_id
        ),
      ])

    } catch (errorHistorial) {

      setError(
        errorHistorial.message
      )

    } finally {

      setCargandoHistorialPagos(
        false
      )

      setCargandoHistorialRenovaciones(
        false
      )
    }
"""

text = rep_once(
    text,
    old,
    new,
    'abrir historial'
)


old = """    setDetallePagos(null)
    setHistorialPagos([])
    setPagoCorreccion(null)
"""

new = """    setDetallePagos(null)
    setHistorialPagos([])
    setHistorialRenovaciones([])
    setPagoCorreccion(null)
"""

text = rep_once(
    text,
    old,
    new,
    'cerrar historial'
)


# ============================================================
# 8. VALORES DEL FORMULARIO
# ============================================================

main_return = """  return (
    <div className="w-full max-w-full overflow-x-hidden">
"""

ret = text.find(
    main_return
)

if ret == -1:
    fail(
        'No se encontró el return '
        'principal del componente.'
    )


derived = r'''
  const esRenovacionFormulario =
    Boolean(
      formMembresia
        .renovacion_de_membresia_id
    )

  const mantienePlanHistoricoFormulario =
    esRenovacionFormulario &&
    formMembresia
      .mantener_mismo_plan === true

  const planActualFormulario =
    planes.find(
      (plan) =>
        plan.id ===
        formMembresia.plan_id
    )

  const precioFormularioMembresia =
    mantienePlanHistoricoFormulario
      ? Number(
          formMembresia
            .plan_historico_precio ||
          0
        )
      : Number(
          planActualFormulario
            ?.precio ||
          0
        )

  const planCalculoFormulario =
    mantienePlanHistoricoFormulario

      ? {
          duracion_dias:
            formMembresia
              .plan_historico_duracion_dias,

          duracion_meses:
            formMembresia
              .plan_historico_duracion_meses,
        }

      : planActualFormulario

'''

text = (
    text[:ret] +
    derived +
    text[ret:]
)


# ============================================================
# 9. MODAL SÍ / NO
# ============================================================

anchor = """      {detallePagos && esAdminPagos && (
"""

modal = r'''      {confirmacionRenovacion && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() =>
            setConfirmacionRenovacion(
              null
            )
          }
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Confirmar renovación
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {obtenerNombreSocio(
                    confirmacionRenovacion
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setConfirmacionRenovacion(
                    null
                  )
                }
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
              >
                <X size={19} />
              </button>

            </div>

            <div className="mt-5 rounded-2xl border border-teal-200 bg-teal-50 p-4">

              <p className="text-sm font-semibold text-gray-700">
                Este socio tiene un plan mensual registrado anteriormente:
              </p>

              <p className="mt-2 text-lg font-bold text-gray-900">
                {obtenerNombrePlan(
                  confirmacionRenovacion
                )}
              </p>

              <p className="mt-1 text-sm text-gray-700">
                Precio histórico:{' '}

                <strong>
                  {formatearDinero(
                    confirmacionRenovacion
                      .plan_precio_snapshot ??
                    confirmacionRenovacion
                      .planes?.precio ??
                    0
                  )}
                </strong>
              </p>

            </div>

            <p className="mt-5 text-sm font-semibold text-gray-800">
              ¿Deseas renovar manteniendo el mismo plan y el mismo precio registrado anteriormente?
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">

              <button
                type="button"
                onClick={() =>
                  prepararFormularioRenovacion(
                    confirmacionRenovacion,
                    true
                  )
                }
                className="rounded-xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
              >
                Sí, mantener plan y precio
              </button>

              <button
                type="button"
                onClick={() =>
                  prepararFormularioRenovacion(
                    confirmacionRenovacion,
                    false
                  )
                }
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-800 transition hover:bg-gray-50"
              >
                No, elegir otro plan
              </button>

            </div>

          </div>
        </div>
      )}

'''

if text.count(anchor) != 1:
    fail(
        'No se encontró el punto '
        'de inserción del modal.'
    )


text = text.replace(
    anchor,
    modal + anchor,
    1
)


# ============================================================
# 10. BLOQUEAR SOCIO DURANTE RENOVACIÓN
# ============================================================

old = """              <select
                value={formMembresia.miembro_id}
                onChange={(e) => actualizarMembresia('miembro_id', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
"""

new = """              <select
                value={formMembresia.miembro_id}
                onChange={(e) => actualizarMembresia('miembro_id', e.target.value)}
                disabled={esRenovacionFormulario}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600"
              >
"""

text = rep_once(
    text,
    old,
    new,
    'bloqueo miembro renovación'
)


# ============================================================
# 11. PLAN HISTÓRICO O PLAN ACTUAL
# ============================================================

old = """            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Plan
              </label>
              <select
                value={formMembresia.plan_id}
                onChange={(e) => actualizarMembresia('plan_id', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="">Seleccionar plan</option>
                {planesDisponiblesVenta.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nombre} - {formatearDinero(plan.precio)} - {plan.duracion_dias} días
                    {plan.es_promocion ? ' - PROMO' : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Los planes promocionales solo aparecerán aquí cuando estén activos.
              </p>
            </div>
"""

new = """            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Plan
              </label>

              {mantienePlanHistoricoFormulario ? (

                <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">

                  <p className="text-sm font-bold text-gray-900">
                    {formMembresia.plan_historico_nombre}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-teal-800">
                    Precio histórico conservado:{' '}
                    {formatearDinero(
                      formMembresia
                        .plan_historico_precio ||
                      0
                    )}
                  </p>

                </div>

              ) : (

                <>

                  <select
                    value={formMembresia.plan_id}
                    onChange={(e) =>
                      actualizarMembresia(
                        'plan_id',
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  >

                    <option value="">
                      {esRenovacionFormulario
                        ? 'Seleccionar nuevo plan'
                        : 'Seleccionar plan'}
                    </option>

                    {planesDisponiblesVenta.map(
                      (plan) => (

                        <option
                          key={plan.id}
                          value={plan.id}
                        >
                          {plan.nombre}
                          {' - '}
                          {formatearDinero(
                            plan.precio
                          )}
                          {' - '}
                          {plan.duracion_dias}
                          {' días'}

                          {plan.es_promocion
                            ? ' - PROMO'
                            : ''}
                        </option>

                      )
                    )}

                  </select>

                  <p className="mt-1 text-xs text-gray-500">

                    {esRenovacionFormulario
                      ? 'Al cambiar de plan se aplican el precio y condiciones vigentes del plan seleccionado.'
                      : 'Los planes promocionales solo aparecerán aquí cuando estén activos.'}

                  </p>

                </>

              )}

            </div>
"""

text = rep_once(
    text,
    old,
    new,
    'selector plan renovación'
)


# ============================================================
# 12. FECHA AUTOMÁTICA EN RENOVACIONES
# ============================================================

old = """              <input
                type="date"
                value={formMembresia.fecha_inicio}
                onChange={(e) => actualizarMembresia('fecha_inicio', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
"""

new = """              <input
                type="date"
                value={formMembresia.fecha_inicio}
                onChange={(e) => actualizarMembresia('fecha_inicio', e.target.value)}
                disabled={esRenovacionFormulario}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600"
              />

              {esRenovacionFormulario && (

                <p className="mt-1 text-xs text-gray-500">
                  La fecha de inicio de una renovación se calcula automáticamente para no perder días pagados.
                </p>

              )}
"""

text = rep_once(
    text,
    old,
    new,
    'fecha renovación'
)


# ============================================================
# 13. PRÓXIMA RENOVACIÓN
# ============================================================

old = """                {formMembresia.plan_id
                  ? formatearFecha(
                      calcularFechaRenovacionPlan(
                        formMembresia.fecha_inicio,
                        planes.find(
                          (plan) =>
                            plan.id ===
                            formMembresia.plan_id
                        )
                      )
                    )
                  : 'Selecciona un plan'}
"""

new = """                {planCalculoFormulario
                  ? formatearFecha(
                      calcularFechaRenovacionPlan(
                        formMembresia.fecha_inicio,
                        planCalculoFormulario
                      )
                    )
                  : 'Selecciona un plan'}
"""

text = rep_once(
    text,
    old,
    new,
    'próxima renovación formulario'
)


old = """                precioPlan={
                  planes.find((plan) => plan.id === formMembresia.plan_id)?.precio || 0
                }
"""

new = """                precioPlan={
                  precioFormularioMembresia
                }
"""

text = rep_once(
    text,
    old,
    new,
    'precio editor pagos'
)


# ============================================================
# 14. HISTORIAL VISUAL DE RENOVACIONES
# ============================================================

text = rep_once(
    text,
    """                  Historial de pagos
""",
    """                  Historial de membresía
""",
    'título historial'
)


old = """            {pagoCorreccion && (
"""

renewal_history_ui = r'''            <div className="mt-6 border-t border-gray-200 pt-5">

              <h3 className="text-sm font-bold text-gray-900">
                Historial de renovaciones
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Registra si se conservó el plan/precio anterior o si se cambió a otro plan.
              </p>

              {cargandoHistorialRenovaciones ? (

                <p className="mt-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  Cargando historial de renovaciones...
                </p>

              ) : historialRenovaciones.length === 0 ? (

                <p className="mt-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  Todavía no existen decisiones de renovación registradas con el nuevo historial.
                </p>

              ) : (

                <div className="mt-3 space-y-3">

                  {historialRenovaciones.map(
                    (evento) => (

                      <div
                        key={evento.id}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                      >

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                          <div>

                            <p className="text-sm font-bold text-gray-900">

                              {evento.decision ===
                              'mismo_plan'

                                ? 'Mismo plan y precio histórico'

                                : evento.decision ===
                                  'promo_finalizada_cambio_plan'

                                  ? 'Promoción finalizada · cambio de plan'

                                  : 'Cambio de plan'}

                            </p>

                            <p className="mt-1 text-sm text-gray-700">

                              {evento.plan_anterior_nombre ||
                                'Plan anterior'}

                              {' ('}

                              {formatearDinero(
                                evento.plan_anterior_precio ||
                                0
                              )}

                              {') → '}

                              {evento.plan_nuevo_nombre ||
                                'Plan nuevo'}

                              {' ('}

                              {formatearDinero(
                                evento.plan_nuevo_precio ||
                                0
                              )}

                              {')'}

                            </p>

                            <p className="mt-1 text-xs text-gray-500">

                              Nueva vigencia:{' '}

                              {formatearFecha(
                                evento.fecha_inicio_nueva
                              )}

                              {' → '}

                              {formatearFecha(
                                evento.fecha_fin_nueva
                              )}

                            </p>

                            {evento.motivo && (

                              <p className="mt-2 text-xs text-gray-600">
                                {evento.motivo}
                              </p>

                            )}

                          </div>

                          <p className="text-xs text-gray-500">

                            {evento.fecha_evento

                              ? new Date(
                                  evento.fecha_evento
                                ).toLocaleString(
                                  'es-EC',
                                  {
                                    timeZone:
                                      'America/Guayaquil',

                                    day:
                                      '2-digit',

                                    month:
                                      '2-digit',

                                    year:
                                      'numeric',

                                    hour:
                                      '2-digit',

                                    minute:
                                      '2-digit',
                                  }
                                )

                              : '-'}

                          </p>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

'''

if text.count(old) != 1:
    fail(
        'No se encontró el bloque '
        'de corrección de pago.'
    )


text = text.replace(
    old,
    renewal_history_ui + old,
    1
)


text = text.replace(
    'title="Historial de pagos"',
    'title="Historial de membresía"'
)


text = text.replace(
    """                          Pagos
                        </button>""",
    """                          Historial
                        </button>"""
)


# ============================================================
# 15. VALIDACIONES FINALES
# ============================================================

if text.count(MARKER) != 1:
    fail(
        'Marcador final duplicado o ausente.'
    )


if text.count(
    'registrar_renovacion_con_pagos'
) != 1:
    fail(
        'Cantidad inesperada de llamadas '
        'a registrar_renovacion_con_pagos.'
    )


if text.count(
    'registrar_membresia_con_pagos'
) != 1:
    fail(
        'Se alteró la llamada '
        'de altas normales.'
    )


if text.count(
    'membresias_renovacion_historial'
) != 1:
    fail(
        'Cantidad inesperada '
        'de consultas al historial.'
    )


if text.count(
    'confirmacionRenovacion'
) < 8:
    fail(
        'El modal de confirmación '
        'quedó incompleto.'
    )


if (
    'MAK_MEMBRESIAS_PAGINACION_PRECIO_V1'
    not in text
):
    fail(
        'Se perdió la paginación existente.'
    )


if (
    'pagos_historial'
    not in text
    or
    'corregir_pago_mak'
    not in text
):
    fail(
        'Se perdió el historial/corrección '
        'de pagos existente.'
    )


# ============================================================
# 16. RESPALDO Y ESCRITURA
# ============================================================

backup = PATH.with_name(
    PATH.name +
    '.antes-renovacion-historica.bak'
)


if not backup.exists():
    shutil.copy2(
        PATH,
        backup
    )


tmp = PATH.with_name(
    PATH.name +
    '.tmp-renovacion-historica'
)


try:

    out = (
        text
        .replace(
            '\n',
            newline
        )
        .encode(
            'utf-8'
        )
    )

    tmp.write_bytes(
        out
    )

    tmp.replace(
        PATH
    )

except Exception as exc:

    fail(
        f'No se pudo escribir '
        f'el archivo: {exc}'
    )

finally:

    tmp.unlink(
        missing_ok=True
    )


print('')
print(
    'RENOVACIÓN HISTÓRICA '
    'APLICADA CORRECTAMENTE'
)
print('')
print(
    'Se modificó únicamente:'
)
print(
    ' - app/membresias/page.js'
)
print('')
print(
    'Mejoras instaladas:'
)
print(
    ' - Plan mensual: pregunta Sí/No antes de renovar.'
)
print(
    ' - Sí: conserva plan, precio y duración históricos.'
)
print(
    ' - No: obliga a seleccionar un plan activo actual.'
)
print(
    ' - Plan no mensual: obliga a seleccionar un plan activo actual.'
)
print(
    ' - Las renovaciones usan registrar_renovacion_con_pagos.'
)
print(
    ' - Altas normales siguen usando registrar_membresia_con_pagos.'
)
print(
    ' - Historial de renovaciones visible junto al historial de pagos.'
)
print(
    ' - Se conservan pagos mixtos, permisos y paginación existentes.'
)