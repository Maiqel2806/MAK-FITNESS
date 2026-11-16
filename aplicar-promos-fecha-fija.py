from pathlib import Path
import shutil
import sys

M_PATH = Path('app/membresias/page.js')
U_PATH = Path('app/miembros/page.js')

MARKER_M = 'MAK_PROMOS_FECHA_FIJA_V1'
MARKER_U = 'MAK_PROMOS_FECHA_FIJA_MIEMBROS_V1'


def fail(msg):
    print('')
    print('ERROR:', msg)
    print('No se modificó ningún archivo.')
    sys.exit(1)


def read_file(path):
    if not path.is_file():
        fail(f'No existe {path}')

    raw = path.read_bytes()
    newline = '\r\n' if b'\r\n' in raw else '\n'

    text = (
        raw.decode('utf-8')
        .replace('\r\n', '\n')
    )

    return raw, text, newline


def replace_once(text, old, new, label):
    count = text.count(old)

    if count != 1:
        fail(
            f'{label}: se esperaba 1 coincidencia '
            f'y se encontraron {count}.'
        )

    return text.replace(old, new, 1)


def write_text(path, text, newline):
    if newline == '\r\n':
        text = text.replace('\n', '\r\n')

    path.write_bytes(
        text.encode('utf-8')
    )


ORIG_M, m, NL_M = read_file(M_PATH)
ORIG_U, u, NL_U = read_file(U_PATH)


# ============================================================
# EVITAR DOBLE APLICACIÓN
# ============================================================

if MARKER_M in m or MARKER_U in u:
    print('')
    print(
        'La mejora de promociones por fecha fija '
        'ya está aplicada.'
    )
    sys.exit(0)


# ============================================================
# VALIDACIONES PREVIAS
# ============================================================

for required in [
    'MAK_PAGOS_SEGUROS_V1',
    'MAK_RENOVACION_HISTORICA_V1',
    'registrar_renovacion_con_pagos',
    'registrar_membresia_con_pagos',
    'membresias_renovacion_historial',
]:
    if required not in m:
        fail(
            f'Membresías: falta requisito previo: '
            f'{required}'
        )


for required in [
    'MAK_PAGOS_SEGUROS_V1',
    'registrar_membresia_con_pagos',
    'RESULTADOS_POR_PAGINA = 10',
]:
    if required not in u:
        fail(
            f'Miembros: falta requisito previo: '
            f'{required}'
        )


# ============================================================
# MEMBRESÍAS
# ============================================================


# ============================================================
# 1. PLAN INICIAL
# ============================================================

old = """const planInicial = {
  nombre: '',
  descripcion: '',
  precio: '',
  duracion_dias: '',
  activo: true,
  es_promocion: false,
}
"""

new = """const planInicial = {
  nombre: '',
  descripcion: '',
  precio: '',
  duracion_dias: '',
  activo: true,
  es_promocion: false,

  // MAK_PROMOS_FECHA_FIJA_V1
  modalidad_vigencia: 'duracion',
  vigencia_desde: '',
  vigencia_hasta: '',
}
"""

m = replace_once(
    m,
    old,
    new,
    'Membresías: planInicial',
)


# ============================================================
# 2. HELPERS PARA PROMOCIONES DE FECHA FIJA
# ============================================================

anchor = """function calcularFechaRenovacionPlan(
"""

helpers = r'''function esPlanFechaFija(plan) {
  return (
    Boolean(plan?.es_promocion) &&
    plan?.modalidad_vigencia === 'fecha_fija'
  )
}

function calcularDiasInclusive(
  fechaInicio,
  fechaFin
) {
  if (!fechaInicio || !fechaFin) {
    return 0
  }

  const inicio =
    new Date(
      `${fechaInicio}T00:00:00Z`
    )

  const fin =
    new Date(
      `${fechaFin}T00:00:00Z`
    )

  const diferencia =
    Math.floor(
      (
        fin.getTime() -
        inicio.getTime()
      ) /
      86400000
    )

  if (diferencia < 0) {
    return 0
  }

  return diferencia + 1
}

function planDisponibleParaVenta(
  plan
) {
  if (!plan?.activo) {
    return false
  }

  if (!esPlanFechaFija(plan)) {
    return true
  }

  if (
    !plan.vigencia_desde ||
    !plan.vigencia_hasta
  ) {
    return false
  }

  const hoy =
    obtenerFechaHoy()

  return (
    hoy >= plan.vigencia_desde &&
    hoy <= plan.vigencia_hasta
  )
}

function obtenerEstadoPromoFecha(
  plan
) {
  if (!esPlanFechaFija(plan)) {
    return null
  }

  const hoy =
    obtenerFechaHoy()

  if (hoy < plan.vigencia_desde) {
    return 'programada'
  }

  if (hoy > plan.vigencia_hasta) {
    return 'finalizada'
  }

  return 'vigente'
}

'''

