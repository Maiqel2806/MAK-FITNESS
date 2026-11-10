'use client'

// MAK_REPORTE_LABORAL_V1

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Clock3, Download, RefreshCw, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

function fechaHoy() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const obtener = (tipo) =>
    partes.find((parte) => parte.type === tipo)?.value

  return `${obtener('year')}-${obtener('month')}-${obtener('day')}`
}

function inicioMes() {
  return `${fechaHoy().slice(0, 7)}-01`
}

function fechaHora(valor) {
  if (!valor) return '—'

  return new Date(valor).toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function minutosJornada(jornada) {
  if (!jornada.salida_at) return 0

  return Math.max(
    0,
    Math.floor(
      (
        new Date(jornada.salida_at).getTime() -
        new Date(jornada.ingreso_at).getTime()
      ) / 60000
    )
  )
}

function mostrarDuracion(minutos) {
  return `${Math.floor(minutos / 60)} h ${String(
    minutos % 60
  ).padStart(2, '0')} min`
}

function valorCSV(valor) {
  let texto = String(valor ?? '')

  // Prevenir interpretación de fórmulas en Excel.
  if (/^[\s]*[=+@-]/.test(texto)) {
    texto = "'" + texto
  }

  return `"${texto.replaceAll('"', '""')}"`
}

export default function AsistenciaColaboradoresReporte() {
  const [desde, setDesde] = useState(inicioMes)
  const [hasta, setHasta] = useState(fechaHoy)
  const [colaborador, setColaborador] = useState('todos')

  const [jornadas, setJornadas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [consultado, setConsultado] = useState(false)
  const [periodo, setPeriodo] = useState(null)

  const cargar = useCallback(async (fechaInicio, fechaFin) => {
    setCargando(true)
    setError('')
    setConsultado(false)
    setJornadas([])
    setColaborador('todos')

    if (!fechaInicio || !fechaFin || fechaFin < fechaInicio) {
      setError('Selecciona un rango de fechas válido.')
      setCargando(false)
      return
    }

    const dias = Math.round(
      (
        new Date(`${fechaFin}T12:00:00Z`) -
        new Date(`${fechaInicio}T12:00:00Z`)
      ) / 86400000
    )

    if (dias > 366) {
      setError('Consulta períodos de máximo 367 días.')
      setCargando(false)
      return
    }

    try {
      const { data, error: fallo } = await supabase.rpc(
        'mak_reporte_jornadas',
        {
          p_desde: fechaInicio,
          p_hasta: fechaFin,
        }
      )

      if (fallo) throw fallo

      const registros = data?.jornadas || []
      setJornadas(registros)
      setPeriodo({ desde: fechaInicio, hasta: fechaFin })
      setConsultado(true)

      if (registros.length >= 10000) {
        setError(
          'El período alcanzó el límite de 10.000 registros. ' +
          'Consulta rangos más pequeños para obtener el reporte completo.'
        )
      }
    } catch (err) {
      setError(err.message || 'No se pudo consultar el reporte.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar(inicioMes(), fechaHoy())
  }, [cargar])

  const colaboradores = useMemo(() => {
    const mapa = new Map()

    jornadas.forEach((j) => {
      mapa.set(j.auth_user_id, {
        id: j.auth_user_id,
        nombre: j.colaborador || j.usuario || 'Sin nombre',
      })
    })

    return [...mapa.values()].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es')
    )
  }, [jornadas])

  const filtradas = useMemo(() => {
    if (colaborador === 'todos') return jornadas

    return jornadas.filter(
      (j) => j.auth_user_id === colaborador
    )
  }, [jornadas, colaborador])

  const resumen = useMemo(() => {
    const minutos = filtradas.reduce(
      (total, j) => total + minutosJornada(j),
      0
    )

    return {
      total: filtradas.length,
      minutos,
      abiertas: filtradas.filter((j) => !j.salida_at).length,
      empleados: new Set(
        filtradas.map((j) => j.auth_user_id)
      ).size,
    }
  }, [filtradas])

  const totalesEmpleados = useMemo(() => {
    const mapa = new Map()

    filtradas.forEach((j) => {
      const id = j.auth_user_id

      if (!mapa.has(id)) {
        mapa.set(id, {
          id,
          nombre: j.colaborador || j.usuario || 'Sin nombre',
          jornadas: 0,
          minutos: 0,
          abiertas: 0,
        })
      }

      const item = mapa.get(id)
      item.jornadas += 1
      item.minutos += minutosJornada(j)

      if (!j.salida_at) item.abiertas += 1
    })

    return [...mapa.values()].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es')
    )
  }, [filtradas])

  function exportarCSV() {
    if (!consultado || !periodo || !filtradas.length) return

    const filas = [
      [
        'Colaborador',
        'Usuario',
        'Ingreso Ecuador',
        'Salida Ecuador',
        'Minutos trabajados',
        'Estado',
      ],
      ...filtradas.map((j) => [
        j.colaborador || '',
        j.usuario || '',
        fechaHora(j.ingreso_at),
        j.salida_at ? fechaHora(j.salida_at) : '',
        j.salida_at ? minutosJornada(j) : '',
        j.salida_at ? 'Finalizada' : 'Abierta',
      ]),
    ]

    const csv =
      '\uFEFF' +
      filas.map((fila) => fila.map(valorCSV).join(';'))
        .join('\r\n')

    const url = URL.createObjectURL(
      new Blob([csv], {
        type: 'text/csv;charset=utf-8;',
      })
    )

    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download =
      `asistencia_colaboradores_${periodo.desde}_${periodo.hasta}.csv`

    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/reportes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#07838C] hover:underline"
        >
          <ArrowLeft size={17} />
          Volver a Reportes
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Asistencia Colaboradores
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Control de jornadas y horas trabajadas del personal.
        </p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="text-sm font-semibold text-gray-700">
            Desde
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-[#02AFBB]"
            />
          </label>

          <label className="text-sm font-semibold text-gray-700">
            Hasta
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-[#02AFBB]"
            />
          </label>

          <label className="text-sm font-semibold text-gray-700">
            Colaborador
            <select
              value={colaborador}
              onChange={(e) => setColaborador(e.target.value)}
              disabled={cargando || !consultado}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-[#02AFBB]"
            >
              <option value="todos">Todos los colaboradores</option>
              {colaboradores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => cargar(desde, hasta)}
            disabled={cargando}
            className="flex items-center justify-center gap-2 self-end rounded-xl bg-[#02AFBB] px-5 py-3 font-semibold text-white hover:bg-[#078F99] disabled:opacity-50"
          >
            <RefreshCw size={18} />
            {cargando ? 'Consultando...' : 'Consultar'}
          </button>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Jornadas', resumen.total],
          ['Horas trabajadas', mostrarDuracion(resumen.minutos)],
          ['Jornadas abiertas', resumen.abiertas],
          ['Colaboradores', resumen.empleados],
        ].map(([titulo, valor]) => (
          <div
            key={titulo}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-gray-500">{titulo}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {valor}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Clock3 size={20} className="text-[#02AFBB]" />
          Resumen por colaborador
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b text-gray-500">
              <tr>
                <th className="p-3">Colaborador</th>
                <th>Jornadas</th>
                <th>Horas trabajadas</th>
                <th>Abiertas</th>
              </tr>
            </thead>
            <tbody>
              {totalesEmpleados.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="p-3 font-semibold">{item.nombre}</td>
                  <td>{item.jornadas}</td>
                  <td>{mostrarDuracion(item.minutos)}</td>
                  <td>{item.abiertas}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!cargando && !totalesEmpleados.length && (
            <p className="p-5 text-center text-sm text-gray-500">
              No se encontraron jornadas para el período.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">
            Detalle de timbradas
          </h2>

          <button
            type="button"
            onClick={exportarCSV}
            disabled={cargando || !consultado || !filtradas.length}
            className="flex items-center gap-2 rounded-xl border border-[#02AFBB] px-4 py-2 text-sm font-semibold text-[#07838C] hover:bg-[#02AFBB]/10 disabled:opacity-40"
          >
            <Download size={17} />
            Exportar CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b text-gray-500">
              <tr>
                <th className="p-3">Colaborador</th>
                <th>Ingreso</th>
                <th>Salida</th>
                <th>Tiempo trabajado</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>
              {filtradas.map((j) => (
                <tr key={j.id} className="border-b border-gray-100">
                  <td className="p-3 font-semibold">
                    {j.colaborador || j.usuario}
                  </td>
                  <td>{fechaHora(j.ingreso_at)}</td>
                  <td>{fechaHora(j.salida_at)}</td>
                  <td>
                    {j.salida_at
                      ? mostrarDuracion(minutosJornada(j))
                      : '—'}
                  </td>
                  <td>
                    <span className={
                      j.salida_at
                        ? 'text-gray-600'
                        : 'font-semibold text-[#07838C]'
                    }>
                      {j.salida_at ? 'Finalizada' : 'En curso'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!cargando && consultado && !filtradas.length && (
            <p className="p-5 text-center text-sm text-gray-500">
              No existen registros para los filtros seleccionados.
            </p>
          )}
        </div>
      </section>

      <p className="text-xs text-gray-500">
        Las jornadas abiertas no suman horas hasta registrar su salida.
        Este reporte presenta tiempo transcurrido entre timbradas;
        no descuenta descansos ni calcula horas extraordinarias.
        Los períodos se seleccionan por fecha de ingreso.
      </p>
    </div>
  )
}
