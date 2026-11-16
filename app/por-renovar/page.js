'use client'

// MAK_POR_RENOVAR_V1

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, MessageCircle, ClipboardPen, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { enlaceWhatsApp } from '@/lib/telefono'
import Paginacion, { paginar } from '@/components/Paginacion'

const supabase = createClient()
const ZONA = 'America/Guayaquil'
const DIAS_OCULTO_RESPUESTA = 3

const RESULTADOS = [
  { v: 'renovara', t: 'Dijo que renovará' },
  { v: 'pensando', t: 'Lo está pensando' },
  { v: 'no_renovara', t: 'No renovará' },
  { v: 'no_contesta', t: 'No contestó' },
]
const CANALES = [
  { v: 'whatsapp', t: 'WhatsApp' },
  { v: 'llamada', t: 'Llamada' },
  { v: 'presencial', t: 'Presencial' },
  { v: 'otro', t: 'Otro' },
]
const MOTIVOS = ['Precio', 'Falta de tiempo', 'Horario', 'Viaje', 'Salud o lesión', 'Se cambió de gimnasio', 'Desmotivación']

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

function primerNombre(nombre) {
  const n = String(nombre || '').trim().split(/\s+/)[0] || ''
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : ''
}

// Mensaje según la etapa: por vencer, vence hoy, vencida. Tono cercano, estructurado, sin emojis.
function mensajeRenovacion(s) {
  const n = primerNombre(s.nombre)
  const plan = s.plan || 'tu plan'
  const d = Number(s.dias_restantes)

  let apertura
  if (s.etapa === 'por_vencer') {
    const cuando = d === 1 ? 'mañana' : `en ${d} días`
    apertura = `Hola ${n}, desde *MAK FITNESS* queremos felicitarte por tu constancia. Tu membresía (${plan}) vence ${cuando}, el ${fechaCorta(s.fecha_fin)}, y queremos que sigas avanzando sin pausas.`
  } else if (s.etapa === 'vence_hoy') {
    apertura = `Hola ${n}, desde *MAK FITNESS* te recordamos que hoy vence tu membresía (${plan}). Renovando hoy mismo mantienes tu ritmo y todo lo que has logrado.`
  } else {
    const hace = Math.abs(d) === 1 ? '1 día' : `${Math.abs(d)} días`
    apertura = `Hola ${n}, desde *MAK FITNESS* te extrañamos. Tu membresía (${plan}) venció hace ${hace}, pero retomar ahora es mucho más fácil que empezar de cero. Tu progreso te está esperando.`
  }

  return [
    apertura,
    '',
    '*Para que renovar sea más cómodo:*',
    '- Aceptamos pagos con *tarjeta de crédito y débito*.',
    '- Tenemos *planes preferenciales sin contratos* de *3, 6, 9 y 12 meses* para que planifiques tu entrenamiento y ahorres.',
    '',
    'Pasa por recepción y te asesoramos con el plan que mejor se ajuste a tus metas y a tu tiempo.',
    '',
    'Cuéntanos si tienes alguna duda, ¡aquí estamos para ayudarte! Tu mejor versión se construye día a día.',
  ].join('\n')
}

const ETAPA = {
  por_vencer: { t: 'Por vencer', c: 'bg-amber-100 text-amber-800' },
  vence_hoy: { t: 'Vence hoy', c: 'bg-orange-100 text-orange-800' },
  vencida: { t: 'Vencida', c: 'bg-red-100 text-red-700' },
}