if m.count(anchor) != 1:
    fail(
        'Membresías: no se encontró '
        'calcularFechaRenovacionPlan().'
    )

m = m.replace(
    anchor,
    helpers + anchor,
    1,
)


# ============================================================
# 3. CÁLCULO VISUAL DE RENOVACIÓN
# ============================================================

old = """  const meses =
    Number(
      plan.duracion_meses ||
        0
    )
"""

new = """  if (esPlanFechaFija(plan)) {
    return plan.vigencia_hasta
      ? sumarDias(
          plan.vigencia_hasta,
          1
        )
      : ''
  }

  const meses =
    Number(
      plan.duracion_meses ||
        0
    )
"""

m = replace_once(
    m,
    old,
    new,
    'Membresías: calcularFechaRenovacionPlan',
)


# ============================================================
# 4. ACTUALIZAR FORMULARIO DE PLAN
# ============================================================

old = """  function actualizarPlan(campo, valor) {
    setFormPlan((actual) => ({
      ...actual,
      [campo]: valor,
    }))
  }
"""

new = """  function actualizarPlan(campo, valor) {
    setFormPlan((actual) => {
      const nuevo = {
        ...actual,
        [campo]: valor,
      }

      if (
        campo === 'es_promocion' &&
        valor === true
      ) {
        // Todo NUEVO plan promocional se administra
        // mediante fechas específicas.
        nuevo.modalidad_vigencia =
          'fecha_fija'

        nuevo.duracion_dias = ''
        nuevo.vigencia_desde = ''
        nuevo.vigencia_hasta = ''
      }

      if (
        campo === 'es_promocion' &&
        valor === false
      ) {
        nuevo.modalidad_vigencia =
          'duracion'

        nuevo.vigencia_desde = ''
        nuevo.vigencia_hasta = ''
      }

      if (
        campo === 'modalidad_vigencia' &&
        valor === 'fecha_fija'
      ) {
        nuevo.es_promocion = true
        nuevo.duracion_dias = ''
        nuevo.vigencia_desde = ''
        nuevo.vigencia_hasta = ''
      }

      return nuevo
    })
  }
"""

m = replace_once(
    m,
    old,
    new,
    'Membresías: actualizarPlan',
)


# ============================================================
# 5. EDITAR PLAN EXISTENTE
# ============================================================

old = """    setFormPlan({
      nombre: plan.nombre || '',
      descripcion: plan.descripcion || '',
      precio: String(plan.precio || ''),
      duracion_dias: String(plan.duracion_dias || ''),
      activo: Boolean(plan.activo),
      es_promocion: Boolean(plan.es_promocion),
    })
"""

new = """    setFormPlan({
      nombre: plan.nombre || '',
      descripcion: plan.descripcion || '',
      precio: String(plan.precio || ''),

      duracion_dias:
        plan.modalidad_vigencia ===
        'fecha_fija'
          ? ''
          : String(
              plan.duracion_dias ||
              ''
            ),

      activo:
        Boolean(plan.activo),

      es_promocion:
        Boolean(plan.es_promocion),

      modalidad_vigencia:
        plan.modalidad_vigencia ||
        'duracion',

      vigencia_desde:
        plan.vigencia_desde ||
        '',

      vigencia_hasta:
        plan.vigencia_hasta ||
        '',
    })
"""

m = replace_once(
    m,
    old,
    new,
    'Membresías: editarPlan',
)


# ============================================================
# 6. GUARDAR PLAN
# ============================================================

