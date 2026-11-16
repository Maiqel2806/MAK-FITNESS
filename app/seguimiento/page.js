'use client'

// MAK_SEGUIMIENTO_SOCIOS_V1

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, MessageCircle, ClipboardPen, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { enlaceWhatsApp } from '@/lib/telefono'

const supabase = createClient()
const ZONA = 'America/Guayaquil'

const RESULTADOS = [
  { v: 'contactado', t: 'Hablé con el socio' },
  { v: 'no_contesta', t: 'No contestó' },
  { v: 'volvera', t: 'Dijo que volverá pronto' },
  { v: 'pausa', t: 'Pausa temporal' },
  { v: 'no_continuara', t: 'No continuará' },
]
const CANALES = [
  { v: 'whatsapp', t: 'WhatsApp' },
  { v: 'llamada', t: 'Llamada' },
  { v: 'presencial', t: 'Presencial' },
  { v: 'otro', t: 'Otro' },
]
const MOTIVOS = ['Viaje', 'Trabajo o estudios', 'Salud o lesión', 'Problema económico', 'Horario', 'Desmotivación', 'Cambio de gimnasio']

function etiquetaResultado(v) {
  return RESULTADOS.find((r) => r.v === v)?.t || v
}

function hoyGuayaquil() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function fechaCorta(f) {
  if (!f) return '—'
  const [y, m, d] = String(f).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function diasDesde(ts) {
  if (!ts) return null
  const a = new Date(`${hoyGuayaquil()}T00:00:00-05:00`).getTime()
  const b = new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date(ts))}T00:00:00-05:00`).getTime()
  return Math.round((a - b) / 86400000)
}

function mensajeAusencia(nombre) {
  return `Hola ${nombre}, te saludamos de MAK FITNESS. Hace unos días no te vemos por el gimnasio y queremos saber cómo estás. ¿Todo bien? ¿Hay algo en lo que podamos ayudarte para que retomes tu rutina? Estamos para apoyarte. 💪`
}

export default function SeguimientoPage() {
  const [dias, setDias] = useState(5)
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [ocultarContactados, setOcultarContactados] = useState(true)
  const [seleccionado, setSeleccionado] = useState(null)

  const cargar = useCallback(async (d) => {
    setCargando(true)
    setError('')
    const { data, error: fallo } = await supabase.rpc('mak_socios_ausentes', { p_dias: d })
    if (fallo) {
      setError(fallo.message)
      setLista([])
    } else {
      setLista(data || [])
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar(dias)
  }, [dias, cargar])

  function atendido(s) {
    if (s.proximo_contacto && s.proximo_contacto > hoyGuayaquil()) return true
    const d = diasDesde(s.ultimo_contacto_at)
    return d !== null && d <= 3
  }

  const visibles = ocultarContactados ? lista.filter((s) => !atendido(s)) : lista
  const ocultos = lista.length - visibles.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Seguimiento de socios</h1>
        <p className="mt-2 text-sm text-gray-500">
          Socios con membresía vigente que llevan varios días sin entrenar. Contáctalos, conoce el motivo y deja registro.
        </p>
      </div>

      {mensaje && (
        <div role="status" className="rounded-xl border border-[#02AFBB]/30 bg-[#02AFBB]/10 p-4 text-sm font-semibold text-[#07838C]">
          {mensaje}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-gray-700">
          Sin entrenar hace más de
          <select
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
            className="ml-2 rounded-xl border border-gray-300 px-3 py-2 text-sm"
          >
            {[3, 5, 7, 10, 15, 30].map((d) => (
              <option key={d} value={d}>
                {d} días
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={ocultarContactados} onChange={(e) => setOcultarContactados(e.target.checked)} />
          Ocultar ya contactados (últimos 3 días o con próximo contacto)
        </label>
        <button type="button" onClick={() => cargar(dias)} disabled={cargando} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      <p className="text-sm text-gray-600">
        <strong>{visibles.length}</strong> socio{visibles.length === 1 ? '' : 's'} por contactar
        {ocultos > 0 ? ` · ${ocultos} ya atendido${ocultos === 1 ? '' : 's'}` : ''}
      </p>

      {cargando ? (
        <p className="text-gray-500">Cargando...</p>
      ) : visibles.length === 0 ? (
        <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-600">No hay socios pendientes de seguimiento. ¡Buen trabajo!</p>
      ) : (
        <div className="space-y-3">
          {visibles.map((s) => {
            const wa = enlaceWhatsApp(s.telefono, mensajeAusencia(s.nombre))
            return (
              <div key={s.miembro_id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {s.nombre} {s.apellido}
                    </p>
                    <p className="text-sm text-gray-600">
                      {s.plan || 'Plan'} · vence {fechaCorta(s.fecha_fin)}
                      {s.vence_en_dias <= 7 ? ` (en ${s.vence_en_dias} día${s.vence_en_dias === 1 ? '' : 's'})` : ''}
                    </p>
                    <p className="text-sm text-gray-500">
                      Última asistencia: {s.ultima_asistencia ? fechaCorta(s.ultima_asistencia) : 'no ha asistido desde que inició'}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${s.dias_sin_entrenar >= 15 ? 'bg-red-100 text-red-700' : s.dias_sin_entrenar >= 8 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                    {s.dias_sin_entrenar} días sin entrenar
                  </span>
                </div>

                {s.ultimo_contacto_at && (
                  <p className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                    Último contacto hace {diasDesde(s.ultimo_contacto_at)} día(s): {etiquetaResultado(s.ultimo_resultado)}
                    {s.ultimo_motivo ? ` · ${s.ultimo_motivo}` : ''}
                    {s.proximo_contacto ? ` · volver a contactar el ${fechaCorta(s.proximo_contacto)}` : ''}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {wa ? (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                      <MessageCircle size={16} />
                      WhatsApp
                    </a>
                  ) : (
                    <span className="rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-500">Sin WhatsApp válido</span>
                  )}
                  <button type="button" onClick={() => setSeleccionado(s)} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800">
                    <ClipboardPen size={16} />
                    Registrar seguimiento
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {seleccionado && (
        <ModalSeguimiento
          socio={seleccionado}
          onCerrar={() => setSeleccionado(null)}
          onGuardado={async () => {
            setSeleccionado(null)
            setMensaje('Seguimiento registrado.')
            await cargar(dias)
          }}
        />
      )}
    </div>
  )
}

function ModalSeguimiento({ socio, onCerrar, onGuardado }) {
  const [canal, setCanal] = useState('whatsapp')
  const [resultado, setResultado] = useState('contactado')
  const [motivo, setMotivo] = useState('')
  const [nota, setNota] = useState('')
  const [proximo, setProximo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [historial, setHistorial] = useState([])

  useEffect(() => {
    let vivo = true
    supabase.rpc('mak_historial_seguimiento', { p_miembro_id: socio.miembro_id }).then(({ data }) => {
      if (vivo) setHistorial(data || [])
    })
    return () => {
      vivo = false
    }
  }, [socio.miembro_id])

  const motivoRequerido = resultado !== 'no_contesta'
  const invalido = motivoRequerido && motivo.trim().length < 3

  async function guardar() {
    if (guardando || invalido) return
    setGuardando(true)
    setError('')
    const { error: fallo } = await supabase.rpc('mak_registrar_seguimiento', {
      p_miembro_id: socio.miembro_id,
      p_resultado: resultado,
      p_canal: canal,
      p_motivo: motivo.trim() || null,
      p_nota: nota.trim() || null,
      p_proximo_contacto: proximo || null,
    })
    setGuardando(false)
    if (fallo) {
      setError(fallo.message)
      return
    }
    await onGuardado()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Registrar seguimiento</h2>
            <p className="text-sm text-gray-600">
              {socio.nombre} {socio.apellido} · {socio.dias_sin_entrenar} días sin entrenar
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
            <X size={22} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold text-gray-700">
            Canal
            <select value={canal} onChange={(e) => setCanal(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm">
              {CANALES.map((c) => (
                <option key={c.v} value={c.v}>
                  {c.t}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Resultado
            <select value={resultado} onChange={(e) => setResultado(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm">
              {RESULTADOS.map((r) => (
                <option key={r.v} value={r.v}>
                  {r.t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-700">
            Motivo de la ausencia {motivoRequerido ? '' : '(opcional)'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MOTIVOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMotivo(m)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${motivo === m ? 'border-[#02AFBB] bg-[#02AFBB]/10 text-[#07838C]' : 'border-gray-300 text-gray-700'}`}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="O escribe el motivo"
            className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <label className="mt-4 block text-sm font-semibold text-gray-700">
          Nota (qué dijo, cómo ayudarle)
          <textarea rows={3} value={nota} onChange={(e) => setNota(e.target.value)} className="mt-1 w-full resize-none rounded-xl border border-gray-300 p-3 text-sm" />
        </label>

        <label className="mt-4 block text-sm font-semibold text-gray-700">
          Volver a contactar el (opcional)
          <input type="date" value={proximo} min={hoyGuayaquil()} onChange={(e) => setProximo(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
        </label>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCerrar} disabled={guardando} className="rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 disabled:opacity-40">
            Cancelar
          </button>
          <button type="button" onClick={guardar} disabled={guardando || invalido} className="rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white disabled:opacity-40">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

        {historial.length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-bold text-gray-900">Contactos anteriores</h3>
            <div className="mt-2 space-y-2">
              {historial.map((h) => (
                <div key={h.id} className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                  <p className="font-semibold">
                    {new Date(h.creado_at).toLocaleDateString('es-EC', { timeZone: ZONA })} · {etiquetaResultado(h.resultado)} · {h.creado_por_nombre || 'sin dato'}
                  </p>
                  {h.motivo && <p>Motivo: {h.motivo}</p>}
                  {h.nota && <p>{h.nota}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
