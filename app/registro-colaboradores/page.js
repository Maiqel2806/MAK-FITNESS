'use client'

// MAK_DISENO_CORPORATIVO_V2

import { useCallback, useEffect, useState } from 'react'
import { Clock3, LogIn, LogOut, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { usePerfil } from '@/components/UserContext'

const supabase = createClient()

function formatoFecha(fecha) {
  if (!fecha) return '—'

  return new Date(fecha).toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function calcularHoras(inicio, fin) {
  if (!inicio || !fin) return '—'

  const minutos = Math.max(
    0,
    Math.floor(
      (new Date(fin) - new Date(inicio)) / 60000
    )
  )

  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60

  return `${horas} h ${String(resto).padStart(2, '0')} min`
}

export default function RegistroColaboradores() {
  const perfil = usePerfil()

  const [jornadas, setJornadas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  // MAK_HISTORIAL_FECHAS_V1
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const [fechasDisponibles, setFechasDisponibles] = useState([])
  const [fechaSeleccionada, setFechaSeleccionada] = useState('')
  const [registrosFecha, setRegistrosFecha] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [errorHistorial, setErrorHistorial] = useState('')


  const cargar = useCallback(async () => {
    setCargando(true)

    const { data, error: fallo } = await supabase.rpc(
      'mak_mis_jornadas',
      { p_limite: 20 }
    )

    if (fallo) {
      setError(fallo.message)
    } else {
      setJornadas(data?.jornadas || [])
      setError('')
    }

    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const abierta = jornadas.find(
    jornada => !jornada.salida_at
  )


  function mostrarFechaDisponible(fecha) {
    if (!fecha) return '—'

    const [anio, mes, dia] = fecha.split('-').map(Number)

    return new Date(anio, mes - 1, dia).toLocaleDateString(
      'es-EC',
      {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }
    )
  }

  async function consultarHistorial(fecha = '') {
    setCargandoHistorial(true)
    setErrorHistorial('')

    try {
      const { data, error: fallo } = await supabase.rpc(
        'mak_historial_jornadas',
        { p_fecha: fecha || null }
      )

      if (fallo) throw fallo

      setFechasDisponibles(data?.fechas || [])

      // No mostrar automáticamente el último día.
      // El colaborador debe elegir una fecha.
      if (fecha) {
        setFechaSeleccionada(fecha)
        setRegistrosFecha(data?.jornadas || [])
      } else {
        setFechaSeleccionada('')
        setRegistrosFecha([])
      }

    } catch (err) {
      setErrorHistorial(
        err.message || 'No se pudo consultar el historial.'
      )
    } finally {
      setCargandoHistorial(false)
    }
  }

  async function alternarHistorial() {
    if (historialAbierto) {
      setHistorialAbierto(false)
      return
    }

    setHistorialAbierto(true)
    await consultarHistorial()
  }

  async function marcar(accion) {
    if (guardando || cargando) return

    setGuardando(true)
    setError('')
    setMensaje('')

    try {
      const { error: fallo } = await supabase.rpc(
        'mak_registrar_jornada',
        { p_accion: accion }
      )

      if (fallo) throw fallo

      setMensaje(
        accion === 'ingreso'
          ? 'Ingreso registrado correctamente.'
          : 'Salida registrada correctamente.'
      )

      await cargar()
      setConfirmarSalida(false)
    } catch (err) {
      setError(err.message || 'No se pudo registrar.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold">
          Registro Colaboradores
        </h1>

        <p className="mt-2 text-gray-500">
          Control de ingreso y salida laboral
        </p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

        <div className="flex flex-wrap justify-between gap-4">

          <div>
            <p className="text-sm text-gray-500">
              Colaborador
            </p>

            <h2 className="text-xl font-bold">
              {perfil?.nombre || 'Colaborador'}
            </h2>
          </div>

          <span className={
            `rounded-full px-4 py-2 text-sm font-semibold ${
              abierta
                ? 'bg-[#02AFBB]/10 text-[#07838C]'
                : 'bg-gray-100 text-gray-600'
            }`
          }>
            {cargando
              ? 'Consultando...'
              : abierta
                ? 'Jornada activa'
                : 'Sin jornada activa'}
          </span>

        </div>

        <div className="mt-6 rounded-xl border border-[#02AFBB]/20 bg-[#02AFBB]/5 p-4">

          <p className="text-sm text-gray-500">
            Último ingreso
          </p>

          <p className="mt-1 font-semibold">
            {abierta
              ? formatoFecha(abierta.ingreso_at)
              : 'Sin jornada abierta'}
          </p>

        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {mensaje && (
          <div role="status" className="mt-4 rounded-xl border border-[#02AFBB]/20 bg-[#02AFBB]/10 p-3 text-[#07838C]">
            {mensaje}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">

          <button
            onClick={() => marcar('ingreso')}
            disabled={cargando || guardando || !!abierta}
            className="flex items-center justify-center gap-3 rounded-xl bg-[#02AFBB] p-5 font-bold text-white transition hover:bg-[#078F99] disabled:opacity-40"
          >
            <LogIn size={24} />
            INGRESO
          </button>

          <button
            onClick={() => setConfirmarSalida(true)}
            disabled={cargando || guardando || !abierta}
            className="flex items-center justify-center gap-3 rounded-xl bg-gray-900 p-5 font-bold text-white hover:bg-black disabled:opacity-40"
          >
            <LogOut size={24} />
            SALIDA
          </button>

        </div>

        <button
          onClick={cargar}
          disabled={cargando || guardando}
          className="mt-5 flex items-center gap-2 text-sm text-gray-500 disabled:opacity-40"
        >
          <RefreshCw size={16} />
          Actualizar registros
        </button>

      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Clock3 size={22} className="text-[#02AFBB]" />
              Consultar mis registros
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Consulta tus ingresos y salidas de jornadas anteriores.
            </p>
          </div>

          <button
            type="button"
            onClick={alternarHistorial}
            disabled={cargandoHistorial}
            className="rounded-xl bg-[#02AFBB] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#078F99] disabled:opacity-50"
          >
            {cargandoHistorial
              ? 'Consultando...'
              : historialAbierto
                ? 'Ocultar historial'
                : 'Consultar historial'}
          </button>

        </div>

        {historialAbierto && (
          <div className="mt-6 border-t border-gray-100 pt-6">

            <div className="max-w-md">
              <label
                htmlFor="fecha-historial"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Selecciona una fecha registrada
              </label>

              <select
                id="fecha-historial"
                value={fechaSeleccionada}
                disabled={cargandoHistorial || fechasDisponibles.length === 0}
                onChange={(e) => consultarHistorial(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#02AFBB] focus:ring-2 focus:ring-[#02AFBB]/20 disabled:opacity-50"
              >
                <option value="">
                  Selecciona un día trabajado
                </option>

                {fechasDisponibles.map((fecha) => (
                  <option key={fecha} value={fecha}>
                    {mostrarFechaDisponible(fecha)}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-gray-500">
                Solo aparecen los días en los que registraste tu ingreso.
              </p>
            </div>

            {errorHistorial && (
              <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {errorHistorial}
              </div>
            )}

            {!cargandoHistorial &&
              fechasDisponibles.length === 0 &&
              !errorHistorial && (
                <p className="mt-5 text-sm text-gray-500">
                  Todavía no tienes jornadas registradas.
                </p>
            )}

            {fechaSeleccionada && !cargandoHistorial && (
              <div className="mt-6">

                <div className="mb-4 border-l-4 border-[#02AFBB] pl-3">
                  <h3 className="font-bold text-gray-900">
                    {mostrarFechaDisponible(fechaSeleccionada)}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Registros correspondientes a esta fecha
                  </p>
                </div>

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[500px] text-sm">

                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-3">Ingreso</th>
                        <th>Salida</th>
                        <th>Horas trabajadas</th>
                        <th>Estado</th>
                      </tr>
                    </thead>

                    <tbody>
                      {registrosFecha.map((j) => (
                        <tr
                          key={j.id}
                          className="border-b border-gray-100"
                        >
                          <td className="py-3">
                            {formatoFecha(j.ingreso_at)}
                          </td>

                          <td>
                            {formatoFecha(j.salida_at)}
                          </td>

                          <td>
                            {calcularHoras(
                              j.ingreso_at,
                              j.salida_at
                            )}
                          </td>

                          <td>
                            <span className={
                              j.salida_at
                                ? 'text-gray-600'
                                : 'font-semibold text-[#07838C]'
                            }>
                              {j.salida_at
                                ? 'Finalizada'
                                : 'En curso'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                  </table>

                  {registrosFecha.length === 0 && (
                    <p className="py-5 text-sm text-gray-500">
                      No se encontraron registros para esta fecha.
                    </p>
                  )}

                </div>
              </div>
            )}
          </div>
        )}

      </section>

      {/* MAK_MODAL_SALIDA_V1 */}
      {confirmarSalida && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !guardando) {
              setConfirmarSalida(false)
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar-salida"
            className="w-full max-w-md rounded-2xl border-t-4 border-[#02AFBB] bg-white p-6 shadow-2xl"
          >
            <h2
              id="titulo-confirmar-salida"
              className="text-2xl font-bold text-gray-900"
            >
              Finalizar jornada
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              ¿Confirmas que has terminado tu jornada laboral?
              Se registrará automáticamente tu hora de salida.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={guardando}
                onClick={() => setConfirmarSalida(false)}
                className="rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={guardando}
                onClick={() => marcar('salida')}
                className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white transition hover:bg-black disabled:opacity-50"
              >
                <LogOut size={18} />
                {guardando ? 'Registrando...' : 'Confirmar salida'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
