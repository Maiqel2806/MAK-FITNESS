from pathlib import Path
import shutil, sys

archivo = Path('app/membresias/page.js')

if not archivo.exists():
    print('ERROR: No se encontró app/membresias/page.js')
    sys.exit(1)

codigo = archivo.read_text(encoding='utf-8')

if 'function obtenerFechaRenovacionMembresia(' in codigo:
    print('La mejora ya está aplicada.')
    sys.exit(0)


def rep(a, b, nombre, n=1):
    global codigo

    if codigo.count(a) < n:
        print(f'ERROR: No se encontró: {nombre}')
        print('No se modificó page.js.')
        sys.exit(1)

    codigo = codigo.replace(a, b, n)


# ============================================================
# 1. FUNCIONES DE FECHAS Y MESES CALENDARIO
# ============================================================

inicio = codigo.find(
    'function sumarDias(fecha, dias) {'
)

fin = codigo.find(
    'function diferenciaDias(fechaDesde, fechaHasta) {',
    inicio
)

if inicio < 0 or fin < 0:
    print(
        'ERROR: No se encontraron las funciones de fecha.'
    )
    sys.exit(1)


helpers = r'''function sumarDias(fecha, dias) {
  if (!fecha) return ''

  const [year, month, day] = String(fecha)
    .slice(0, 10)
    .split('-')
    .map(Number)

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  )

  date.setUTCDate(
    date.getUTCDate() +
      Number(dias || 0)
  )

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, '0')}-${String(
    date.getUTCDate()
  ).padStart(2, '0')}`
}

function calcularFechaFin(
  fechaInicio,
  duracionDias
) {
  if (
    !fechaInicio ||
    !duracionDias
  ) {
    return ''
  }

  return sumarDias(
    fechaInicio,
    Math.max(
      Number(
        duracionDias || 1
      ) - 1,
      0
    )
  )
}

function calcularFechaRenovacionCalendario(
  fechaInicio,
  duracionMeses,
  diaAncla = null
) {
  if (
    !fechaInicio ||
    !duracionMeses
  ) {
    return ''
  }

  const [
    year,
    month,
    day,
  ] = String(fechaInicio)
    .slice(0, 10)
    .split('-')
    .map(Number)

  const meses =
    Number(
      duracionMeses || 0
    )

  if (meses <= 0) {
    return ''
  }

  const ancla = Math.min(
    31,
    Math.max(
      1,
      Number(
        diaAncla || day
      )
    )
  )

  const indice =
    year * 12 +
    (month - 1) +
    meses

  const yearDestino =
    Math.floor(
      indice / 12
    )

  const monthDestino =
    indice % 12

  const ultimoDia =
    new Date(
      Date.UTC(
        yearDestino,
        monthDestino + 1,
        0
      )
    ).getUTCDate()

  const diaDestino =
    Math.min(
      ancla,
      ultimoDia
    )

  return `${yearDestino}-${String(
    monthDestino + 1
  ).padStart(2, '0')}-${String(
    diaDestino
  ).padStart(2, '0')}`
}

function obtenerDuracionMembresia(
  membresia
) {
  return Number(
    membresia
      ?.plan_duracion_dias_snapshot ||
      membresia
        ?.planes
        ?.duracion_dias ||
      0
  )
}

function obtenerDuracionMesesSnapshot(
  membresia
) {
  return Number(
    membresia
      ?.plan_duracion_meses_snapshot ||
      0
  )
}

function obtenerDuracionMesesParaCalculo(
  membresia
) {
  return Number(
    membresia
      ?.plan_duracion_meses_snapshot ||
      membresia
        ?.planes
        ?.duracion_meses ||
      0
  )
}

function obtenerFechaRenovacionMembresia(
  membresia
) {
  return membresia?.fecha_fin
    ? sumarDias(
        membresia.fecha_fin,
        1
      )
    : ''
}

function calcularFechaRenovacionPlan(
  fechaInicio,
  plan
) {
  if (
    !fechaInicio ||
    !plan
  ) {
    return ''
  }

  const meses =
    Number(
      plan.duracion_meses ||
        0
    )

  if (meses > 0) {
    return calcularFechaRenovacionCalendario(
      fechaInicio,
      meses,
      Number(
        String(
          fechaInicio
        ).slice(8, 10)
      )
    )
  }

  const fin =
    calcularFechaFin(
      fechaInicio,
      plan.duracion_dias
    )

  return fin
    ? sumarDias(fin, 1)
    : ''
}

function calcularFechaRenovacionDesdeMembresia(
  membresia,
  fechaInicio
) {
  const meses =
    obtenerDuracionMesesParaCalculo(
      membresia
    )

  if (meses > 0) {
    return calcularFechaRenovacionCalendario(
      fechaInicio,
      meses,
      Number(
        String(
          fechaInicio
        ).slice(8, 10)
      )
    )
  }

  const fin =
    calcularFechaFin(
      fechaInicio,
      obtenerDuracionMembresia(
        membresia
      )
    )

  return fin
    ? sumarDias(fin, 1)
    : ''
}

function obtenerTextoDuracionMembresia(
  membresia
) {
  const meses =
    obtenerDuracionMesesSnapshot(
      membresia
    )

  if (meses > 0) {
    return `${meses} mes${
      meses === 1
        ? ''
        : 'es'
    }`
  }

  const dias =
    obtenerDuracionMembresia(
      membresia
    )

  return `${dias} día${
    dias === 1
      ? ''
      : 's'
  }`
}

function inferirDuracionMeses(
  dias
) {
  return ({
    30: 1,
    60: 2,
    90: 3,
    180: 6,
    365: 12,
  })[
    Number(dias)
  ] || null
}

'''

