'use client'

// MAK_CIERRE_CAJA_V1

import { useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

function dinero(valor) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(valor || 0))
}

export default function CierreCajaPanel({ cajaId, onCerrada }) {
  const [abierto, setAbierto] = useState(false)
  const [contado, setContado] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [resumen, setResumen] = useState(null)

  const valido =
    /^\d+(\.\d{1,2})?$/.test(contado.trim()) &&
    Number(contado) <= 9999999999.99

  const diferencia = valido && resumen
    ? Math.round(
        (Number(contado) - Number(resumen.efectivo_esperado))
        * 100
      ) / 100
    : null

  function cerrarModal() {
    if (guardando) return
    setAbierto(false)
    setResumen(null)
    setContado('')
    setObservaciones('')
    setError('')
  }

  async function preparar() {
    setError('')
    setResumen(null)

    try {
      const { data, error: fallo } = await supabase.rpc(
        'mak_resumen_caja_actual'
      )

      if (fallo) throw fallo

      if (!data?.caja_abierta || data.caja_id !== cajaId) {
        throw new Error(
          'La caja ha cambiado o ya no está abierta.'
        )
      }

      setResumen(data)
      setAbierto(true)
    } catch (err) {
      setError(err.message || 'No se pudo consultar la caja.')
    }
  }

  async function confirmarCierre() {
    if (guardando || !valido || !resumen) return

    if (diferencia !== 0 && !observaciones.trim()) {
      setError('Debes justificar el faltante o sobrante.')
      return
    }

    setGuardando(true)
    setError('')

    try {
      // Revalidar antes de ejecutar el cierre.
      const { data: actual, error: errorActual } =
        await supabase.rpc('mak_resumen_caja_actual')

      if (errorActual) throw errorActual

      if (!actual?.caja_abierta || actual.caja_id !== cajaId) {
        throw new Error(
          'La caja cambió. No se realizó el cierre.'
        )
      }

      if (
        Number(actual.efectivo_esperado) !==
        Number(resumen.efectivo_esperado)
      ) {
        setResumen(actual)
        throw new Error(
          'El saldo cambió durante el conteo. ' +
          'Verifica nuevamente el efectivo antes de cerrar.'
        )
      }

      const { error: fallo } = await supabase.rpc(
        'mak_cerrar_caja_dia',
        {
          p_efectivo_contado: Number(contado),
          p_observaciones: observaciones.trim() || null,
        }
      )

      if (fallo) throw fallo

      cerrarModal()
      await onCerrada()
    } catch (err) {
      setError(err.message || 'No se pudo cerrar la caja.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="border-t border-gray-200 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <LockKeyhole size={21} className="text-[#02AFBB]" />
            Cierre administrativo
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Arqueo definitivo y cierre de caja del día.
          </p>
        </div>

        <button
          type="button"
          onClick={preparar}
          disabled={guardando}
          className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-40"
        >
          Cerrar caja del día
        </button>
      </div>

      {error && !abierto && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {abierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cierre-caja"
            className="w-full max-w-md rounded-2xl border-t-4 border-[#02AFBB] bg-white p-6 shadow-2xl"
          >
            <h2
              id="titulo-cierre-caja"
              className="text-2xl font-bold text-gray-900"
            >
              Cierre de caja
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Cuenta todo el efectivo físico antes de confirmar.
            </p>

            <div className="mt-5 rounded-xl bg-[#02AFBB]/10 p-4">
              <p className="text-sm text-[#07838C]">
                Efectivo esperado
              </p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {dinero(resumen?.efectivo_esperado)}
              </p>
            </div>

            <label className="mt-5 block text-sm font-semibold text-gray-700">
              Efectivo contado (USD)
              <input
                type="text"
                inputMode="decimal"
                value={contado}
                onChange={(e) => setContado(e.target.value)}
                placeholder="0.00"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-lg outline-none focus:border-[#02AFBB]"
              />
            </label>

            <div className="mt-4 flex justify-between text-sm">
              <span className="text-gray-600">
                Diferencia
              </span>
              <strong className={
                diferencia === null
                  ? 'text-gray-400'
                  : diferencia === 0
                    ? 'text-[#07838C]'
                    : 'text-red-600'
              }>
                {diferencia === null
                  ? 'Pendiente'
                  : dinero(diferencia)}
              </strong>
            </div>

            <label className="mt-4 block text-sm font-semibold text-gray-700">
              Observaciones
              <textarea
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Justifica cualquier diferencia..."
                className="mt-2 w-full resize-none rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-[#02AFBB]"
              />
            </label>

            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <p className="mt-4 text-xs text-gray-500">
              Esta operación es definitiva. No se podrán
              registrar nuevos movimientos en esta caja.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                className="rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 disabled:opacity-40"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarCierre}
                disabled={
                  guardando ||
                  !valido ||
                  (diferencia !== 0 && !observaciones.trim())
                }
                className="rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white disabled:opacity-40"
              >
                {guardando ? 'Cerrando...' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
