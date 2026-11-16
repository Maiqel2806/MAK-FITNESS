'use client'

// MAK_REGISTRO_ENTRADA_MODAL_V1
// Registra la asistencia de un socio desde la pantalla de Miembros (misma validación que /asistencia).

import { useEffect, useMemo, useState } from 'react'
import { X, CheckCircle2, AlertTriangle, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import {
  fechaHoyGuayaquil,
  inicioDiaISOGuayaquil,
  finDiaISOGuayaquil,
  formatearFecha,
  obtenerEstadoMembresia,
  obtenerNombrePlan,
  claseEstado,
} from '@/lib/estadoMembresia'

const supabase = createClient()

function horaLocal(ts) {
  return new Date(ts).toLocaleTimeString('es-EC', {
    timeZone: 'America/Guayaquil',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function RegistroEntradaModal({ miembro, onCerrar, onRegistrada }) {
  const [membresias, setMembresias] = useState(null)
  const [entradasHoy, setEntradasHoy] = useState([])
  const [observacion, setObservacion] = useState('')
  const [confirmaOtra, setConfirmaOtra] = useState(false)
  const [registrando, setRegistrando] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(null)

  useEffect(() => {
    let vivo = true

    async function cargar() {
      const hoy = fechaHoyGuayaquil()

      const [resMem, resAsis] = await Promise.all([
        supabase
          .from('membresias')
          .select('*, planes ( id, nombre, precio, duracion_dias )')
          .eq('miembro_id', miembro.id)
          .order('fecha_fin', { ascending: false }),
        supabase
          .from('asistencia')
          .select('id, fecha_entrada')
          .eq('miembro_id', miembro.id)
          .gte('fecha_entrada', inicioDiaISOGuayaquil(hoy))
          .lte('fecha_entrada', finDiaISOGuayaquil(hoy))
          .order('fecha_entrada', { ascending: false }),
      ])

      if (!vivo) return

      if (resMem.error) {
        setError(resMem.error.message)
        setMembresias([])
      } else {
        setMembresias(resMem.data || [])
      }
      setEntradasHoy(resAsis.data || [])
    }

    cargar()
    return () => {
      vivo = false
    }
  }, [miembro.id])

  const estado = useMemo(() => {
    if (membresias === null) return null

    if (miembro.estado !== 'activo') {
      return {
        autorizado: false,
        tipo: 'miembro_inactivo',
        titulo: 'Miembro no activo',
        mensaje: `El estado actual del miembro es "${miembro.estado}". No se permite registrar entrada.`,
        membresia: null,
      }
    }

    if (!miembro.foto_url) {
      return {
        autorizado: false,
        tipo: 'sin_foto',
        titulo: 'Foto pendiente',
        mensaje: 'El socio no tiene foto registrada. Registra su foto (editar miembro) antes de permitir el ingreso.',
        membresia: null,
      }
    }

    return obtenerEstadoMembresia(membresias)
  }, [miembro, membresias])

  const yaEntroHoy = entradasHoy.length > 0
  const puedeRegistrar = Boolean(estado?.autorizado) && !registrando && !listo && (!yaEntroHoy || confirmaOtra)

  async function registrar() {
    if (!puedeRegistrar) return

    setRegistrando(true)
    setError('')

    const { error: fallo } = await supabase.rpc('registrar_asistencia_validada', {
      p_miembro_id: miembro.id,
      p_origen_registro: 'manual',
      p_metodo_verificacion: 'foto_verificacion_visual',
      p_verificado_visualmente: true,
      p_observacion: observacion.trim() || null,
    })

    setRegistrando(false)

    if (fallo) {
      setError(fallo.message)
      return
    }

    setListo({
      hora: new Date().toLocaleTimeString('es-EC', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit' }),
      plan: obtenerNombrePlan(estado.membresia),
      vence: estado.membresia?.fecha_fin || null,
    })

    if (onRegistrada) onRegistrada()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-entrada" className="max-h-[94vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 id="titulo-entrada" className="text-xl font-bold text-gray-900">
            Registrar entrada
          </h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
            <X size={22} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
            {miembro.foto_url ? (
              <img src={miembro.foto_url} alt={`Foto de ${miembro.nombre}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <UserRound size={36} className="text-gray-400" />
              </div>
            )}
          </div>
          <div>
            <p className="text-lg font-bold leading-tight text-gray-900">
              {miembro.nombre} {miembro.apellido}
            </p>
            {miembro.codigo_acceso && <p className="mt-1 text-sm text-gray-500">Código: {miembro.codigo_acceso}</p>}
            <p className="mt-1 text-xs text-gray-500">Compara la foto con la persona que está en recepción.</p>
          </div>
        </div>

        {membresias === null ? (
          <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Verificando membresía...</p>
        ) : listo ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
            <CheckCircle2 size={40} className="mx-auto text-green-700" />
            <p className="mt-2 text-lg font-bold text-green-800">Entrada registrada</p>
            <p className="mt-1 text-sm text-green-700">
              {listo.hora} · {listo.plan}
              {listo.vence ? ` · vence ${formatearFecha(listo.vence)}` : ''}
            </p>
          </div>
        ) : (
          <>
            {estado && (
              <div className={`mt-5 rounded-2xl border p-4 ${claseEstado(estado.tipo)}`}>
                <p className="font-bold">{estado.titulo}</p>
                <p className="mt-1 text-sm">{estado.mensaje}</p>
              </div>
            )}

            {yaEntroHoy && estado?.autorizado && (
              <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <p className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertTriangle size={18} />
                  Ya registró entrada hoy
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  A las {entradasHoy.map((e) => horaLocal(e.fecha_entrada)).join(', ')}.
                </p>
                <label className="mt-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <input type="checkbox" checked={confirmaOtra} onChange={(e) => setConfirmaOtra(e.target.checked)} />
                  Registrar otra entrada de todos modos
                </label>
              </div>
            )}

            {estado?.autorizado && (
              <label className="mt-4 block text-sm font-semibold text-gray-700">
                Observación (opcional)
                <input
                  type="text"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            )}
          </>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCerrar} className="rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-700">
            {listo ? 'Listo' : 'Cancelar'}
          </button>
          {!listo && (
            <button
              type="button"
              onClick={registrar}
              disabled={!puedeRegistrar}
              className="rounded-xl bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-40"
            >
              {registrando ? 'Registrando...' : 'Registrar entrada'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