codigo = (
    codigo[:inicio] +
    helpers +
    codigo[fin:]
)


# ============================================================
# 2. DIFERENCIA DE DÍAS SEGURA
# ============================================================

rep(
"""function diferenciaDias(fechaDesde, fechaHasta) {
  const inicio = new Date(`${fechaDesde}T00:00:00`)
  const fin = new Date(`${fechaHasta}T00:00:00`)
  return Math.round((fin - inicio) / (1000 * 60 * 60 * 24))
}""",

"""function diferenciaDias(fechaDesde, fechaHasta) {
  const [
    aY,
    aM,
    aD,
  ] = String(fechaDesde)
    .slice(0, 10)
    .split('-')
    .map(Number)

  const [
    bY,
    bM,
    bD,
  ] = String(fechaHasta)
    .slice(0, 10)
    .split('-')
    .map(Number)

  return Math.round(
    (
      Date.UTC(
        bY,
        bM - 1,
        bD
      ) -
      Date.UTC(
        aY,
        aM - 1,
        aD
      )
    ) /
      86400000
  )
}""",

'diferenciaDias'
)


# ============================================================
# 3. OBTENER duracion_meses DEL PLAN
# ============================================================

rep(
"""            duracion_dias,
            tipo_plan,""",

"""            duracion_dias,
            duracion_meses,
            tipo_plan,""",

'duracion_meses en consulta'
)


# ============================================================
# 4. NUEVOS PLANES TAMBIÉN GUARDAN MESES
# ============================================================

rep(
"""      duracion_dias: Number(formPlan.duracion_dias),
      activo: Boolean(formPlan.activo),""",

"""      duracion_dias: Number(formPlan.duracion_dias),
      duracion_meses: inferirDuracionMeses(formPlan.duracion_dias),
      activo: Boolean(formPlan.activo),""",

'duracion_meses al guardar plan'
)


# ============================================================
# 5. TEXTO DE RENOVACIÓN
# ============================================================

rep(
"""      notas: `Renovación de membresía anterior con vencimiento ${formatearFecha(membresia.fecha_fin)}.`,""",

"""      notas: `Renovación de membresía programada para ${formatearFecha(obtenerFechaRenovacionMembresia(membresia))}.`,""",

'nota de renovación'
)


rep(
"""    setMensaje('La fecha de inicio fue calculada automáticamente para no perder días de vigencia.')""",

"""    setMensaje('La nueva membresía iniciará en la fecha de renovación correspondiente, sin perder días de vigencia.')""",

'mensaje renovación'
)


# ============================================================
# 6. EDITAR MEMBRESÍA RESPETANDO MESES CALENDARIO
# ============================================================

rep(
"""    const duracionDias = obtenerDuracionMembresia(membresiaSeleccionada)

    if (!duracionDias || duracionDias <= 0) {
      setError('No se pudo calcular la vigencia porque el plan no tiene duración válida.')
      setGuardandoEdicion(false)
      return
    }

    const fechaFinCalculada = calcularFechaFin(
      formEditarMembresia.fecha_inicio,
      duracionDias
    )

    const datos = {
      fecha_inicio: formEditarMembresia.fecha_inicio,
      fecha_fin: fechaFinCalculada,
    }""",

"""    const duracionMeses =
      obtenerDuracionMesesParaCalculo(
        membresiaSeleccionada
      )

    const duracionDias =
      obtenerDuracionMembresia(
        membresiaSeleccionada
      )

    if (
      duracionMeses <= 0 &&
      duracionDias <= 0
    ) {
      setError(
        'No se pudo calcular la vigencia porque el plan no tiene duración válida.'
      )

      setGuardandoEdicion(
        false
      )

      return
    }

    const diaAncla =
      Number(
        String(
          formEditarMembresia.fecha_inicio
        ).slice(8, 10)
      )

    const fechaRenovacion =
      calcularFechaRenovacionDesdeMembresia(
        membresiaSeleccionada,
        formEditarMembresia.fecha_inicio
      )

    const datos = {
      fecha_inicio:
        formEditarMembresia.fecha_inicio,

      fecha_fin:
        sumarDias(
          fechaRenovacion,
          -1
        ),

      dia_ancla_renovacion:
        diaAncla,
    }

    if (
      duracionMeses > 0
    ) {
      datos.plan_duracion_meses_snapshot =
        duracionMeses
    }""",

'guardar edición calendario'
)