export default function PorRenovarPage() {
  const [antes, setAntes] = useState(3)
  const [despues, setDespues] = useState(7)
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [ocultar, setOcultar] = useState(true)
  const [seleccionado, setSeleccionado] = useState(null)
  const [enviando, setEnviando] = useState({})
  const [pagina, setPagina] = useState(1)

  const cargar = useCallback(async (a, d) => {
    setCargando(true)
    setError('')
    const { data, error: fallo } = await supabase.rpc('mak_socios_por_renovar', { p_antes: a, p_despues: d })
    if (fallo) {
      setError(fallo.message)
      setLista([])
    } else {
      setLista(data || [])
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar(antes, despues)
  }, [antes, despues, cargar])

  // Ya atendido: mensaje enviado en esta etapa, próximo contacto futuro, o respuesta reciente
  function atendido(s) {
    if (s.mensaje_enviado_etapa) return true
    if (s.proximo_contacto && s.proximo_contacto > hoyGuayaquil()) return true
    const d = diasDesde(s.ultimo_contacto_at)
    return d !== null && d <= DIAS_OCULTO_RESPUESTA && s.ultimo_resultado !== 'no_contesta'
  }

  async function enviarWhatsApp(s) {
    if (enviando[s.membresia_id]) return
    const url = enlaceWhatsApp(s.telefono, mensajeRenovacion(s))
    if (!url) return

    setEnviando((e) => ({ ...e, [s.membresia_id]: true }))
    setError('')
    setMensaje('')

    const ventana = window.open('', '_blank')

    const { error: fallo } = await supabase.rpc('mak_registrar_recordatorio', {
      p_membresia_id: s.membresia_id,
      p_resultado: 'mensaje_enviado',
      p_canal: 'whatsapp',
    })

    if (fallo) {
      if (ventana) ventana.close()
      setError(/YA_ENVIADO/.test(fallo.message) ? `A ${s.nombre} ya se le envió este recordatorio. No se envió otro.` : fallo.message)
    } else {
      if (ventana) ventana.location.href = url
      else window.location.href = url
      setMensaje(`Recordatorio a ${s.nombre} ${s.apellido} registrado. Ya no aparece en la lista.`)
    }

    await cargar(antes, despues)
    setEnviando((e) => ({ ...e, [s.membresia_id]: false }))
  }

  const visibles = ocultar ? lista.filter((s) => !atendido(s)) : lista
  const pag = paginar(visibles, pagina)
  const ocultos = lista.length - visibles.length
  const cuenta = (et) => visibles.filter((s) => s.etapa === et).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Por renovar</h1>
        <p className="mt-2 text-sm text-gray-500">
          Socios cuya membresía está por vencer o venció hace poco y aún no renuevan. Escríbeles a tiempo y deja registro de su respuesta.
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

      <div className="grid grid-cols-3 gap-3">
        {['por_vencer', 'vence_hoy', 'vencida'].map((et) => (
          <div key={et} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">{ETAPA[et].t}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{cuenta(et)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-gray-700">
          Vencen en los próximos
          <select value={antes} onChange={(e) => { setAntes(Number(e.target.value)); setPagina(1) }} className="ml-2 rounded-xl border border-gray-300 px-3 py-2 text-sm">
            {[1, 2, 3, 5, 7, 10].map((d) => (
              <option key={d} value={d}>
                {d} días
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Vencidos hace hasta
          <select value={despues} onChange={(e) => { setDespues(Number(e.target.value)); setPagina(1) }} className="ml-2 rounded-xl border border-gray-300 px-3 py-2 text-sm">
            {[3, 7, 15, 30].map((d) => (
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
        <button type="button" onClick={() => cargar(antes, despues)} disabled={cargando} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      <p className="text-sm text-gray-600">
        <strong>{visibles.length}</strong> socio{visibles.length === 1 ? '' : 's'} por contactar
        {ocultos > 0 && ocultar ? ` · ${ocultos} ya contactado${ocultos === 1 ? '' : 's'} (ocultos)` : ''}
      </p>

      {cargando ? (
        <p className="text-gray-500">Cargando...</p>
      ) : visibles.length === 0 ? (
        <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-600">No hay socios pendientes de recordatorio.</p>
      ) : (
        <div className="space-y-3">
          {pag.items.map((s) => {
            const tieneWa = Boolean(enlaceWhatsApp(s.telefono, 'x'))
            const et = ETAPA[s.etapa]
            return (
              <div key={s.membresia_id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {s.nombre} {s.apellido}
                    </p>
                    <p className="text-sm text-gray-600">
                      {s.plan || 'Plan'} · {s.etapa === 'vencida' ? 'venció' : 'vence'} {fechaCorta(s.fecha_fin)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Última asistencia: {s.ultima_asistencia ? fechaCorta(s.ultima_asistencia) : 'sin registro'}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${et.c}`}>
                    {et.t}
                    {s.etapa === 'por_vencer' ? ` · ${s.dias_restantes} día${s.dias_restantes === 1 ? '' : 's'}` : ''}
                    {s.etapa === 'vencida' ? ` · hace ${Math.abs(s.dias_restantes)} día${Math.abs(s.dias_restantes) === 1 ? '' : 's'}` : ''}
                  </span>
                </div>

                {s.ultimo_contacto_at && (
                  <p className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                    Último contacto hace {diasDesde(s.ultimo_contacto_at)} día(s){s.ultimo_contacto_por ? ` por ${s.ultimo_contacto_por}` : ''}: {etiquetaResultado(s.ultimo_resultado)}
                    {s.ultimo_motivo ? ` · ${s.ultimo_motivo}` : ''}
                  </p>
                )}

                <details className="mt-3 text-sm text-gray-600">
                  <summary className="cursor-pointer font-semibold text-[#07838C]">Ver el mensaje que se enviará</summary>
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-gray-50 p-3">{mensajeRenovacion(s)}</p>
                </details>

                <div className="mt-3 flex flex-wrap gap-2">
                  {tieneWa ? (
                    <button
                      type="button"
                      onClick={() => enviarWhatsApp(s)}
                      disabled={Boolean(enviando[s.membresia_id]) || s.mensaje_enviado_etapa}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <MessageCircle size={16} />
                      {s.mensaje_enviado_etapa ? 'Mensaje ya enviado' : enviando[s.membresia_id] ? 'Abriendo...' : 'Enviar WhatsApp'}
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

      <p className="text-xs text-gray-500">Para renovar, usa el módulo Membresías: apenas se registre el pago, el socio sale de esta lista.</p>

      {seleccionado && (
        <ModalRespuesta
          socio={seleccionado}
          onCerrar={() => setSeleccionado(null)}
          onGuardado={async () => {
            setSeleccionado(null)
            setMensaje('Respuesta registrada.')
            await cargar(antes, despues)
          }}
        />
      )}
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

  const motivoRequerido = resultado === 'no_renovara'
  const invalido = motivoRequerido && motivo.trim().length < 3

  async function guardar() {
    if (guardando || invalido) return
    setGuardando(true)
    setError('')
    const { error: fallo } = await supabase.rpc('mak_registrar_recordatorio', {
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
              {socio.nombre} {socio.apellido} · {socio.etapa === 'vencida' ? 'venció' : 'vence'} {fechaCorta(socio.fecha_fin)}
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