old = """    const datos = {
      nombre: formPlan.nombre.trim(),
      descripcion: formPlan.descripcion.trim() || null,
      precio: Number(formPlan.precio),
      duracion_dias: Number(formPlan.duracion_dias),
      duracion_meses: inferirDuracionMeses(formPlan.duracion_dias),
      activo: Boolean(formPlan.activo),
      es_promocion: Boolean(formPlan.es_promocion),
    }
"""

new = """    const esFechaFija =
      Boolean(
        formPlan.es_promocion
      ) &&
      formPlan.modalidad_vigencia ===
        'fecha_fija'

    const esPromoHistoricaDuracion =
      Boolean(
        formPlan.es_promocion
      ) &&
      formPlan.modalidad_vigencia ===
        'duracion' &&
      Boolean(editandoPlanId)

    const datos = {
      nombre:
        formPlan.nombre.trim(),

      descripcion:
        formPlan.descripcion.trim() ||
        null,

      precio:
        Number(formPlan.precio),

      duracion_dias:
        esFechaFija
          ? null
          : Number(
              formPlan.duracion_dias
            ),

      duracion_meses:
        esFechaFija
          ? null
          : inferirDuracionMeses(
              formPlan.duracion_dias
            ),

      activo:
        Boolean(formPlan.activo),

      es_promocion:
        Boolean(
          formPlan.es_promocion
        ),

      modalidad_vigencia:
        esFechaFija
          ? 'fecha_fija'
          : 'duracion',

      vigencia_desde:
        esFechaFija
          ? formPlan.vigencia_desde
          : null,

      vigencia_hasta:
        esFechaFija
          ? formPlan.vigencia_hasta
          : null,
    }

    if (
      formPlan.es_promocion &&
      !editandoPlanId &&
      !esFechaFija
    ) {
      setError(
        'Los nuevos planes promocionales deben configurarse mediante fecha inicial y fecha final.'
      )

      setGuardandoPlan(false)
      return
    }
"""

m = replace_once(
    m,
    old,
    new,
    'Membresías: datos guardarPlan',
)


old = """    if (!datos.duracion_dias || datos.duracion_dias <= 0) {
      setError('La duración del plan debe ser mayor a 0 días.')
      setGuardandoPlan(false)
      return
    }
"""

new = """    if (esFechaFija) {

      if (
        !formPlan.vigencia_desde ||
        !formPlan.vigencia_hasta
      ) {
        setError(
          'Debes seleccionar la fecha inicial y la fecha final de la promoción.'
        )

        setGuardandoPlan(false)
        return
      }

      if (
        formPlan.vigencia_hasta <
        formPlan.vigencia_desde
      ) {
        setError(
          'La fecha final de la promoción no puede ser anterior a la fecha inicial.'
        )

        setGuardandoPlan(false)
        return
      }

    } else if (
      !datos.duracion_dias ||
      datos.duracion_dias <= 0
    ) {

      setError(
        'La duración del plan debe ser mayor a 0 días.'
      )

      setGuardandoPlan(false)
      return
    }
"""

m = replace_once(
    m,
    old,
    new,
    'Membresías: validar plan',
)


# ============================================================
# 7. FILTRAR PROMOS PROGRAMADAS Y FINALIZADAS
# ============================================================

old = """  const planesDisponiblesVenta = planesActivos.filter((plan) => {
    return !plan.es_upgrade && plan.codigo !== 'MENSUAL_FIDELIZACION'
  })
"""

new = """  const planesDisponiblesVenta = planesActivos.filter((plan) => {
    return (
      !plan.es_upgrade &&
      plan.codigo !==
        'MENSUAL_FIDELIZACION' &&
      planDisponibleParaVenta(plan)
    )
  })
"""

m = replace_once(
    m,
    old,
    new,
    'Membresías: planesDisponiblesVenta',
)


# ============================================================
# 8. PROMO FIJA NUNCA SE CONSIDERA MENSUAL HISTÓRICA
# ============================================================

old = """  function esMembresiaMensualHistorica(membresia) {
"""