# ============================================================
# 7. ESTADO REAL SEGÚN FECHA DE RENOVACIÓN
# ============================================================

rep(
"""      const dias = diferenciaDias(hoy, membresia.fecha_fin)""",

"""      const fechaRenovacion =
        obtenerFechaRenovacionMembresia(
          membresia
        )

      const dias =
        diferenciaDias(
          hoy,
          fechaRenovacion
        )""",

'días hasta renovación'
)


rep(
"""      if (dias < 0) {""",
"""      if (dias <= 0) {""",
'estado vencida'
)


rep(
"""          texto_vigencia: `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`,""",

"""          texto_vigencia:
            dias === 0
              ? 'Renovación pendiente hoy'
              : `Sin renovar hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`,""",

'texto vencida'
)


rep(
"""      if (dias === 0) {""",
"""      if (dias === 1) {""",
'último día vigente'
)


rep(
"""          texto_vigencia: 'Vence hoy',""",
"""          texto_vigencia: 'Renueva mañana',""",
'texto renueva mañana'
)


rep(
"""          texto_vigencia: `Vence en ${dias} día${dias === 1 ? '' : 's'}`,""",

"""          texto_vigencia: `Renueva en ${dias} días`,""",

'texto por caducar'
)


rep(
"""        texto_vigencia: `Vence en ${dias} días`,""",
"""        texto_vigencia: `Renueva en ${dias} días`,""",
'texto vigente'
)


rep(
"""  if (estado === 'vence_hoy') return 'Vence hoy'""",
"""  if (estado === 'vence_hoy') return 'Renueva mañana'""",
'etiqueta estado'
)


rep(
"""              ['vence_hoy', 'Vence hoy'],""",
"""              ['vence_hoy', 'Renueva mañana'],""",
'filtro estado'
)


# ============================================================
# 8. FILTRO VENCIDAS POR MES DE RENOVACIÓN
# ============================================================

rep(
"""      const fechaFin = String(
        membresia.fecha_fin || ''
      )

      if (fechaFin.length >= 7) {
        meses.add(
          fechaFin.slice(0, 7)
        )
      }""",

"""      const fechaRenovacion = String(
        obtenerFechaRenovacionMembresia(
          membresia
        ) || ''
      )

      if (
        fechaRenovacion.length >= 7
      ) {
        meses.add(
          fechaRenovacion.slice(
            0,
            7
          )
        )
      }""",

'mes vencidas'
)


rep(
"""          String(
            membresia.fecha_fin || ''
          ).startsWith(
            filtroMesVencidas
          )""",

"""          String(
            obtenerFechaRenovacionMembresia(
              membresia
            ) || ''
          ).startsWith(
            filtroMesVencidas
          )""",

'filtro mes vencidas'
)


rep(
"""        String(
          item.fecha_fin || ''
        ).startsWith(
          filtroMesVencidas
        )""",

"""        String(
          obtenerFechaRenovacionMembresia(
            item
          ) || ''
        ).startsWith(
          filtroMesVencidas
        )""",

'contador mes vencidas'
)


# ============================================================
# 9. AVISO DE MEMBRESÍA VIGENTE
# ============================================================

rep(
"""              Este socio ya tiene una membresía vigente hasta el{' '}
              <strong>{formatearFecha(membresiaActivaSocioSeleccionado.fecha_fin)}</strong>.
              El sistema calculó la siguiente fecha disponible para evitar duplicar o cruzar vigencias.""",

"""              Este socio ya tiene una membresía vigente. Su próxima renovación es el{' '}
              <strong>{formatearFecha(obtenerFechaRenovacionMembresia(membresiaActivaSocioSeleccionado))}</strong>.
              El sistema calculó la siguiente fecha disponible para evitar duplicar o cruzar vigencias.""",

'aviso socio vigente'
)


# ============================================================
# 10. FORMULARIO NUEVA MEMBRESÍA
# ============================================================

rep(
"""                Fecha fin calculada
              </label>
              <div className="flex min-h-[46px] items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                {formMembresia.plan_id
                  ? formatearFecha(
                      calcularFechaFin(
                        formMembresia.fecha_inicio,
                        planes.find((plan) => plan.id === formMembresia.plan_id)?.duracion_dias || 0
                      )
                    )
                  : 'Selecciona un plan'}
              </div>""",

"""                Próxima renovación
              </label>
              <div className="flex min-h-[46px] items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                {formMembresia.plan_id
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
              </div>""",

'preview renovación'
)


