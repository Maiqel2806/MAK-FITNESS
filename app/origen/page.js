'use client'

// MAK_ORIGEN_PROMOS_V1

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, UserPlus, Repeat, Megaphone, Tag, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Paginacion, { paginar } from '@/components/Paginacion'

const supabase = createClient()
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const ORIGENES = [
  { v: 'redes_sociales', t: 'Redes sociales', color: '#EC4899' },
  { v: 'recomendacion', t: 'Recomendación', color: '#10B981' },
  { v: 'paso_local', t: 'Pasó por el local', color: '#F59E0B' },
  { v: 'publicidad', t: 'Volantes o publicidad', color: '#6366F1' },
  { v: 'google', t: 'Google o Maps', color: '#02AFBB' },
  { v: 'otro', t: 'Otro', color: '#64748B' },
  { v: 'no_indica', t: 'No quiso indicarlo', color: '#9CA3AF' },
]
const infoOrigen = (v) => ORIGENES.find((o) => o.v === v) || { v, t: v === 'sin_dato' ? 'Sin dato aún' : v, color: '#D1D5DB' }

const num = (v) => Number(v) || 0

function dinero(v) {
  return num(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function mesCorto(ym) {
  const [y, m] = String(ym).split('-')
  return `${MESES[Number(m) - 1]} ${y.slice(2)}`
}

export default function OrigenPage() {
  const [meses, setMeses] = useState(6)
  const [datos, setDatos] = useState(null)
  const [sinOrigen, setSinOrigen] = useState({ total: 0, lista: [] })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [pagina, setPagina] = useState(1)
  const [guardando, setGuardando] = useState({})

  const cargar = useCallback(async (m) => {
    setCargando(true)
    setError('')
    const [r1, r2] = await Promise.all([
      supabase.rpc('mak_reporte_origen', { p_meses: m }),
      supabase.rpc('mak_socios_sin_origen', { p_limite: 200 }),
    ])
    if (r1.error || r2.error) {
      setError((r1.error || r2.error).message)
      setDatos(null)
    } else {
      setDatos(r1.data)
      setSinOrigen(r2.data || { total: 0, lista: [] })
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar(meses)
  }, [meses, cargar])

  const porMes = useMemo(() => datos?.por_mes || [], [datos])
  const origen = useMemo(() => datos?.origen || [], [datos])
  const planes = useMemo(() => datos?.planes || [], [datos])

  const totalNuevos = porMes.reduce((s, m) => s + num(m.nuevos), 0)
  const totalRenov = porMes.reduce((s, m) => s + num(m.renovaciones), 0)
  const nuevosMes = porMes.length ? num(porMes[porMes.length - 1].nuevos) : 0
  const totalSocios = origen.reduce((s, o) => s + num(o.socios), 0)
  const estrella = origen.find((o) => o.origen !== 'sin_dato' && o.origen !== 'no_indica')
  const totalVentasPlanes = planes.reduce((s, p) => s + num(p.ventas), 0)
  const ventasPromo = planes.filter((p) => p.promocion).reduce((s, p) => s + num(p.ventas), 0)
  const maxVentasPlan = Math.max(1, ...planes.map((p) => num(p.ventas)))

  const pag = paginar(sinOrigen.lista || [], pagina)

  async function asignar(socio, valor) {
    const llave = socio.miembro_id
    if (guardando[llave]) return
    setGuardando((g) => ({ ...g, [llave]: true }))
    setError('')
    setMensaje('')
    const { error: fallo } = await supabase.rpc('mak_guardar_origen', { p_miembro_id: socio.miembro_id, p_origen: valor, p_detalle: null })
    if (fallo) {
      setError(fallo.message)
    } else {
      setMensaje(`Origen de ${socio.nombre} ${socio.apellido} guardado.`)
      await cargar(meses)
    }
    setGuardando((g) => ({ ...g, [llave]: false }))
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Origen y promociones</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            De dónde llegan los socios, cuáles se quedan y qué planes y promociones realmente se venden. Para invertir en lo que funciona.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select value={meses} onChange={(e) => setMeses(Number(e.target.value))} aria-label="Periodo" className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold">
            {[3, 6, 12, 24].map((m) => (
              <option key={m} value={m}>
                Últimos {m} meses
              </option>
            ))}
          </select>
          <button type="button" onClick={() => cargar(meses)} disabled={cargando} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">
            <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
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

      {cargando && !datos ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        datos && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tarjeta icono={UserPlus} color="text-[#07838C] bg-[#02AFBB]/15" titulo="Socios nuevos" valor={totalNuevos} nota={`${nuevosMes} en el mes en curso`} />
              <Tarjeta icono={Repeat} color="text-indigo-700 bg-indigo-100" titulo="Renovaciones" valor={totalRenov} nota="membresías de socios que ya habían comprado" />
              <Tarjeta icono={Megaphone} color="text-pink-700 bg-pink-100" titulo="Canal que más trae" valor={estrella ? infoOrigen(estrella.origen).t : '—'} nota={estrella ? `${estrella.socios} socio${estrella.socios === 1 ? '' : 's'} nuevos` : 'Aún sin datos de origen'} pequeno />
              <Tarjeta icono={Tag} color="text-amber-700 bg-amber-100" titulo="Ventas en promoción" valor={totalVentasPlanes ? `${Math.round((ventasPromo / totalVentasPlanes) * 100)}%` : '—'} nota={`${ventasPromo} de ${totalVentasPlanes} membresías`} />
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Crecimiento mes a mes</h2>
                  <p className="text-xs text-gray-500">Socios nuevos frente a renovaciones.</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-gray-600">
                  <Leyenda color="#02AFBB" texto="Nuevos" />
                  <Leyenda color="#6366F1" texto="Renovaciones" />
                </div>
              </div>
              <Grafico datos={porMes} />
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">De dónde llegan los socios nuevos</h2>
              <p className="text-xs text-gray-500">Y qué tan bien se quedan: cuántos ya volvieron a renovar y cuánto han pagado en promedio.</p>

              {origen.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">Aún no hay socios nuevos en el periodo.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {origen.map((o) => {
                    const inf = infoOrigen(o.origen)
                    const share = totalSocios ? Math.round((num(o.socios) / totalSocios) * 100) : 0
                    const renov = num(o.socios) ? Math.round((num(o.renovaron) / num(o.socios)) * 100) : 0
                    const prom = num(o.socios) ? num(o.ingresos) / num(o.socios) : 0
                    return (
                      <div key={o.origen}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                          <span className="flex items-center gap-2 font-semibold text-gray-800">
                            <span className="h-3 w-3 rounded-sm" style={{ background: inf.color }} />
                            {inf.t}
                          </span>
                          <span className="text-gray-600">
                            <strong className="text-gray-900">{o.socios}</strong> socio{o.socios === 1 ? '' : 's'} ({share}%) · {renov}% renovaron · {dinero(prom)} por socio
                          </span>
                        </div>
                        <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full" style={{ width: `${share}%`, background: inf.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <p className="mt-4 text-xs text-gray-500">
                Los socios que llegaron hace pocos días aún no cumplen su primer mes, por eso su porcentaje de renovación todavía es bajo.
              </p>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Planes y promociones</h2>
              <p className="text-xs text-gray-500">Membresías iniciadas en el periodo y lo que cobraste por ellas.</p>
              {planes.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">Aún no hay membresías en el periodo.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {planes.map((p) => (
                    <div key={p.plan}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2 font-semibold text-gray-800">
                          {p.plan}
                          {p.promocion && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">Promoción</span>}
                        </span>
                        <span className="text-gray-600">
                          <strong className="text-gray-900">{p.ventas}</strong> venta{p.ventas === 1 ? '' : 's'} · {dinero(p.ingresos)} cobrados
                          {num(p.ventas) ? ` · ${dinero(num(p.ingresos) / num(p.ventas))} por venta` : ''}
                        </span>
                      </div>
                      <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-gray-100">
                        <div className={`h-full rounded-full ${p.promocion ? 'bg-amber-400' : 'bg-gradient-to-r from-[#07838C] to-[#02AFBB]'}`} style={{ width: `${(num(p.ventas) / maxVentasPlan) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-4 text-xs text-gray-500">Una promoción funciona si se vende bien y los socios que trae renuevan después. Compara su cantidad de ventas con el plan normal.</p>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Completar el origen de socios actuales</h2>
              <p className="mt-1 text-sm text-gray-600">
                {sinOrigen.total > 0 ? (
                  <>
                    <strong>{sinOrigen.total}</strong> socio{sinOrigen.total === 1 ? '' : 's'} con membresía vigente no tiene{sinOrigen.total === 1 ? '' : 'n'} origen. Pregúntaselo en recepción y márcalo aquí; así el reporte se vuelve más preciso.
                  </>
                ) : (
                  'Todos los socios con membresía vigente tienen su origen registrado.'
                )}
              </p>

              {pag.items.length > 0 && (
                <div className="mt-4 space-y-3">
                  {pag.items.map((s) => (
                    <div key={s.miembro_id} className="rounded-xl border border-gray-200 p-3">
                      <p className="font-semibold text-gray-900">
                        {s.nombre} {s.apellido}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {ORIGENES.map((o) => (
                          <button
                            key={o.v}
                            type="button"
                            disabled={Boolean(guardando[s.miembro_id])}
                            onClick={() => asignar(s, o.v)}
                            className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-[#02AFBB] hover:bg-[#02AFBB]/10 disabled:opacity-40"
                          >
                            {o.t}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Paginacion total={(sinOrigen.lista || []).length} pagina={pag.actual} onCambiar={setPagina} />
                </div>
              )}

              <p className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                <Info size={16} className="mt-0.5 shrink-0" />
                Desde ahora, al registrar un socio nuevo en Miembros se pregunta cómo conoció el gimnasio.
              </p>
            </section>
          </>
        )
      )}
    </div>
  )
}

function Tarjeta({ icono: Icono, color, titulo, valor, nota, pequeno }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
        <Icono size={18} />
      </span>
      <p className="mt-3 text-sm text-gray-500">{titulo}</p>
      <p className={`mt-1 font-bold text-gray-900 ${pequeno ? 'text-lg leading-tight' : 'text-2xl'}`}>{valor}</p>
      {nota && <p className="mt-1 text-xs text-gray-500">{nota}</p>}
    </div>
  )
}

function Leyenda({ color, texto }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-sm" style={{ background: color }} />
      {texto}
    </span>
  )
}

function Grafico({ datos }) {
  const W = 680
  const H = 240
  const m = { t: 14, r: 10, b: 30, l: 34 }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const max = Math.max(1, ...datos.flatMap((d) => [num(d.nuevos), num(d.renovaciones)]))
  const y = (v) => m.t + ih - (v / max) * ih
  const paso = datos.length ? iw / datos.length : iw
  const ancho = Math.min(26, paso * 0.32)
  const cx = (i) => m.l + paso * i + paso / 2

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-auto w-full" role="img" aria-label="Gráfico de socios nuevos y renovaciones por mes">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={m.l} x2={W - m.r} y1={y(max * f)} y2={y(max * f)} stroke="#E5E7EB" strokeDasharray={f === 0 ? '0' : '3 4'} />
          <text x={m.l - 6} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill="#6B7280">
            {Math.round(max * f)}
          </text>
        </g>
      ))}
      {datos.map((d, i) => (
        <g key={d.mes}>
          <title>{`${mesCorto(d.mes)}\nNuevos: ${d.nuevos}\nRenovaciones: ${d.renovaciones}`}</title>
          <rect x={cx(i) - ancho - 2} y={y(num(d.nuevos))} width={ancho} height={Math.max(0, H - m.b - y(num(d.nuevos)))} rx="4" fill="#02AFBB" />
          <rect x={cx(i) + 2} y={y(num(d.renovaciones))} width={ancho} height={Math.max(0, H - m.b - y(num(d.renovaciones)))} rx="4" fill="#6366F1" />
          <text x={cx(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#4B5563">
            {mesCorto(d.mes)}
          </text>
        </g>
      ))}
    </svg>
  )
}
