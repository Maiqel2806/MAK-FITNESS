'use client'

// MAK_RETENCION_V1

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, MessageCircle, ClipboardPen, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { enlaceWhatsApp } from '@/lib/telefono'
import Paginacion, { paginar } from '@/components/Paginacion'

const supabase = createClient()
const ZONA = 'America/Guayaquil'

const RESULTADOS = [
  { v: 'volvera', t: 'Dijo que volverá' },
  { v: 'pensando', t: 'Lo está pensando' },
  { v: 'no_interesado', t: 'No volverá' },
  { v: 'no_contesta', t: 'No contestó' },
]
const CANALES = [
  { v: 'whatsapp', t: 'WhatsApp' },
  { v: 'llamada', t: 'Llamada' },
  { v: 'presencial', t: 'Presencial' },
  { v: 'otro', t: 'Otro' },
]
const MOTIVOS = ['Precio', 'Falta de tiempo', 'Horario', 'Viaje', 'Salud o lesión', 'Se cambió de gimnasio', 'Desmotivación']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function etiquetaResultado(v) {
  if (v === 'mensaje_enviado') return 'Mensaje enviado'
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

function etiquetaMes(ym) {
  const [y, m] = String(ym).split('-')
  return `${MESES[Number(m) - 1]} ${y.slice(2)}`
}

function primerNombre(nombre) {
  const n = String(nombre || '').trim().split(/\s+/)[0] || ''
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : ''
}

function duracionSocio(dias) {
  const d = Number(dias) || 0
  if (d < 45) return `${d} días`
  const m = Math.round(d / 30)
  return `${m} meses`
}

// Mensaje de recuperación: tono cercano, sin presión, sin emojis.
function mensajeRecuperacion(s) {
  const n = primerNombre(s.nombre)
  const cuanto = s.dias_sin_renovar >= 45 ? `hace ${Math.round(s.dias_sin_renovar / 30)} meses` : `hace ${s.dias_sin_renovar} días`
  return [
    `Hola ${n}, desde *MAK FITNESS* te escribimos porque te extrañamos. Tu última membresía terminó ${cuanto} y queremos ayudarte a retomar tu entrenamiento.`,
    '',
    'Volver es más fácil de lo que parece: tu cuerpo recuerda lo que ya lograste y nuestro equipo te acompaña en el regreso.',
    '',
    '*Pensando en ti:*',
    '- Aceptamos pagos con *tarjeta de crédito y débito*.',
    '- Tenemos *planes preferenciales sin contratos* de *3, 6, 9 y 12 meses* para que planifiques tu entrenamiento y ahorres.',
    '',
    'Pasa por recepción cuando quieras y te asesoramos con el plan que mejor se ajuste a tu tiempo y tus metas. Si hubo algo que no te gustó o que podamos mejorar, cuéntanos con confianza.',
    '',
    'Te esperamos, tu mejor versión sigue aquí.',
  ].join('\n')
}

export default function RetencionPage() {
  const [meses, setMeses] = useState(6)
  const [reporte, setReporte] = useState(null)
  const [minDias, setMinDias] = useState(15)
  const [maxDias, setMaxDias] = useState(90)
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [ocultar, setOcultar] = useState(true)
  const [seleccionado, setSeleccionado] = useState(null)
  const [enviando, setEnviando] = useState({})
  const [pagina, setPagina] = useState(1)

  const cargar = useCallback(async (m, mi, ma) => {
    setCargando(true)
    setError('')
    const [r1, r2] = await Promise.all([
      supabase.rpc('mak_reporte_retencion', { p_meses: m }),
      supabase.rpc('mak_socios_para_recuperar', { p_min: mi, p_max: ma }),
    ])
    if (r1.error || r2.error) {
      setError((r1.error || r2.error).message)
      setReporte(null)
      setLista([])
    } else {
      setReporte(r1.data)
      setLista(r2.data || [])
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar(meses, minDias, maxDias)
  }, [meses, minDias, maxDias, cargar])

  function atendido(s) {
    if (s.mensaje_enviado) return true
    if (s.proximo_contacto && s.proximo_contacto > hoyGuayaquil()) return true
    const d = diasDesde(s.ultimo_contacto_at)
    return d !== null && d <= 7 && s.ultimo_resultado !== 'no_contesta'
  }

  async function enviarWhatsApp(s) {
    if (enviando[s.membresia_id]) return
    const url = enlaceWhatsApp(s.telefono, mensajeRecuperacion(s))
    if (!url) return

    setEnviando((e) => ({ ...e, [s.membresia_id]: true }))
    setError('')
    setMensaje('')

    const ventana = window.open('', '_blank')

    const { error: fallo } = await supabase.rpc('mak_registrar_recuperacion', {
      p_membresia_id: s.membresia_id,
      p_resultado: 'mensaje_enviado',
      p_canal: 'whatsapp',
    })

    if (fallo) {
      if (ventana) ventana.close()
      setError(/YA_ENVIADO/.test(fallo.message) ? `A ${s.nombre} ya se le envió este mensaje. No se envió otro.` : fallo.message)
    } else {
      if (ventana) ventana.location.href = url
      else window.location.href = url
      setMensaje(`Mensaje a ${s.nombre} ${s.apellido} registrado. Ya no aparece en la lista.`)
    }

    await cargar(meses, minDias, maxDias)
    setEnviando((e) => ({ ...e, [s.membresia_id]: false }))
  }

  const visibles = ocultar ? lista.filter((s) => !atendido(s)) : lista
  const pag = paginar(visibles, pagina)
  const ocultos = lista.length - visibles.length
  const total = reporte?.total
  const porMes = reporte?.por_mes || []
  const motivos = reporte?.motivos || []
  const maxMotivo = Math.max(1, ...motivos.map((m) => m.cantidad))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Retención y bajas</h1>
        <p className="mt-2 text-sm text-gray-500">
          Cuántos socios renuevan, cuántos se pierden y por qué. Se considera perdida una membresía cuando pasan 15 días de su vencimiento sin que el socio tenga otra que la continúe.
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
          Periodo
          <select value={meses} onChange={(e) => setMeses(Number(e.target.value))} className="ml-2 rounded-xl border border-gray-300 px-3 py-2 text-sm">
            {[3, 6, 12, 24].map((m) => (
              <option key={m} value={m}>
                Últimos {m} meses
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => cargar(meses, minDias, maxDias)} disabled={cargando} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      {cargando && !reporte ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        reporte && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Tarjeta titulo="Tasa de renovación" valor={total?.tasa === null || total?.tasa === undefined ? '—' : `${total.tasa}%`} destacado />
              <Tarjeta titulo="Vencieron" valor={total?.vencieron ?? 0} />
              <Tarjeta titulo="Renovaron" valor={total?.renovaron ?? 0} />
              <Tarjeta titulo="Se perdieron" valor={total?.perdidos ?? 0} />
              <Tarjeta titulo="Recuperados" valor={reporte.recuperados ?? 0} nota="volvieron tras un mensaje" />
            </div>
            <p className="text-xs text-gray-500">
              {reporte.en_plazo} socio{reporte.en_plazo === 1 ? '' : 's'} venció en los últimos 15 días y aún está a tiempo de renovar (no cuenta como pérdida todavía; gestiónalo en Por renovar).
            </p>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Renovación por mes</h2>
              <p className="text-xs text-gray-500">Según el mes en que venció la membresía.</p>
              <div className="mt-4 space-y-3">
                {porMes.map((m) => (
                  <div key={m.mes} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-sm">
                    <span className="font-semibold text-gray-700">{etiquetaMes(m.mes)}</span>
                    <div className="h-4 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-[#02AFBB]" style={{ width: `${m.tasa ?? 0}%` }} />
                    </div>
                    <span className="min-w-[10rem] text-right text-gray-600">
                      {m.tasa === null ? 'sin vencimientos' : `${m.tasa}% · ${m.renovaron} de ${m.vencieron}`}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Por qué no renuevan</h2>
              <p className="text-xs text-gray-500">Motivos que registra el personal en Por renovar y en esta pantalla.</p>
              {motivos.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">Aún no hay motivos registrados. Aparecerán cuando se use &quot;Registrar respuesta&quot; con &quot;No renovará&quot; o &quot;No volverá&quot;.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {motivos.map((m) => (
                    <div key={m.motivo} className="grid grid-cols-[10rem_1fr_2rem] items-center gap-3 text-sm">
                      <span className="truncate font-semibold text-gray-700">{m.motivo}</span>
                      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${(m.cantidad / maxMotivo) * 100}%` }} />
                      </div>
                      <span className="text-right font-bold text-gray-700">{m.cantidad}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Socios para recuperar</h2>
          <p className="text-sm text-gray-500">Socios que no renovaron y pueden volver. Un solo mensaje por socio; al enviarlo sale de la lista.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">
            Sin renovar desde hace
            <select value={minDias} onChange={(e) => { setMinDias(Number(e.target.value)); setPagina(1) }} className="ml-2 rounded-xl border border-gray-300 px-3 py-2 text-sm">
              {[15, 30, 45].map((d) => (
                <option key={d} value={d}>
                  {d} días
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            hasta
            <select value={maxDias} onChange={(e) => { setMaxDias(Number(e.target.value)); setPagina(1) }} className="ml-2 rounded-xl border border-gray-300 px-3 py-2 text-sm">
              {[60, 90, 180, 365].map((d) => (
                <option key={d} value={d}>
                  {d} días
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={ocultar} onChange={(e) => { setOcultar(e.target.checked); setPagina(1) }} />
            Ocultar ya contactados
          </label>
        </div>

        <p className="text-sm text-gray-600">
          <strong>{visibles.length}</strong> socio{visibles.length === 1 ? '' : 's'} por contactar
          {ocultos > 0 && ocultar ? ` · ${ocultos} ya contactado${ocultos === 1 ? '' : 's'} (ocultos)` : ''}
        </p>

        {cargando ? (
          <p className="text-gray-500">Cargando...</p>
        ) : visibles.length === 0 ? (
          <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-600">No hay socios pendientes de recuperar.</p>
        ) : (
          <div className="space-y-3">
            {pag.items.map((s) => {
              const tieneWa = Boolean(enlaceWhatsApp(s.telefono, 'x'))
              return (
                <div key={s.membresia_id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        {s.nombre} {s.apellido}
                      </p>
                      <p className="text-sm text-gray-600">
                        {s.plan || 'Plan'} · venció {fechaCorta(s.fecha_fin)} · {s.membresias_total} membresía{s.membresias_total === 1 ? '' : 's'} · socio por {duracionSocio(s.dias_como_socio)}
                      </p>
                      <p className="text-sm text-gray-500">Última asistencia: {s.ultima_asistencia ? fechaCorta(s.ultima_asistencia) : 'sin registro'}</p>
                      {s.motivo_previo && <p className="text-sm text-amber-700">Motivo indicado antes: {s.motivo_previo}</p>}
                    </div>
                    <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">Hace {s.dias_sin_renovar} días</span>
                  </div>

                  {s.ultimo_contacto_at && (
                    <p className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                      Último contacto hace {diasDesde(s.ultimo_contacto_at)} día(s){s.ultimo_contacto_por ? ` por ${s.ultimo_contacto_por}` : ''}: {etiquetaResultado(s.ultimo_resultado)}
                      {s.ultimo_motivo ? ` · ${s.ultimo_motivo}` : ''}
                    </p>
                  )}

                  <details className="mt-3 text-sm text-gray-600">
                    <summary className="cursor-pointer font-semibold text-[#07838C]">Ver el mensaje que se enviará</summary>
                    <p className="mt-2 whitespace-pre-line rounded-lg bg-gray-50 p-3">{mensajeRecuperacion(s)}</p>
                  </details>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {tieneWa ? (
                      <button
                        type="button"
                        onClick={() => enviarWhatsApp(s)}
                        disabled={Boolean(enviando[s.membresia_id]) || s.mensaje_enviado}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        <MessageCircle size={16} />
                        {s.mensaje_enviado ? 'Mensaje ya enviado' : enviando[s.membresia_id] ? 'Abriendo...' : 'Enviar WhatsApp'}
                      </button>
                    ) : (
                      <span className="rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-500">Sin WhatsApp válido</span>
                    )}
                    <button type="button" onClick={() => setSeleccionado(s)} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800">
                      <ClipboardPen size={16} />
                      Registrar respuesta
                    </button>
                  </div>
                </div>
              )
            })}
            <Paginacion total={visibles.length} pagina={pag.actual} onCambiar={setPagina} />
          </div>
        )}
      </section>

      {seleccionado && (
        <ModalRespuesta
          socio={seleccionado}
          onCerrar={() => setSeleccionado(null)}
          onGuardado={async () => {
            setSeleccionado(null)
            setMensaje('Respuesta registrada.')
            await cargar(meses, minDias, maxDias)
          }}
        />
      )}
    </div>
  )
}

function Tarjeta({ titulo, valor, nota, destacado }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${destacado ? 'border-[#02AFBB]/40 bg-[#02AFBB]/10' : 'border-gray-200 bg-white'}`}>
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{valor}</p>
      {nota && <p className="mt-1 text-xs text-gray-500">{nota}</p>}
    </div>
  )
}

function ModalRespuesta({ socio, onCerrar, onGuardado }) {
  const [canal, setCanal] = useState('whatsapp')
  const [resultado, setResultado] = useState('pensando')
  const [motivo, setMotivo] = useState('')
  const [nota, setNota] = useState('')
  const [proximo, setProximo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const motivoRequerido = resultado === 'no_interesado'
  const invalido = motivoRequerido && motivo.trim().length < 3

  async function guardar() {
    if (guardando || invalido) return
    setGuardando(true)
    setError('')
    const { error: fallo } = await supabase.rpc('mak_registrar_recuperacion', {
      p_membresia_id: socio.membresia_id,
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
            <h2 className="text-xl font-bold text-gray-900">Respuesta del socio</h2>
            <p className="text-sm text-gray-600">
              {socio.nombre} {socio.apellido} · venció {fechaCorta(socio.fecha_fin)}
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
            Respuesta
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
          <p className="text-sm font-semibold text-gray-700">Motivo {motivoRequerido ? '(obligatorio)' : '(opcional)'}</p>
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
          <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="O escribe el motivo" className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <label className="mt-4 block text-sm font-semibold text-gray-700">
          Nota
          <textarea rows={2} value={nota} onChange={(e) => setNota(e.target.value)} className="mt-1 w-full resize-none rounded-xl border border-gray-300 p-3 text-sm" />
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
      </div>
    </div>
  )
}