new = """  function esMembresiaMensualHistorica(membresia) {
    if (
      membresia
        .plan_modalidad_vigencia_snapshot ===
      'fecha_fija'
    ) {
      return false
    }

"""

m = replace_once(
    m,
    old,
    new,
    'Membresías: esMembresiaMensualHistorica',
)


# ============================================================
# 9. CAMPO DURACIÓN
# ============================================================

old = """            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Duración en días
              </label>
              <input
                type="number"
                min="1"
                value={formPlan.duracion_dias}
                onChange={(e) => actualizarPlan('duracion_dias', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: 30"
              />
            </div>
"""

new = """            {(
              !formPlan.es_promocion ||
              formPlan.modalidad_vigencia ===
                'duracion'
            ) && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Duración en días
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    formPlan.duracion_dias
                  }
                  onChange={(e) =>
                    actualizarPlan(
                      'duracion_dias',
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Ej: 30"
                />
              </div>
            )}
"""

m = replace_once(
    m,
    old,
    new,
    'Membresías: campo duración',
)


# ============================================================
# 10. TIPO DE PLAN + CALENDARIOS
# ============================================================

old = """            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tipo de plan
              </label>
              <select
                value={formPlan.es_promocion ? 'promo' : 'normal'}
                onChange={(e) => actualizarPlan('es_promocion', e.target.value === 'promo')}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="normal">Plan normal</option>
                <option value="promo">Plan promocional</option>
              </select>
            </div>
"""

new = """            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tipo de plan
              </label>

              <select
                value={
                  formPlan.es_promocion
                    ? 'promo'
                    : 'normal'
                }
                onChange={(e) =>
                  actualizarPlan(
                    'es_promocion',
                    e.target.value ===
                      'promo'
                  )
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="normal">
                  Plan normal
                </option>

                <option value="promo">
                  Plan promocional
                </option>
              </select>
            </div>

            {formPlan.es_promocion &&
              formPlan.modalidad_vigencia ===
                'fecha_fija' && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Disponible desde
                    </label>

                    <input
                      type="date"
                      value={
                        formPlan
                          .vigencia_desde
                      }
                      onChange={(e) =>
                        actualizarPlan(
                          'vigencia_desde',
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Finaliza el
                    </label>

                    <input
                      type="date"
                      value={
                        formPlan
                          .vigencia_hasta
                      }
                      min={
                        formPlan
                          .vigencia_desde ||
                        undefined
                      }
                      onChange={(e) =>
                        actualizarPlan(
                          'vigencia_hasta',
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    />
                  </div>

                  <div className="md:col-span-5 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-800">

                    {formPlan.vigencia_desde &&
                    formPlan.vigencia_hasta
                      ? (
                          <>
                            Esta promoción estará disponible del{' '}

                            <strong>
                              {formatearFecha(
                                formPlan
                                  .vigencia_desde
                              )}
                            </strong>

                            {' '}al{' '}

                            <strong>
                              {formatearFecha(
                                formPlan
                                  .vigencia_hasta
                              )}
                            </strong>.

                            {' '}Duración máxima:{' '}

                            <strong>
                              {calcularDiasInclusive(
                                formPlan
                                  .vigencia_desde,

                                formPlan
                                  .vigencia_hasta
                              )}{' '}
                              días
                            </strong>.

                            {' '}Cada socio que ingrese durante la promoción terminará su membresía exactamente el{' '}

                            <strong>
                              {formatearFecha(
                                formPlan
                                  .vigencia_hasta
                              )}
                            </strong>.
                          </>
                        )
                      : 'Selecciona en el calendario la fecha inicial y la fecha final de la promoción.'}

                  </div>
                </>
              )}

            {formPlan.es_promocion &&
              formPlan.modalidad_vigencia ===
                'duracion' &&
              editandoPlanId && (

                <div className="md:col-span-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">

                  <p className="font-semibold">
                    Promoción histórica por duración
                  </p>

                  <p className="mt-1">
                    Este plan fue creado antes de implementar promociones por fecha fija. Puedes conservarlo sin alterar su historial o convertirlo para futuras ventas.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      actualizarPlan(
                        'modalidad_vigencia',
                        'fecha_fija'
                      )
                    }
                    className="mt-3 rounded-xl border border-yellow-300 bg-white px-4 py-2 text-sm font-semibold text-yellow-900 transition hover:bg-yellow-100"
                  >
                    Convertir a fechas específicas
                  </button>

                </div>

              )}
"""

