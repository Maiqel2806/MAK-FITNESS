'use client'

// MAK_HORAS_PICO_V1

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Flame, CalendarDays, Users, Activity, Lightbulb } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const supabase = createClient()
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DIAS_LARGO = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos']
const TURNOS = [
  { nombre: 'Madrugada', rango: '05h00 a 07h00', desde: 5, hasta: 7 },
  { nombre: 'Mañana', rango: '07h00 a 13h00', desde: 7, hasta: 13 },
  { nombre: 'Tarde', rango: '13h00 a 19h00', desde: 13, hasta: 19 },
  { nombre: 'Noche', rango: '19h00 al cierre', desde: 19, hasta: 24 },
]

const num = (v) => Number(v) || 0
const hh = (h) => `${String(h).padStart(2, '0')}h00`
const dec = (v) => (Math.round(v * 10) / 10).toLocaleString('es-EC', { maximumFractionDigits: 1 })

export default function HorasPicoPage() {
  const [dias, setDias] = useState(30)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [modo, setModo] = useState('promedio')

  const cargar = useCallback(async (d) => {
    setCargando(true)
    setError('')
    const { data, error: fallo } = await supabase.rpc('mak_horas_pico', { p_dias: d })
    if (fallo) {
      setError(fallo.message)
      setDatos(null)
    } else {
      setDatos(data)
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar(dias)
  }, [dias, cargar])

  const calc = useMemo(() => {
    if (!datos) return null
    const mapa = datos.mapa || []
    const ocurr = (datos.ocurrencias_dow || [1, 1, 1, 1, 1, 1, 1]).map((o) => Math.max(1, num(o)))
    const diasAct = Math.max(1, num(datos.dias_con_entradas))

    const celda = {}
    let hMin = 5
    let hMax = 21
    mapa.forEach((m) => {
      celda[`${m.dow}-${m.hora}`] = num(m.n)
      hMin = Math.min(hMin, num(m.hora))
      hMax = Math.max(hMax, num(m.hora))
    })
    const horas = []
    for (let h = hMin; h <= hMax; h++) horas.push(h)

    const valor = (dow, h) => {
      const n = celda[`${dow}-${h}`] || 0
      return modo === 'promedio' ? n / ocurr[dow - 1] : n
    }
    let maxCelda = 0
    for (let d = 1; d <= 7; d++) horas.forEach((h) => (maxCelda = Math.max(maxCelda, valor(d, h))))

    const porHora = horas.map((h) => {
      let n = 0
      for (let d = 1; d <= 7; d++) n += celda[`${d}-${h}`] || 0
      return { h, total: n, prom: n / diasAct }
    })
    const porDia = DIAS.map((_, i) => {
      let n = 0
      horas.forEach((h) => (n += celda[`${i + 1}-${h}`] || 0))
      return { i, total: n, prom: n / ocurr[i] }
    })
    const turnos = TURNOS.map((t) => {
      let n = 0
      mapa.forEach((m) => {
        if (num(m.hora) >= t.desde && num(m.hora) < t.hasta) n += num(m.n)
      })
      return { ...t, total: n, prom: n / diasAct }
    })

    const total = num(datos.total_entradas)
    const horaPico = porHora.reduce((a, b) => (b.total > a.total ? b : a), porHora[0])
    const diaFuerte = porDia.reduce((a, b) => (b.prom > a.prom ? b : a), porDia[0])
    const diaFlojo = porDia.reduce((a, b) => (b.prom < a.prom ? b : a), porDia[0])
    // Horas tranquilas: las de menor afluencia dentro del rango en que hay actividad
    const activas = porHora.filter((x) => x.h >= 6 && x.h <= 20)
    const tranquilas = [...activas].sort((a, b) => a.total - b.total).slice(0, 2).sort((a, b) => a.h - b.h)

    return { celda, horas, valor, maxCelda, porHora, porDia, turnos, total, horaPico, diaFuerte, diaFlojo, tranquilas, diasAct }
  }, [datos, modo])

  const sinDatos = datos && num(datos.total_entradas) === 0

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Horas pico</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Cuándo se llena el gimnasio y cuándo está tranquilo, según la hora de entrada de los socios. Sirve para repartir al personal y decidir promociones.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select value={dias} onChange={(e) => setDias(Number(e.target.value))} aria-label="Periodo" className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold">
            {[14, 30, 60, 90].map((d) => (
              <option key={d} value={d}>
                Últimos {d} días
              </option>
            ))}
          </select>
          <button type="button" onClick={() => cargar(dias)} disabled={cargando} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">
            <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {cargando && !datos ? (
        <p className="text-gray-500">Cargando...</p>
      ) : sinDatos ? (
        <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-600">Aún no hay entradas registradas en este periodo.</p>
      ) : (
        calc && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tarjeta icono={Flame} color="text-orange-700 bg-orange-100" titulo="Hora más llena" valor={`${hh(calc.horaPico.h)} – ${hh(calc.horaPico.h + 1)}`} nota={`${dec(calc.horaPico.prom)} entradas por día`} />
              <Tarjeta icono={CalendarDays} color="text-[#07838C] bg-[#02AFBB]/15" titulo="Día más fuerte" valor={DIAS_LARGO[calc.diaFuerte.i].replace(/^./, (c) => c.toUpperCase())} nota={`${dec(calc.diaFuerte.prom)} entradas en promedio`} />
              <Tarjeta icono={Activity} color="text-indigo-700 bg-indigo-100" titulo="Entradas por día" valor={dec(calc.total / calc.diasAct)} nota={`${calc.total} entradas en el periodo`} />
              <Tarjeta icono={Users} color="text-emerald-700 bg-emerald-100" titulo="Socios que entrenaron" valor={num(datos.socios_unicos)} nota="distintos en el periodo" />
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Mapa de afluencia</h2>
                  <p className="text-xs text-gray-500">Cuanto más oscuro, más entradas. Cada columna es la hora de entrada.</p>
                </div>
                <div className="inline-flex rounded-xl border border-gray-200 p-1 text-sm font-semibold">
                  {[
                    ['promedio', 'Promedio por día'],
                    ['total', 'Total'],
                  ].map(([v, t]) => (
                    <button key={v} type="button" onClick={() => setModo(v)} className={`rounded-lg px-3 py-1.5 ${modo === v ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <div className="min-w-[36rem]">
                  <div className="grid items-center gap-1" style={{ gridTemplateColumns: `3rem repeat(${calc.horas.length}, minmax(0, 1fr))` }}>
                    <span />
                    {calc.horas.map((h) => (
                      <span key={h} className="text-center text-[11px] font-semibold text-gray-500">
                        {h}
                      </span>
                    ))}
                    {DIAS.map((d, i) => (
                      <Fila key={d} etiqueta={d} horas={calc.horas} dow={i + 1} valor={calc.valor} max={calc.maxCelda} celda={calc.celda} modo={modo} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <span>Menos</span>
                {[0.1, 0.3, 0.5, 0.75, 1].map((a) => (
                  <span key={a} className="h-3 w-6 rounded" style={{ background: `rgba(2,175,187,${a})` }} />
                ))}
                <span>Más</span>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Entradas por hora</h2>
                <p className="text-xs text-gray-500">Promedio por día de atención.</p>
                <Barras items={calc.porHora.map((x) => ({ etiqueta: String(x.h), valor: x.prom, destacado: x.h === calc.horaPico.h }))} />
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Entradas por día de la semana</h2>
                <p className="text-xs text-gray-500">Promedio de cada día.</p>
                <Barras items={calc.porDia.map((x) => ({ etiqueta: DIAS[x.i], valor: x.prom, destacado: x.i === calc.diaFuerte.i }))} />
              </section>
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Por turno de personal</h2>
              <p className="text-xs text-gray-500">Entradas de socios durante el horario de cada turno.</p>
              <div className="mt-4 space-y-4">
                {calc.turnos.map((t) => {
                  const porcentaje = calc.total ? Math.round((t.total / calc.total) * 100) : 0
                  return (
                    <div key={t.nombre}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-semibold text-gray-800">
                          {t.nombre} <span className="font-normal text-gray-500">· {t.rango}</span>
                        </span>
                        <span className="font-bold text-gray-900">
                          {porcentaje}% <span className="font-normal text-gray-500">· {dec(t.prom)} por día</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#07838C] to-[#02AFBB]" style={{ width: `${porcentaje}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-[#02AFBB]/30 bg-[#02AFBB]/10 p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#07838C]">
                <Lightbulb size={20} />
                Qué puedes hacer con esto
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-gray-800">
                <li>
                  Refuerza la atención y la limpieza hacia las <strong>{hh(calc.horaPico.h)}</strong>, la hora más llena.
                </li>
                {calc.tranquilas.length > 0 && (
                  <li>
                    Las horas más tranquilas son <strong>{calc.tranquilas.map((x) => hh(x.h)).join(' y ')}</strong>: buen momento para una promoción, una clase o una oferta para quienes puedan entrenar a esa hora.
                  </li>
                )}
                <li>
                  El día más flojo es <strong>{DIAS_LARGO[calc.diaFlojo.i]}</strong> ({dec(calc.diaFlojo.prom)} entradas en promedio): ideal para una actividad que atraiga socios ese día.
                </li>
              </ul>
              <p className="mt-3 text-xs text-gray-600">Se mide la hora de entrada; el sistema no registra la salida, así que no muestra cuántas personas hay dentro a la vez.</p>
            </section>
          </>
        )
      )}
    </div>
  )
}

function Fila({ etiqueta, horas, dow, valor, max, celda, modo }) {
  return (
    <>
      <span className="text-xs font-semibold text-gray-600">{etiqueta}</span>
      {horas.map((h) => {
        const v = valor(dow, h)
        const total = celda[`${dow}-${h}`] || 0
        const a = max > 0 ? v / max : 0
        return (
          <div
            key={h}
            title={`${etiqueta} ${hh(h)}: ${total} entradas en total${modo === 'promedio' ? ` (${dec(v)} por día)` : ''}`}
            className="flex h-9 items-center justify-center rounded-md text-[11px] font-semibold"
            style={{ background: v > 0 ? `rgba(2,175,187,${Math.max(0.12, a)})` : '#F3F4F6', color: a > 0.55 ? '#fff' : '#374151' }}
          >
            {v > 0 ? (modo === 'promedio' ? dec(v) : total) : ''}
          </div>
        )
      })}
    </>
  )
}

function Barras({ items }) {
  const W = 360
  const H = 200
  const m = { t: 10, r: 6, b: 26, l: 30 }
  const max = Math.max(1, ...items.map((i) => i.valor))
  const paso = (W - m.l - m.r) / Math.max(1, items.length)
  const ancho = Math.min(28, paso * 0.7)
  const y = (v) => m.t + (H - m.t - m.b) * (1 - v / max)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-auto w-full" role="img" aria-label="Gráfico de barras">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={m.l} x2={W - m.r} y1={y(max * f)} y2={y(max * f)} stroke="#E5E7EB" strokeDasharray={f === 0 ? '0' : '3 4'} />
          <text x={m.l - 5} y={y(max * f) + 4} textAnchor="end" fontSize="10" fill="#6B7280">
            {dec(max * f)}
          </text>
        </g>
      ))}
      {items.map((it, i) => {
        const x = m.l + paso * i + (paso - ancho) / 2
        return (
          <g key={it.etiqueta}>
            <title>{`${it.etiqueta}: ${dec(it.valor)}`}</title>
            <rect x={x} y={y(it.valor)} width={ancho} height={Math.max(0, H - m.b - y(it.valor))} rx="4" fill={it.destacado ? '#F97316' : '#02AFBB'} />
            <text x={x + ancho / 2} y={H - 9} textAnchor="middle" fontSize="10" fill="#4B5563">
              {it.etiqueta}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function Tarjeta({ icono: Icono, color, titulo, valor, nota }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
        <Icono size={18} />
      </span>
      <p className="mt-3 text-sm text-gray-500">{titulo}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{valor}</p>
      {nota && <p className="mt-1 text-xs text-gray-500">{nota}</p>}
    </div>
  )
}
