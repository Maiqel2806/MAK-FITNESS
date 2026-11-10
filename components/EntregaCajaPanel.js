'use client'

// MAK_ENTREGA_CAJA_V1
// MAK_RESOLVER_ENTREGA_V1

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeftRight,
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

function montoValido(valor) {
  return /^\d+(\.\d{1,2})?$/.test(valor.trim()) &&
    Number(valor) <= 9999999999.99
}

function estadoEntrega(estado) {
  return {
    pendiente: 'Pendiente de recepción',
    confirmada: 'Confirmada',
    disputada: 'Con diferencias',
    cancelada: 'Cancelada',
  }[estado] || estado
}

export default function EntregaCajaPanel({
  cajaId,
  esAdministrador,
}) {
  const [usuarioId, setUsuarioId] = useState(null)
  const [entregas, setEntregas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [mostrarHistorial, setMostrarHistorial] = useState(false)

  const [accion, setAccion] = useState(null)
  const [entregaElegida, setEntregaElegida] = useState(null)
  const [importe, setImporte] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')

    try {
      const [respuestaUsuario, respuestaEntregas] =
        await Promise.all([
          supabase.auth.getUser(),
          supabase.rpc('mak_consultar_entregas_caja'),
        ])

      if (respuestaUsuario.error) {
        throw respuestaUsuario.error
      }

      if (respuestaEntregas.error) {
        throw respuestaEntregas.error
      }

      const data = respuestaEntregas.data

      if (!data?.caja_abierta || data.caja_id !== cajaId) {
        throw new Error(
          'La caja cambió. Actualiza Caja Diaria.'
        )
      }

      setUsuarioId(respuestaUsuario.data.user?.id || null)
      setEntregas(data.entregas || [])
    } catch (err) {
      setEntregas([])
      setError(err.message || 'No se pudieron consultar las entregas.')
    } finally {
      setCargando(false)
    }
  }, [cajaId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const pendiente = entregas.find(
    (e) => e.estado === 'pendiente'
  )

  const disputada = entregas.find(
    (e) => e.estado === 'disputada'
  )

  function abrirModal(tipo, entrega = null) {
    if (guardando || cargando) return

    setAccion(tipo)
    setEntregaElegida(entrega)
    setImporte('')
    setObservaciones('')
    setError('')
    setMensaje('')
  }

  function cerrarModal() {
    if (guardando) return
    setAccion(null)
    setEntregaElegida(null)
  }

  async function confirmar() {
    if (guardando) return

    if (!['cancelar', 'resolver'].includes(accion) &&
        !montoValido(importe)) {
      setError('Ingresa un importe válido con máximo dos decimales.')
      return
    }

    if (accion === 'cancelar' && !observaciones.trim()) {
      setError('Indica el motivo de cancelación.')
      return
    }

    if (accion === 'resolver' &&
        observaciones.trim().length < 10) {
      setError(
        'Describe la resolución con al menos 10 caracteres.'
      )
      return
    }

    setGuardando(true)
    setError('')
    setMensaje('')

    try {
      let funcion
      let parametros

      if (accion === 'entregar') {
        funcion = 'mak_iniciar_entrega_caja'
        parametros = {
          p_efectivo: Number(importe),
          p_observaciones: observaciones.trim() || null,
        }
      } else if (accion === 'recibir') {
        if (!entregaElegida?.id) {
          throw new Error('Selecciona una entrega válida.')
        }

        funcion = 'mak_recibir_entrega_caja'
        parametros = {
          p_entrega_id: entregaElegida.id,
          p_efectivo: Number(importe),
          p_observaciones: observaciones.trim() || null,
        }
      } else if (accion === 'resolver') {
        if (!esAdministrador || !entregaElegida?.id) {
          throw new Error('Operación no autorizada.')
        }

        if (observaciones.trim().length < 10) {
          throw new Error(
            'Describe la resolución con al menos 10 caracteres.'
          )
        }

        funcion = 'mak_resolver_entrega_caja'
        parametros = {
          p_entrega_id: entregaElegida.id,
          p_resolucion: observaciones.trim(),
        }
      } else if (accion === 'cancelar') {
        if (!esAdministrador || !entregaElegida?.id) {
          throw new Error('Operación no autorizada.')
        }

        funcion = 'mak_cancelar_entrega_caja'
        parametros = {
          p_entrega_id: entregaElegida.id,
          p_motivo: observaciones.trim(),
        }
      } else {
        throw new Error('Acción inválida.')
      }

      const { data, error: fallo } = await supabase.rpc(
        funcion,
        parametros
      )

      if (fallo) throw fallo

      setAccion(null)
      setEntregaElegida(null)
      setImporte('')
      setObservaciones('')

      if (accion === 'entregar') {
        setMensaje('Entrega registrada. Pendiente de recepción.')
      } else if (accion === 'recibir') {
        setMensaje(
          data?.estado === 'disputada'
            ? 'Recepción registrada con diferencias. Requiere revisión administrativa.'
            : 'Recepción confirmada correctamente.'
        )
      } else if (accion === 'resolver') {
        setMensaje(
          'Incidencia resuelta. Las diferencias originales se conservaron.'
        )
      } else {
        setMensaje('Entrega pendiente cancelada correctamente.')
      }

      await cargar()
    } catch (err) {
      setError(err.message || 'No se pudo completar la operación.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="border-t border-gray-200 pt-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <ArrowLeftRight size={22} className="text-[#02AFBB]" />
            Entrega y recepción de caja
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Traspaso de efectivo entre colaboradores.
          </p>
        </div>

        <button
          type="button"
          onClick={cargar}
          disabled={cargando || guardando}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-40"
        >
          <RefreshCw size={16} />
          Actualizar
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
        {disputada ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <AlertTriangle size={20} className="shrink-0" />
            <div>
              <p className="font-bold">
                Entrega con diferencias pendientes
              </p>
              <p className="mt-1 text-sm">
                No se pueden iniciar nuevas entregas hasta que
                administración resuelva esta situación.
              </p>

              {esAdministrador && (
                <button
                  type="button"
                  onClick={() => abrirModal('resolver', disputada)}
                  disabled={cargando || guardando}
                  className="mt-4 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-40"
                >
                  Resolver diferencia
                </button>
              )}
            </div>
          </div>
        ) : pendiente ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-bold text-amber-800">
                Entrega pendiente de recepción
              </p>
              <p className="mt-2 text-sm text-gray-700">
                Entrega: {pendiente.entregado_por_nombre}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                Efectivo declarado: {dinero(pendiente.efectivo_entregado)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {fechaHora(pendiente.creado_at)}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {usuarioId &&
                pendiente.entrega_por !== usuarioId && (
                  <button
                    type="button"
                    onClick={() => abrirModal('recibir', pendiente)}
                    disabled={cargando}
                    className="rounded-xl bg-[#02AFBB] px-5 py-3 font-bold text-white hover:bg-[#078F99] disabled:opacity-40"
                  >
                    Recibir caja
                  </button>
                )}

              {esAdministrador && (
                <button
                  type="button"
                  onClick={() => abrirModal('cancelar', pendiente)}
                  disabled={cargando}
                  className="rounded-xl border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"
                >
                  Cancelar entrega
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center gap-2 text-sm text-[#07838C]">
              <CheckCircle2 size={18} />
              No existen entregas pendientes.
            </div>

            <p className="mb-4 text-sm text-gray-600">
              Al cambiar de responsable, detengan los cobros
              mientras realizan el conteo y la recepción.
            </p>

            <button
              type="button"
              onClick={() => abrirModal('entregar')}
              disabled={cargando || !usuarioId}
              className="rounded-xl bg-[#02AFBB] px-5 py-3 font-bold text-white hover:bg-[#078F99] disabled:opacity-40"
            >
              Entregar caja
            </button>
          </div>
        )}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setMostrarHistorial(!mostrarHistorial)}
          className="text-sm font-semibold text-[#07838C] hover:underline"
        >
          {mostrarHistorial
            ? 'Ocultar historial de entregas'
            : 'Consultar historial de entregas'}
        </button>

        {mostrarHistorial && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-500">
                <tr>
                  <th className="p-3">Entrega</th>
                  <th>Recibe</th>
                  <th>Fecha</th>
                  <th>Entregado</th>
                  <th>Recibido</th>
                  <th>Diferencia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {entregas.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100">
                    <td className="p-3 font-semibold">
                      {e.entregado_por_nombre}
                    </td>
                    <td>{e.recibido_por_nombre || '—'}</td>
                    <td>{fechaHora(e.creado_at)}</td>
                    <td>{dinero(e.efectivo_entregado)}</td>
                    <td>
                      {e.efectivo_recibido === null
                        ? '—'
                        : dinero(e.efectivo_recibido)}
                    </td>
                    <td>
                      {e.diferencia_recepcion === null
                        ? '—'
                        : dinero(e.diferencia_recepcion)}
                    </td>
                    <td>
                      {e.estado === 'confirmada' &&
                      (
                        Number(e.diferencia_entrega || 0) !== 0 ||
                        Number(e.diferencia_recepcion || 0) !== 0
                      )
                        ? 'Resuelta con diferencia'
                        : estadoEntrega(e.estado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!entregas.length && !cargando && (
              <p className="p-5 text-center text-sm text-gray-500">
                No existen entregas registradas.
              </p>
            )}
          </div>
        )}
      </div>

      {accion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-entrega-caja"
            className="w-full max-w-md rounded-2xl border-t-4 border-[#02AFBB] bg-white p-6 shadow-2xl"
          >
            <h3
              id="titulo-entrega-caja"
              className="text-2xl font-bold text-gray-900"
            >
              {accion === 'entregar'
                ? 'Entregar caja'
                : accion === 'recibir'
                  ? 'Recibir caja'
                  : accion === 'resolver'
                    ? 'Resolver diferencia'
                    : 'Cancelar entrega'}
            </h3>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              {accion === 'entregar'
                ? 'Cuenta el dinero físico que entregarás al siguiente colaborador.'
                : accion === 'recibir'
                  ? 'Cuenta personalmente el efectivo antes de confirmar la recepción.'
                  : accion === 'resolver'
                    ? 'Documenta la revisión administrativa. Los importes y diferencias originales se conservarán.'
                    : 'Esta acción cancelará la entrega pendiente y conservará su historial.'}
            </p>

            {!['cancelar', 'resolver'].includes(accion) && (
              <div className="mt-5">
                <label
                  htmlFor="importe-entrega"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Efectivo contado (USD)
                </label>
                <input
                  id="importe-entrega"
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg font-bold outline-none focus:border-[#02AFBB]"
                />
              </div>
            )}

            <div className="mt-4">
              <label
                htmlFor="observaciones-entrega"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                {accion === 'cancelar'
                  ? 'Motivo de cancelación'
                  : accion === 'resolver'
                    ? 'Resolución administrativa'
                    : 'Observaciones'}
              </label>
              <textarea
                id="observaciones-entrega"
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full resize-none rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-[#02AFBB]"
                placeholder="Describe cualquier diferencia o novedad."
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={guardando}
                onClick={cerrarModal}
                className="rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 disabled:opacity-40"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={
                  guardando ||
                  (accion === 'cancelar'
                    ? !observaciones.trim()
                    : accion === 'resolver'
                      ? observaciones.trim().length < 10
                      : !montoValido(importe))
                }
                onClick={confirmar}
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
