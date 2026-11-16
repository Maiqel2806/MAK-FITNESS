'use client'

// MAK_FECHAS_CLAVE_V1

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, MessageCircle, Cake, Award, Trophy, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { enlaceWhatsApp } from '@/lib/telefono'
import Paginacion, { paginar } from '@/components/Paginacion'

const supabase = createClient()
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function fechaLarga(f) {
  if (!f) return ''
  const [, m, d] = String(f).slice(0, 10).split('-')
  return `${Number(d)} de ${MESES[Number(m) - 1]}`
}

function primerNombre(nombre) {
  const n = String(nombre || '').trim().split(/\s+/)[0] || ''
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : ''
}

function cuando(dias) {
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  if (dias > 1) return `En ${dias} días`
  if (dias === -1) return 'Ayer'
  return `Hace ${Math.abs(dias)} días`
}

const TABS = [
  { id: 'cumpleanos', titulo: 'Cumpleaños', icono: Cake },
  { id: 'aniversarios', titulo: 'Aniversarios', icono: Award },
  { id: 'hitos', titulo: 'Hitos', icono: Trophy },
]

// Mensajes cálidos, sin emojis y sin ofertas: son saludos, no ventas.
function mensajeCumple(s) {
  const n = primerNombre(s.nombre)
  const tarde = s.dias_para < 0 ? 'Con un poco de retraso, ' : ''
  const base = `${tarde}¡Feliz cumpleaños, ${n}! Todo el equipo de *MAK FITNESS* te desea un día lleno de alegría y un año con mucha salud, energía y metas cumplidas. Gracias por ser parte de esta familia.`
  if (s.membresia === 'vencida') return `${base}\n\nTe esperamos pronto de vuelta por el gimnasio, tu lugar sigue aquí.`
  return `${base}\n\n¡Que lo disfrutes muchísimo!`
}

function mensajeAniversario(s) {
  const n = primerNombre(s.nombre)
  const tiempo = s.anios === 1 ? '1 año' : `${s.anios} años`
  return `Hola ${n}, ¡felicidades! Hoy cumples ${tiempo} entrenando con nosotros en *MAK FITNESS*.\n\nGracias por tu constancia y por confiar en nosotros. Es un gusto acompañarte en cada meta y queremos seguir haciéndolo.\n\n¡Vamos por mucho más!`
}

function mensajeHito(s) {
  const n = primerNombre(s.nombre)
  return `Hola ${n}, ¡lo lograste! Acabas de completar tu entrenamiento número *${s.entrenamientos}* en *MAK FITNESS*.\n\nEsa constancia es lo que construye resultados y todo el equipo está orgulloso de ti. ¡Sigue así, vas por más!`
}

