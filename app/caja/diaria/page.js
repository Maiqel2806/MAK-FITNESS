'use client'

// MAK_CAJA_DIARIA_V1

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Wallet,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { parsearDinero, esDineroValido, limpiarEntradaDinero } from '@/lib/dinero'
import { usePerfil } from '@/components/UserContext'
import ArqueoCajaPanel from '@/components/ArqueoCajaPanel'
import EntregaCajaPanel from '@/components/EntregaCajaPanel'
import CierreCajaPanel from '@/components/CierreCajaPanel'
import TicketCierreCaja from '@/components/TicketCierreCaja'

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
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function CajaDiariaPage() {
  const perfil = usePerfil()

  // MAK_RESUMEN_CAJA_V1
  // MAK_ESTADO_CAJA_HOY_V1
  const [caja, setCaja] = useState(null)
  const [cajaHoy, setCajaHoy] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [errorResumen, setErrorResumen] = useState('')
  const [fondo, setFondo] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [info, setInfo] = useState(null)
  const [historial, setHistorial] = useState(null)
  const [programada, setProgramada] = useState(null)
  const [pedirMotivo, setPedirMotivo] = useState(false)
  const [verHistorial, setVerHistorial] = useState(false)
  const [incluirPruebas, setIncluirPruebas] = useState(false)
  const [ticket, setTicket] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const esAdministrador = ['dueno', 'administrador']
    .includes(perfil?.rol)

  const consultar = useCallback(async () => {
    setCargando(true)
    setError('')

    try {
      const { data, error: fallo } = await supabase.rpc(
        'mak_consultar_caja_actual'
      )

      if (fallo) throw fallo

      const { data: estadoHoy, error: errorEstado } =
        await supabase.rpc('mak_estado_caja_hoy')

      if (errorEstado) throw errorEstado

      setCajaHoy(estadoHoy)
      setCaja(data || { caja_abierta: false })

      // Solo administración puede consultar esto; para otros roles falla en silencio.
      try {
        const { data: infoData } = await supabase.rpc('mak_info_apertura_caja')
        setInfo(infoData || null)
      } catch {
        setInfo(null)
      }

      // Para el personal: indica si hay apertura programada (sin mostrar montos).
      try {
        const { data: prog } = await supabase.rpc('mak_estado_apertura_programada')
        setProgramada(prog || null)
      } catch {
        setProgramada(null)
      }
      setResumen(null)
      setErrorResumen('')

      if (data?.caja_abierta) {
        const { data: resumenData, error: resumenError } =
          await supabase.rpc('mak_resumen_caja_actual')

        if (resumenError) {
          setErrorResumen(resumenError.message)
        } else if (
          resumenData?.caja_abierta &&
          resumenData?.caja_id === data.id
        ) {
          setResumen(resumenData)
        } else {
          setErrorResumen(
            'No se pudo verificar el resumen de esta caja.'
          )
        }
      }
    } catch (err) {
      setError(
        err.message || 'No se pudo consultar la caja.'
      )
      setCaja(null)
      setCajaHoy(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    consultar()
  }, [consultar])

  const fondoValido = esDineroValido(fondo)
  // Administración abre siempre; el personal solo si hay apertura programada.
  const puedeAbrir = esAdministrador || programada?.programada === true
  const montoFondo = fondoValido ? parsearDinero(fondo) : null
  const esperadaApertura = info?.efectivo_dejado_ultimo == null
    ? null
    : Number(info.efectivo_dejado_ultimo)
  const difApertura = montoFondo !== null && esperadaApertura !== null
    ? Math.round((montoFondo - esperadaApertura) * 100) / 100
    : null
  const falta = (
    (difApertura !== null && difApertura !== 0) ||
    (!esAdministrador && pedirMotivo)
  ) && justificacion.trim().length < 10
  const mostrarMotivo = (difApertura !== null && difApertura !== 0) ||
    (!esAdministrador && pedirMotivo)

  async function traerHistorial(conPruebas) {
    const { data, error: fallo } = await supabase.rpc('mak_historial_cajas', {
      p_limite: 31,
      p_incluir_pruebas: conPruebas,
    })
    if (fallo) setError(fallo.message)
    else setHistorial(data || [])
  }

  async function cargarHistorial() {
    setVerHistorial((v) => !v)
    if (historial) return
    await traerHistorial(incluirPruebas)
  }

  async function alternarPruebas(valor) {
    setIncluirPruebas(valor)
    await traerHistorial(valor)
  }

  async function abrirCaja() {
    if (
      guardando ||
      cargando ||
      !puedeAbrir ||
      !fondoValido ||
      falta ||
      caja?.caja_abierta ||
      cajaHoy?.caja_registrada
    ) return

    setGuardando(true)
    setError('')
    setMensaje('')
    setConfirmar(false)

    try {
      const { error: fallo } = await supabase.rpc(
        'mak_abrir_caja_dia',
        {
          p_fondo: parsearDinero(fondo),
          p_justificacion: mostrarMotivo ? justificacion.trim() : null,
        }
      )

      if (fallo) throw fallo

      setFondo('')
      setJustificacion('')
      setPedirMotivo(false)
      setHistorial(null)
      await consultar()
      setMensaje('Caja abierta correctamente.')
    } catch (err) {
      // MAK_FIX_ERROR_APERTURA_V1
      // Consultar limpia los errores: mostrar el fallo después.
      await consultar()
      setMensaje('')
      if (/no coincide/i.test(err.message || '')) {
        setPedirMotivo(true)
        setError(
          'El efectivo contado no coincide con lo que dejó administración. ' +
          'Cuenta de nuevo; si es correcto, explica la diferencia y confirma.'
        )
      } else {
        setError(
          err.message || 'No se pudo abrir la caja.'
        )
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={esAdministrador ? '/caja' : '/registro-colaboradores'}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#07838C] hover:underline"
        >
          <ArrowLeft size={18} />
          {esAdministrador ? 'Volver a Caja' : 'Volver al Registro'}
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Caja Diaria
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Apertura y control de la caja física de MAK FITNESS.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {mensaje && (
        <div
          role="status"
          className="rounded-xl border border-[#02AFBB]/30 bg-[#02AFBB]/10 p-4 text-sm font-semibold text-[#07838C]"
        >
          {mensaje}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#02AFBB]/10 p-3">
              <Wallet size={25} className="text-[#07838C]" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Estado de caja
              </h2>
              <p className="text-sm text-gray-500">
                Caja física compartida
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={consultar}
            disabled={cargando || guardando}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={17} />
            Actualizar
          </button>
        </div>

        {cargando ? (
          <p className="mt-6 text-gray-500">
            Consultando estado de caja...
          </p>
        ) : caja?.caja_abierta ? (
          <div className="mt-6 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#02AFBB]/10 px-4 py-2 text-sm font-semibold text-[#07838C]">
              <CheckCircle2 size={18} />
              Caja abierta
            </div>

            {(info?.caja_abierta_vencida || programada?.caja_abierta_vencida) && (
              <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                Esta caja es de un día anterior y quedó abierta. Administración debe contar el efectivo y cerrarla antes de seguir cobrando en efectivo.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-5">
                <p className="text-sm text-gray-500">
                  Fondo inicial
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {dinero(caja.fondo_inicial)}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-5">
                <p className="text-sm text-gray-500">
                  Fecha de apertura
                </p>
                <p className="mt-2 text-lg font-bold text-gray-900">
                  {fechaHora(caja.abierta_at)}
                </p>
              </div>
            </div>

            {/* MAK_CIERRE_CAJA_V1 */}
            {esAdministrador && (
              <CierreCajaPanel
                cajaId={caja.id}
                onCerrada={async (resultado) => {
                  setTicket({
                    ...resultado,
                    responsable: perfil?.nombre || perfil?.usuario || null,
                  })
                  setMensaje('Caja cerrada correctamente. El cierre quedó registrado en Supabase.')
                  await consultar()
                }}
              />
            )}

            {/* MAK_ENTREGA_CAJA_V1 */}
            <EntregaCajaPanel
              cajaId={caja.id}
              esAdministrador={esAdministrador}
            />

            {/* MAK_ARQUEO_COMPARTIDO_V1 */}
            <ArqueoCajaPanel
              cajaId={caja.id}
              resumen={resumen}
              esAdministrador={esAdministrador}
            />

            <div className="border-t border-gray-200 pt-5">

              <h3 className="mb-4 text-lg font-bold text-gray-900">
                Resumen de efectivo
              </h3>

              {errorResumen && (
                <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {errorResumen}
                </div>
              )}

              {resumen ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">

                    <div className="rounded-xl border border-gray-200 p-5">
                      <p className="text-sm text-gray-500">
                        Ingresos en efectivo
                      </p>
                      <p className="mt-2 text-2xl font-bold text-gray-900">
                        {dinero(resumen.ingresos_efectivo)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-5">
                      <p className="text-sm text-gray-500">
                        Egresos en efectivo
                      </p>
                      <p className="mt-2 text-2xl font-bold text-gray-900">
                        {dinero(resumen.egresos_efectivo)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-5">
                      <p className="text-sm text-gray-500">
                        Ajustes de caja
                      </p>
                      <p className="mt-2 text-2xl font-bold text-gray-900">
                        {dinero(resumen.ajustes)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-5">
                      <p className="text-sm text-gray-500">
                        Movimientos registrados
                      </p>
                      <p className="mt-2 text-2xl font-bold text-gray-900">
                        {resumen.total_movimientos ?? 0}
                      </p>
                    </div>

                  </div>

                  {esAdministrador && (
                  <div className="mt-5 rounded-2xl border border-[#02AFBB]/30 bg-[#02AFBB]/10 p-6">

                    <p className="text-sm font-semibold text-[#07838C]">
                      EFECTIVO ESPERADO EN CAJA
                    </p>

                    <p className="mt-2 text-4xl font-bold text-gray-900">
                      {dinero(resumen.efectivo_esperado)}
                    </p>

                    <p className="mt-3 text-xs text-gray-600">
                      Fondo inicial más movimientos registrados.
                      Saldo pendiente de arqueo físico.
                    </p>

                  </div>
                  )}

                  {(resumen.movimientos_sin_responsable ?? 0) > 0 && (
                    <p className="mt-4 text-sm font-semibold text-amber-700">
                      Atención: existen movimientos sin responsable.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  No hay un resumen financiero disponible.
                </p>
              )}

            </div>
          </div>
        ) : cajaHoy?.caja_registrada &&
            cajaHoy?.estado === 'cerrada' ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-lg font-bold text-amber-900">
                Caja del día cerrada
              </p>
              <p className="mt-2 text-sm text-amber-800">
                La jornada del {cajaHoy.fecha} ya fue cerrada.
                No se puede abrir otra caja para esta misma fecha.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500">
                  Fondo inicial registrado
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {dinero(cajaHoy.fondo_inicial)}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500">
                  Fecha y hora del cierre
                </p>
                <p className="mt-2 text-lg font-bold text-gray-900">
                  {fechaHora(cajaHoy.cerrada_at)}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500">
                  Efectivo contado al cierre
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {cajaHoy.efectivo_contado_cierre == null
                    ? 'No registrado'
                    : dinero(cajaHoy.efectivo_contado_cierre)}
                </p>
              </div>
            </div>

            {esAdministrador && info?.efectivo_dejado_ultimo != null && (
              <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                Efectivo que quedó en caja para la próxima apertura:{' '}
                <strong>{dinero(info.efectivo_dejado_ultimo)}</strong>
              </p>
            )}

            <p className="text-sm text-gray-500">
              Este cierre es compartido por administración
              y colaboradores. La siguiente caja se abrirá
              cuando comience una nueva fecha de operación.
            </p>
          </div>
        ) : caja ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="font-semibold text-gray-900">
                No hay una caja abierta.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {esAdministrador
                  ? 'Registra el efectivo contado para comenzar la jornada.'
                  : 'Cuenta el efectivo que dejó administración y regístralo para comenzar la jornada.'}
              </p>
            </div>

            {!esAdministrador && !cajaHoy?.caja_registrada && programada?.programada === false && (
              <p className="text-sm font-semibold text-amber-700">
                No hay apertura programada. Solicita a administración abrir la caja.
              </p>
            )}

            {puedeAbrir && !cajaHoy?.caja_registrada && (
              <div className="max-w-sm space-y-3">
                <label
                  htmlFor="fondo-inicial"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Efectivo físico contado en caja (USD)
                </label>

                <input
                  id="fondo-inicial"
                  type="text"
                  inputMode="decimal"
                  value={fondo}
                  onChange={(e) => setFondo(limpiarEntradaDinero(e.target.value))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg font-semibold outline-none focus:border-[#02AFBB]"
                  placeholder="0.00"
                />

                {mostrarMotivo && (
                  <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-semibold text-red-700">
                      {esAdministrador && difApertura !== null
                        ? `No coincide con lo dejado en el último cierre (${dinero(difApertura)}). Cuenta de nuevo; si es correcto, explica la diferencia.`
                        : 'No coincide con lo que dejó administración. Cuenta de nuevo; si es correcto, explica la diferencia.'}
                    </p>
                    <textarea
                      rows={2}
                      value={justificacion}
                      onChange={(e) => setJustificacion(e.target.value)}
                      placeholder="Motivo de la diferencia (mín. 10 caracteres)"
                      className="w-full resize-none rounded-lg border border-red-200 bg-white p-2 text-sm outline-none"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setConfirmar(true)}
                  disabled={!fondoValido || falta || guardando}
                  className="w-full rounded-xl bg-[#02AFBB] px-5 py-3 font-bold text-white hover:bg-[#078F99] disabled:opacity-40"
                >
                  Abrir caja del día
                </button>
              </div>
            )}

            {esAdministrador && info?.efectivo_dejado_ultimo == null && !cajaHoy?.caja_registrada && (
              <p className="text-xs text-gray-500">
                Primera apertura con el nuevo control: cuenta el efectivo físico y regístralo. Desde el próximo cierre se comparará automáticamente.
              </p>
            )}
          </div>
        ) : null}
      </section>

      {esAdministrador && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <button
            type="button"
            onClick={cargarHistorial}
            className="text-sm font-bold text-[#07838C] hover:underline"
          >
            {verHistorial ? 'Ocultar historial de cajas' : 'Ver historial de cajas (últimos 31)'}
          </button>

          {verHistorial && (
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={incluirPruebas}
                onChange={(e) => alternarPruebas(e.target.checked)}
              />
              Incluir cajas de prueba (auditoría)
            </label>
          )}

          {verHistorial && historial && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b text-gray-500">
                  <tr>
                    <th className="p-2">Fecha</th>
                    <th>Apertura</th>
                    <th>Dif. apertura</th>
                    <th>Esperado cierre</th>
                    <th>Contado</th>
                    <th>Dif. cierre</th>
                    <th>Retiro</th>
                    <th>Dejado</th>
                    <th>Ticket</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100" title={[c.apertura_justificacion, c.observaciones].filter(Boolean).join(' | ')}>
                      <td className="p-2 font-semibold">{c.fecha}{c.estado === 'abierta' ? ' (abierta)' : ''}
                        {c.es_prueba && (
                          <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">PRUEBA</span>
                        )}
                      </td>
                      <td>{dinero(c.fondo_inicial)}</td>
                      <td className={Number(c.apertura_diferencia || 0) !== 0 ? 'font-semibold text-red-600' : ''}>
                        {c.apertura_diferencia == null ? '—' : dinero(c.apertura_diferencia)}
                      </td>
                      <td>{c.efectivo_esperado_cierre == null ? '—' : dinero(c.efectivo_esperado_cierre)}</td>
                      <td>{c.efectivo_contado_cierre == null ? '—' : dinero(c.efectivo_contado_cierre)}</td>
                      <td className={Number(c.diferencia_cierre || 0) !== 0 ? 'font-semibold text-red-600' : ''}>
                        {c.diferencia_cierre == null ? '—' : dinero(c.diferencia_cierre)}
                      </td>
                      <td>{c.retiro_cierre == null ? '—' : dinero(c.retiro_cierre)}</td>
                      <td>{c.efectivo_dejado == null ? '—' : dinero(c.efectivo_dejado)}</td>
                      <td>
                        {c.estado === 'cerrada' && c.efectivo_esperado_cierre != null ? (
                          <button
                            type="button"
                            className="text-xs font-bold text-[#07838C] hover:underline"
                            onClick={() => setTicket({
                              fecha: c.fecha,
                              fondo_inicial: c.fondo_inicial,
                              efectivo_esperado: c.efectivo_esperado_cierre,
                              efectivo_contado: c.efectivo_contado_cierre,
                              retiro: c.retiro_cierre,
                              efectivo_dejado: c.efectivo_dejado,
                              observaciones: c.observaciones,
                            })}
                          >
                            Ver
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-gray-500">Pasa el cursor sobre una fila para ver las justificaciones.</p>
            </div>
          )}
        </section>
      )}

      <TicketCierreCaja ticket={ticket} onCerrar={() => setTicket(null)} />

      {confirmar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-abrir-caja"
            className="w-full max-w-md rounded-2xl border-t-4 border-[#02AFBB] bg-white p-6 shadow-2xl"
          >
            <h2
              id="titulo-abrir-caja"
              className="text-2xl font-bold text-gray-900"
            >
              Confirmar apertura
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              ¿Confirmas la apertura de caja con
              <strong> {dinero(parsearDinero(fondo))}</strong> de efectivo contado?
            </p>

            <p className="mt-3 text-sm text-gray-500">
              Este monto es el efectivo físico contado ahora.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmar(false)}
                disabled={guardando}
                className="rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={abrirCaja}
                disabled={guardando || !fondoValido}
                className="rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                {guardando ? 'Abriendo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