m = replace_once(
    m,
    old,
    new,
    'Membresías: calendarios promo',
)


# ============================================================
# 11. SELECTOR DE PLANES - ESTRUCTURA REAL ACTUAL
# ============================================================

old = """                          {plan.nombre}
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
"""

new = """                          {plan.nombre}
                          {' - '}
                          {formatearDinero(
                            plan.precio
                          )}

                          {esPlanFechaFija(plan)
                            ? (
                                <>
                                  {' - hasta '}
                                  {formatearFecha(
                                    plan.vigencia_hasta
                                  )}
                                </>
                              )
                            : (
                                <>
                                  {' - '}
                                  {plan.duracion_dias}
                                  {' días'}
                                </>
                              )}

                          {plan.es_promocion
                            ? ' - PROMO'
                            : ''}
"""

m = replace_once(
    m,
    old,
    new,
    'Membresías: option planes',
)


# ============================================================
# 12. TARJETA DE PLAN
# ============================================================

old = """                    <p className="text-lg font-bold text-gray-900">
                      {plan.duracion_dias} días
                    </p>
"""

new = """                    <p className="text-lg font-bold text-gray-900">
                      {esPlanFechaFija(plan)
                        ? `Hasta ${formatearFecha(
                            plan.vigencia_hasta
                          )}`
                        : `${plan.duracion_dias} días`}
                    </p>

                    {esPlanFechaFija(plan) && (
                      <p className="mt-1 text-xs font-semibold text-gray-500">

                        {obtenerEstadoPromoFecha(plan) ===
                        'programada'
                          ? 'Programada'

                          : obtenerEstadoPromoFecha(plan) ===
                            'finalizada'
                            ? 'Finalizada'
                            : 'Vigente'}

                      </p>
                    )}
"""

m = replace_once(
    m,
    old,
    new,
    'Membresías: tarjeta plan',
)


# ============================================================
# 13. LIMITAR FECHA DEL FORMULARIO DE MEMBRESÍA
# ============================================================

old = """              <input
                type="date"
                value={formMembresia.fecha_inicio}
                onChange={(e) => actualizarMembresia('fecha_inicio', e.target.value)}
                disabled={esRenovacionFormulario}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600"
              />
"""

new = """              <input
                type="date"
                value={formMembresia.fecha_inicio}
                onChange={(e) => actualizarMembresia('fecha_inicio', e.target.value)}

                min={
                  esPlanFechaFija(
                    planActualFormulario
                  )
                    ? planActualFormulario
                        .vigencia_desde
                    : undefined
                }

                max={
                  esPlanFechaFija(
                    planActualFormulario
                  )
                    ? planActualFormulario
                        .vigencia_hasta
                    : undefined
                }

                disabled={
                  esRenovacionFormulario
                }

                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600"
              />

              {!esRenovacionFormulario &&
                esPlanFechaFija(
                  planActualFormulario
                ) && (

                  <p className="mt-1 text-xs font-semibold text-purple-700">
                    Esta promoción finaliza el{' '}
                    {formatearFecha(
                      planActualFormulario
                        .vigencia_hasta
                    )}.
                  </p>

                )}
"""

m = replace_once(
    m,
    old,
    new,
    'Membresías: límite fecha membresía',
)


# ============================================================
# MIEMBROS
# ============================================================


# ============================================================
# 14. TRAER NUEVOS CAMPOS DE PLANES
# ============================================================

old = """          id,
          nombre,
          precio,
          duracion_dias,
          activo,
          es_upgrade,
          codigo,
          cobra_inscripcion,
          es_promocion
"""

new = """          id,
          nombre,
          precio,
          duracion_dias,
          duracion_meses,
          activo,
          es_upgrade,
          codigo,
          cobra_inscripcion,
          es_promocion,
          modalidad_vigencia,
          vigencia_desde,
          vigencia_hasta
"""

u = replace_once(
    u,
    old,
    new,
    'Miembros: select planes',
)