export default function FechasClavePage() {
  const [adelante, setAdelante] = useState(30)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [tab, setTab] = useState('cumpleanos')
  const [ocultar, setOcultar] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [enviando, setEnviando] = useState({})

  const cargar = useCallback(async (a) => {
    setCargando(true)
    setError('')
    const { data, error: fallo } = await supabase.rpc('mak_fechas_clave', { p_adelante: a })
    if (fallo) {
      setError(fallo.message)
      setDatos(null)
    } else {
      setDatos(data)
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar(adelante)
  }, [adelante, cargar])

  const listas = useMemo(
    () => ({
      cumpleanos: datos?.cumpleanos || [],
      aniversarios: datos?.aniversarios || [],
      hitos: datos?.hitos || [],
    }),
    [datos]
  )

  const pendientes = (tipo) => listas[tipo].filter((s) => !s.enviado).length
  const hoy = listas.cumpleanos.filter((s) => s.dias_para === 0 && !s.enviado).length

  const visibles = ocultar ? listas[tab].filter((s) => !s.enviado) : listas[tab]
  const pag = paginar(visibles, pagina)

  function claveDe(s) {
    if (tab === 'hitos') return s.entrenamientos
    return Number(String(s.fecha).slice(0, 4))
  }

  function textoDe(s) {
    if (tab === 'cumpleanos') return mensajeCumple(s)
    if (tab === 'aniversarios') return mensajeAniversario(s)
    return mensajeHito(s)
  }

  const tipoRpc = tab === 'cumpleanos' ? 'cumpleanos' : tab === 'aniversarios' ? 'aniversario' : 'hito'
  // Los saludos de cumpleaños y aniversario se envían desde el día de la fecha (no antes)
  const puedeEnviar = (s) => (tab === 'hitos' ? true : s.dias_para <= 0)

  async function enviar(s) {
    const llave = `${tab}-${s.miembro_id}-${claveDe(s)}`
    if (enviando[llave] || !puedeEnviar(s)) return
    const url = enlaceWhatsApp(s.telefono, textoDe(s))
    if (!url) return

    setEnviando((e) => ({ ...e, [llave]: true }))
    setError('')
    setMensaje('')

    const ventana = window.open('', '_blank')

    const { error: fallo } = await supabase.rpc('mak_registrar_felicitacion', {
      p_miembro_id: s.miembro_id,
      p_tipo: tipoRpc,
      p_clave: claveDe(s),
    })

    if (fallo) {
      if (ventana) ventana.close()
      setError(/YA_ENVIADO/.test(fallo.message) ? `A ${s.nombre} ya se le envió este saludo. No se envió otro.` : fallo.message)
    } else {
      if (ventana) ventana.location.href = url
      else window.location.href = url
      setMensaje(`Saludo a ${s.nombre} ${s.apellido} registrado.`)
    }

    await cargar(adelante)
    setEnviando((e) => ({ ...e, [llave]: false }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fechas clave</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Un saludo a tiempo hace que el socio se sienta parte de la familia. Cumpleaños, aniversarios como socio y logros de entrenamiento.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select value={adelante} onChange={(e) => { setAdelante(Number(e.target.value)); setPagina(1) }} aria-label="Ventana de días" className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold">
            {[7, 15, 30, 60].map((d) => (
              <option key={d} value={d}>
                Próximos {d} días
              </option>
            ))}
          </select>
          <button type="button" onClick={() => cargar(adelante)} disabled={cargando} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">
            <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {hoy > 0 && (
        <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-pink-500 to-amber-400 p-5 text-white shadow-md">
          <Cake size={36} />
          <div>
            <p className="text-lg font-extrabold">
              {hoy === 1 ? 'Hoy cumple años 1 socio' : `Hoy cumplen años ${hoy} socios`}
            </p>
            <p className="text-sm text-white/90">Envíales su saludo antes de que termine el día.</p>
          </div>
        </div>
      )}

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

      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => {
          const Icono = t.icono
          const activo = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activo}
              onClick={() => { setTab(t.id); setPagina(1) }}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${activo ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700'}`}
            >
              <Icono size={16} />
              {t.titulo}
              <span className={`rounded-full px-2 py-0.5 text-xs ${activo ? 'bg-white/20' : 'bg-gray-100 text-gray-600'}`}>{pendientes(t.id)}</span>
            </button>
          )
        })}
        <label className="ml-auto flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={ocultar} onChange={(e) => { setOcultar(e.target.checked); setPagina(1) }} />
          Ocultar ya saludados
        </label>
      </div>

      {tab === 'hitos' && <p className="text-sm text-gray-500">Socios que completaron su entrenamiento 25, 50, 100, 200, 300 o 500 en los últimos 7 días.</p>}
      {tab === 'aniversarios' && <p className="text-sm text-gray-500">Socios con membresía vigente que cumplen años completos desde su primera membresía.</p>}

      {cargando && !datos ? (
        <p className="text-gray-500">Cargando...</p>
      ) : visibles.length === 0 ? (
        <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-600">No hay saludos pendientes en esta sección.</p>
      ) : (
        <div className="space-y-3">
          {pag.items.map((s) => {
            const llave = `${tab}-${s.miembro_id}-${claveDe(s)}`
            const tieneWa = Boolean(enlaceWhatsApp(s.telefono, 'x'))
            const esHoy = tab !== 'hitos' && s.dias_para === 0
            const disponible = puedeEnviar(s)
            return (
              <div key={llave} className={`rounded-2xl border bg-white p-4 shadow-sm ${esHoy ? 'border-pink-300 ring-2 ring-pink-100' : 'border-gray-200'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-full ${tab === 'cumpleanos' ? 'bg-pink-100 text-pink-600' : tab === 'aniversarios' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                      {tab === 'cumpleanos' ? <Cake size={22} /> : tab === 'aniversarios' ? <Award size={22} /> : <Trophy size={22} />}
                    </span>
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        {s.nombre} {s.apellido}
                      </p>
                      {tab === 'cumpleanos' && (
                        <p className="text-sm text-gray-600">
                          Cumple {s.edad} años · {fechaLarga(s.fecha)}
                          {s.membresia === 'vigente' ? ' · membresía vigente' : s.membresia === 'vencida' ? ' · membresía vencida' : ''}
                        </p>
                      )}
                      {tab === 'aniversarios' && (
                        <p className="text-sm text-gray-600">
                          {s.anios} año{s.anios === 1 ? '' : 's'} como socio · {fechaLarga(s.fecha)}
                          {s.plan ? ` · ${s.plan}` : ''}
                        </p>
                      )}
                      {tab === 'hitos' && (
                        <p className="text-sm text-gray-600">
                          Entrenamiento número <strong>{s.entrenamientos}</strong> · {fechaLarga(s.fecha)}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${esHoy ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    {tab === 'hitos' ? cuando(-s.hace_dias) : cuando(s.dias_para)}
                  </span>
                </div>

                <details className="mt-3 text-sm text-gray-600">
                  <summary className="cursor-pointer font-semibold text-[#07838C]">Ver el mensaje que se enviará</summary>
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-gray-50 p-3">{textoDe(s)}</p>
                </details>

                <div className="mt-3">
                  {!tieneWa ? (
                    <span className="rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-500">Sin WhatsApp válido</span>
                  ) : s.enviado ? (
                    <span className="inline-flex rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">Saludo ya enviado</span>
                  ) : !disponible ? (
                    <span className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-600">
                      <Info size={16} />
                      Se podrá enviar el día de la fecha
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => enviar(s)}
                      disabled={Boolean(enviando[llave])}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <MessageCircle size={16} />
                      {enviando[llave] ? 'Abriendo...' : 'Enviar saludo por WhatsApp'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          <Paginacion total={visibles.length} pagina={pag.actual} onCambiar={setPagina} />
        </div>
      )}

      {datos && num(datos.sin_fecha_nacimiento) > 0 && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          <Info size={18} className="mt-0.5 shrink-0" />
          {datos.sin_fecha_nacimiento} socio{datos.sin_fecha_nacimiento === 1 ? '' : 's'} con membresía vigente no tiene{datos.sin_fecha_nacimiento === 1 ? '' : 'n'} fecha de nacimiento y no aparece{datos.sin_fecha_nacimiento === 1 ? '' : 'n'} en los cumpleaños. Pídesela en recepción y complétala en Miembros.
        </p>
      )}
    </div>
  )
}

function num(v) {
  return Number(v) || 0
}