# ============================================================
# 11. FORMULARIO EDITAR MEMBRESÍA
# ============================================================

rep(
"""                {membresiaSeleccionada
                  ? `${obtenerDuracionMembresia(membresiaSeleccionada)} días`
                  : '-'}""",

"""                {membresiaSeleccionada
                  ? obtenerTextoDuracionMembresia(
                      membresiaSeleccionada
                    )
                  : '-'}""",

'duración edición'
)


rep(
"""                Nueva fecha fin calculada
              </label>
              <div className="flex min-h-[46px] items-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700">
                {membresiaSeleccionada && formEditarMembresia.fecha_inicio
                  ? formatearFecha(
                      calcularFechaFin(
                        formEditarMembresia.fecha_inicio,
                        obtenerDuracionMembresia(membresiaSeleccionada)
                      )
                    )
                  : '-'}
              </div>""",

"""                Nueva fecha de renovación
              </label>
              <div className="flex min-h-[46px] items-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700">
                {membresiaSeleccionada &&
                formEditarMembresia.fecha_inicio
                  ? formatearFecha(
                      calcularFechaRenovacionDesdeMembresia(
                        membresiaSeleccionada,
                        formEditarMembresia.fecha_inicio
                      )
                    )
                  : '-'}
              </div>""",

'preview edición'
)


rep(
"""              Solo se modifica la fecha de inicio. La fecha final se calcula automáticamente según la duración real del plan contratado.""",

"""              Solo se modifica la fecha de inicio. La próxima renovación se calcula automáticamente respetando el ciclo calendario del plan contratado.""",

'texto edición'
)


# ============================================================
# 12. LISTADOS MÓVIL Y ESCRITORIO
# ============================================================

vieja = (
    'const duracionPlan = '
    'membresia.plan_duracion_dias_snapshot || '
    'planActual.duracion_dias || 0'
)

if codigo.count(vieja) != 2:
    print(
        'ERROR: No se encontraron las dos duraciones del listado.'
    )
    sys.exit(1)

codigo = codigo.replace(
    vieja,
    'const duracionPlan = '
    'obtenerTextoDuracionMembresia(membresia)'
)


vieja = (
    '{formatearDinero(precioPlan)} · '
    '{duracionPlan} días'
)

if codigo.count(vieja) != 2:
    print(
        'ERROR: No se encontraron las dos duraciones visuales.'
    )
    sys.exit(1)

codigo = codigo.replace(
    vieja,
    '{formatearDinero(precioPlan)} · {duracionPlan}'
)


rep(
"""                          <p className="text-xs font-semibold text-gray-500">Vence</p>
                          <p className="font-bold text-gray-900">
                            {formatearFecha(membresia.fecha_fin)}
                          </p>""",

"""                          <p className="text-xs font-semibold text-gray-500">Renueva</p>
                          <p className="font-bold text-gray-900">
                            {formatearFecha(
                              obtenerFechaRenovacionMembresia(
                                membresia
                              )
                            )}
                          </p>""",

'renueva móvil'
)


rep(
"""                    <th className="px-5 py-3">Vence</th>""",
"""                    <th className="px-5 py-3">Renueva</th>""",
'cabecera renueva'
)


rep(
"""                        <td className="px-5 py-4 text-gray-700">
                          {formatearFecha(membresia.fecha_fin)}
                        </td>""",

"""                        <td className="px-5 py-4 text-gray-700">
                          {formatearFecha(
                            obtenerFechaRenovacionMembresia(
                              membresia
                            )
                          )}
                        </td>""",

'renueva escritorio'
)


# ============================================================
# 13. VALIDACIÓN FINAL
# ============================================================

for marca in [
    'function obtenerFechaRenovacionMembresia(',
    'duracion_meses,',
    'Próxima renovación',
    '>Renueva</th>',
]:
    if marca not in codigo:
        print(
            'ERROR: Falló validación final:',
            marca
        )
        sys.exit(1)


# ============================================================
# 14. RESPALDO Y GUARDADO
# ============================================================

respaldo = Path(
    'app/membresias/'
    'page.js.antes-fechas-renovacion.bak'
)

shutil.copy2(
    archivo,
    respaldo
)

archivo.write_text(
    codigo,
    encoding='utf-8',
    newline='\n'
)

print('')
print(
    'FECHAS DE RENOVACIÓN '
    'ACTUALIZADAS CORRECTAMENTE'
)
print(
    'Respaldo:',
    respaldo
)
print(
    'Ahora ejecuta: npm run dev'
)