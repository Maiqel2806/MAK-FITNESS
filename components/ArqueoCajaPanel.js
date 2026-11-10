'use client'

// MAK_ARQUEO_COMPARTIDO_V1

import { useCallback, useEffect, useState } from 'react'
import {
  ClipboardCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

function dinero(valor) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(valor || 0))
}

function fechaHora(valor) {
  if (!valor) return '—'

  return new Date(valor).toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    dateStyle: 'short',
    timeStyle: 'short',
    second: '2-digit',
  })
}

export default function ArqueoCajaPanel({ cajaId, resumen }) {
  const [contado, setContado] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [confirmar, setConfirmar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [arqueos, setArqueos] = useState([])
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [esperadoActual, setEsperadoActual] = useState(null)

  const cargarHistorial = useCallback(async () => {
    if (!cajaId) return

    setCargando(true)
    setError('')

    try {
      const { data, error: fallo } = await supabase.rpc(
        'mak_consultar_arqueos_caja'
      )

      if (fallo) throw fallo

      if (data?.caja_id !== cajaId) {
        throw new Error(
          'La caja consultada cambió. Actualiza la pantalla.'
        )
      }

      setArqueos(data?.arqueos || [])
    } catch (err) {
      setError(err.message || 'Error al consultar arqueos.')
    } finally {
      setCargando(false)
    }
  }, [cajaId])

  useEffect(() => {
    cargarHistorial()
  }, [cargarHistorial])

  const importeValido =
    /^\d+(\.\d{1,2})?$/.test(contado.trim()) &&
    Number(contado) <= 9999999999.99

  const esperado = resumen
    ? Number(resumen.efectivo_esperado)
    : null

  const diferencia = importeValido && esperado !== null
    ? Math.round((Number(contado) - esperado) * 100) / 100
    : null

  function prepararArqueo() {
    setError('')
    setMensaje('')

    if (!importeValido) {
      setError('Ingresa un importe válido con máximo dos decimales.')
      return
    }

    if (diferencia !== null &&
        diferencia !== 0 &&
        !observaciones.trim()) {
      setError('Debes explicar el faltante o sobrante.')
      return
    }

    setConfirmar(true)
  }

  async function registrar() {
    if (guardando || !importeValido || !cajaId) return

    setGuardando(true)
    setError('')
    setMensaje('')

    try {
      const { data: estado, error: errorEstado } =
        await supabase.rpc('mak_resumen_caja_actual')

      if (errorEstado) throw errorEstado

      if (!estado?.caja_abierta || estado.caja_id !== cajaId) {
        throw new Error(
          'La caja ha cambiado o ya no está abierta.'
        )
      }

      const actual = Number(estado.efectivo_esperado)
      setEsperadoActual(actual)

      if (actual !== esperado) {
        throw new Error(
          'Se registraron movimientos desde la última actualización. ' +
          'Actualiza Caja Diaria y vuelve a contar el efectivo.'
        )
      }

      const { data, error: fallo } = await supabase.rpc(
        'mak_registrar_arqueo_caja',
        {
          p_efectivo_contado: Number(contado),
          p_observaciones: observaciones.trim() || null,
        }
      )

      if (fallo) throw fallo

      setMensaje(
        `Arqueo registrado. Diferencia: ${dinero(data.diferencia)}`
      )
      setConfirmar(false)
      setContado('')
      setObservaciones('')
      await cargarHistorial()
    } catch (err) {
      setConfirmar(false)
      setError(err.message || 'No se pudo registrar el arqueo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="border-t border-gray-200 pt-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <ClipboardCheck
              size={22}
              className="text-[#02AFBB]"
            />
            Arqueo de turno
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Registra el efectivo contado sin cerrar la caja compartida.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMostrarHistorial(!mostrarHistorial)}
          className="rounded-xl border border-[#02AFBB]/40 px-4 py-2 text-sm font-semibold text-[#07838C] hover:bg-[#02AFBB]/10"
        >
          {mostrarHistorial
            ? 'Ocultar historial'
            : 'Consultar arqueos'}
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {mensaje && (
        <div role="status" className="mb-4 rounded-xl border border-[#02AFBB]/30 bg-[#02AFBB]/10 p-4 text-sm font-semibold text-[#07838C]">
          {mensaje}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <p className="mb-4 text-sm text-gray-600">
          Antes de contar el efectivo, suspende momentáneamente
          los cobros y verifica todo el dinero físico.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="arqueo-contado"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Efectivo contado físicamente (USD)
            </label>

            <input
              id="arqueo-contado"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={contado}
              onChange={(e) => setContado(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-lg font-bold outline-none focus:border-[#02AFBB]"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">
              Diferencia estimada
            </p>

            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className={`text-lg font-bold ${
                diferencia === null
                  ? 'text-gray-400'
                  : diferencia === 0
                    ? 'text-[#07838C]'
                    : 'text-red-600'
              }`}>
                {diferencia === null
                  ? 'Pendiente de conteo'
                  : dinero(diferencia)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor="arqueo-observaciones"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Observaciones
          </label>

          <textarea
            id="arqueo-observaciones"
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Explica cualquier faltante o sobrante..."
            className="w-full resize-none rounded-xl border border-gray-300 bg-white p-3 text-sm outline-none focus:border-[#02AFBB]"
          />
        </div>

        <button
          type="button"
          onClick={prepararArqueo}
          disabled={!importeValido || guardando || !resumen}
          className="mt-4 w-full rounded-xl bg-[#02AFBB] px-5 py-3 font-bold text-white transition hover:bg-[#078F99] disabled:opacity-40 sm:w-auto"
        >
          Registrar arqueo
        </button>
      </div>

      {mostrarHistorial && (
        <div className="mt-5 rounded-2xl border border-gray-200 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h4 className="font-bold text-gray-900">
              Historial de arqueos
            </h4>

            <button
              type="button"
              onClick={cargarHistorial}
              disabled={cargando}
              className="flex items-center gap-2 text-sm text-[#07838C] disabled:opacity-40"
            >
              <RefreshCw size={16} />
              Actualizar
            </button>
          </div>

          {cargando ? (
            <p className="text-sm text-gray-500">
              Consultando registros...
            </p>
          ) : arqueos.length === 0 ? (
            <p className="text-sm text-gray-500">
              No existen arqueos registrados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="border-b text-gray-500">
                  <tr>
                    <th className="p-3">Colaborador</th>
                    <th>Fecha y hora</th>
                    <th>Esperado</th>
                    <th>Contado</th>
                    <th>Diferencia</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>

                <tbody>
                  {arqueos.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="p-3 font-semibold">
                        {item.colaborador}
                      </td>
                      <td>{fechaHora(item.realizado_at)}</td>
                      <td>{dinero(item.efectivo_esperado)}</td>
                      <td>{dinero(item.efectivo_contado)}</td>
                      <td className={
                        Number(item.diferencia) === 0
                          ? 'font-semibold text-[#07838C]'
                          : 'font-semibold text-red-600'
                      }>
                        {dinero(item.diferencia)}
                      </td>
                      <td>{item.observaciones || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {confirmar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-arqueo"
            className="w-full max-w-md rounded-2xl border-t-4 border-[#02AFBB] bg-white p-6 shadow-2xl"
          >
            <h3
              id="titulo-arqueo"
              className="text-2xl font-bold text-gray-900"
            >
              Confirmar arqueo
            </h3>

            <p className="mt-3 text-sm text-gray-600">
              Confirma el dinero contado físicamente.
            </p>

            <div className="mt-5 space-y-3 rounded-xl bg-gray-50 p-4">
              <div className="flex justify-between">
                <span>Declarado</span>
                <strong>{dinero(contado)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Diferencia estimada</span>
                <strong>{dinero(diferencia)}</strong>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={guardando}
                onClick={() => setConfirmar(false)}
                className="rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 disabled:opacity-40"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={guardando}
                onClick={registrar}
                className="rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white disabled:opacity-40"
              >
                {guardando ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