# ============================================================
# 15. HELPERS DE PROMOS EN MIEMBROS
# ============================================================

anchor = """  const planesDisponibles =
    useMemo(() => {
"""

helpers_u = r'''  // MAK_PROMOS_FECHA_FIJA_MIEMBROS_V1
  function obtenerFechaHoyGuayaquilMiembros() {
    const partes =
      new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone:
            'America/Guayaquil',

          year:
            'numeric',

          month:
            '2-digit',

          day:
            '2-digit',
        }
      ).formatToParts(
        new Date()
      )

    const valores =
      Object.fromEntries(
        partes.map(
          (parte) => [
            parte.type,
            parte.value,
          ]
        )
      )

    return `${valores.year}-${valores.month}-${valores.day}`
  }

  function esPlanFechaFijaMiembros(
    plan
  ) {
    return (
      Boolean(
        plan?.es_promocion
      ) &&
      plan?.modalidad_vigencia ===
        'fecha_fija'
    )
  }

  function planDisponibleParaVentaMiembros(
    plan
  ) {
    if (!plan?.activo) {
      return false
    }

    if (
      !esPlanFechaFijaMiembros(
        plan
      )
    ) {
      return true
    }

    if (
      !plan.vigencia_desde ||
      !plan.vigencia_hasta
    ) {
      return false
    }

    const hoy =
      obtenerFechaHoyGuayaquilMiembros()

    return (
      hoy >=
        plan.vigencia_desde &&
      hoy <=
        plan.vigencia_hasta
    )
  }

  function formatearFechaPlanMiembros(
    fecha
  ) {
    if (!fecha) {
      return '-'
    }

    const partes =
      String(fecha)
        .slice(0, 10)
        .split('-')

    if (partes.length !== 3) {
      return fecha
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }

'''

if u.count(anchor) != 1:
    fail(
        'Miembros: no se encontró '
        'planesDisponibles.'
    )

u = u.replace(
    anchor,
    helpers_u + anchor,
    1,
)


# ============================================================
# 16. FILTRAR PROMOS FUERA DE FECHA EN MIEMBROS
# ============================================================

old = """            plan.activo &&
            !plan.es_upgrade &&
            plan.codigo !==
              'MENSUAL_FIDELIZACION'
"""

new = """            plan.activo &&
            !plan.es_upgrade &&
            plan.codigo !==
              'MENSUAL_FIDELIZACION' &&
            planDisponibleParaVentaMiembros(
              plan
            )
"""

u = replace_once(
    u,
    old,
    new,
    'Miembros: filtro planes',
)


# ============================================================
# 17. MOSTRAR "HASTA FECHA" EN SELECTOR DE MIEMBROS
# ============================================================

old = """                              {
                                plan.nombre
                              }{' '}
                              ·{' '}
                              {formatearDinero(
                                plan.precio
                              )}
"""

new = """                              {
                                plan.nombre
                              }{' '}
                              ·{' '}
                              {formatearDinero(
                                plan.precio
                              )}

                              {esPlanFechaFijaMiembros(
                                plan
                              ) && (
                                <>
                                  {' · hasta '}
                                  {formatearFechaPlanMiembros(
                                    plan.vigencia_hasta
                                  )}
                                </>
                              )}
"""

u = replace_once(
    u,
    old,
    new,
    'Miembros: option plan',
)


# ============================================================
# 18. LIMITAR FECHA DE INICIO EN REGISTRO DE NUEVO MIEMBRO
# ============================================================

old = """                        <input
                          type="date"
                          value={
                            formMembresia.fecha_inicio
                          }
                          onChange={(
                            e
                          ) =>
                            actualizarMembresia(
                              'fecha_inicio',
                              e
                                .target
                                .value
                            )
                          }
                          className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-black"
                        />
"""

new = """                        <input
                          type="date"
                          value={
                            formMembresia.fecha_inicio
                          }

                          min={
                            esPlanFechaFijaMiembros(
                              planSeleccionado
                            )
                              ? planSeleccionado
                                  .vigencia_desde
                              : undefined
                          }

                          max={
                            esPlanFechaFijaMiembros(
                              planSeleccionado
                            )
                              ? planSeleccionado
                                  .vigencia_hasta
                              : undefined
                          }

                          onChange={(
                            e
                          ) =>
                            actualizarMembresia(
                              'fecha_inicio',
                              e
                                .target
                                .value
                            )
                          }

                          className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-black"
                        />

                        {esPlanFechaFijaMiembros(
                          planSeleccionado
                        ) && (

                          <p className="mt-1 text-xs font-semibold text-purple-700">
                            Esta promoción finaliza el{' '}
                            {formatearFechaPlanMiembros(
                              planSeleccionado
                                .vigencia_hasta
                            )}.
                          </p>

                        )}
"""

u = replace_once(
    u,
    old,
    new,
    'Miembros: límite fecha',
)


# ============================================================
# VALIDACIONES FINALES
# ============================================================

if m.count(MARKER_M) != 1:
    fail(
        'Membresías: marcador final '
        'duplicado o ausente.'
    )


if u.count(MARKER_U) != 1:
    fail(
        'Miembros: marcador final '
        'duplicado o ausente.'
    )


if (
    m.count(
        'registrar_renovacion_con_pagos'
    ) != 1
):
    fail(
        'Membresías: se alteró inesperadamente '
        'el RPC de renovación.'
    )


if (
    m.count(
        'registrar_membresia_con_pagos'
    ) != 1
):
    fail(
        'Membresías: se alteró inesperadamente '
        'el RPC de registro.'
    )


if (
    u.count(
        'registrar_membresia_con_pagos'
    ) != 1
):
    fail(
        'Miembros: se alteró inesperadamente '
        'el RPC de registro.'
    )


if (
    'membresias_renovacion_historial'
    not in m
):
    fail(
        'Membresías: se perdió '
        'el historial de renovaciones.'
    )


if (
    'pagos_historial'
    not in m or
    'corregir_pago_mak'
    not in m
):
    fail(
        'Membresías: se perdió '
        'el historial de pagos.'
    )


if (
    'RESULTADOS_POR_PAGINA = 10'
    not in u
):
    fail(
        'Miembros: se perdió '
        'la paginación.'
    )


# ============================================================
# RESPALDOS
# ============================================================

BACKUP_M = M_PATH.with_name(
    M_PATH.name +
    '.antes-promos-fecha-fija.bak'
)

BACKUP_U = U_PATH.with_name(
    U_PATH.name +
    '.antes-promos-fecha-fija.bak'
)


if not BACKUP_M.exists():
    shutil.copy2(
        M_PATH,
        BACKUP_M,
    )


if not BACKUP_U.exists():
    shutil.copy2(
        U_PATH,
        BACKUP_U,
    )


# ============================================================
# ESCRITURA
# ============================================================

try:

    write_text(
        M_PATH,
        m,
        NL_M,
    )

    write_text(
        U_PATH,
        u,
        NL_U,
    )

except Exception as exc:

    M_PATH.write_bytes(
        ORIG_M
    )

    U_PATH.write_bytes(
        ORIG_U
    )

    fail(
        f'No se pudieron escribir '
        f'los archivos: {exc}'
    )


print('')
print(
    'PROMOCIONES POR FECHA FIJA '
    'APLICADAS CORRECTAMENTE'
)
print('')
print(
    'Se modificaron únicamente:'
)
print(
    ' - app/membresias/page.js'
)
print(
    ' - app/miembros/page.js'
)
print('')
print(
    'Mejoras instaladas:'
)
print(
    ' - Todo nuevo plan promocional usa fecha inicial y fecha final.'
)
print(
    ' - Ya no se cuentan días manualmente para nuevas promociones.'
)
print(
    ' - El backend seguirá calculando la duración máxima automáticamente.'
)
print(
    ' - Cada socio termina en la fecha final de la promoción.'
)
print(
    ' - Promociones futuras no aparecen todavía para venta.'
)
print(
    ' - Promociones vencidas dejan de aparecer para venta.'
)
print(
    ' - Promociones vigentes sí aparecen en Membresías y Miembros.'
)
print(
    ' - Promociones históricas por duración se conservan sin modificar.'
)
print(
    ' - Planes mensuales, trimestrales y demás conservan su comportamiento.'
)