'use client'

// MAK_UTILIDAD_V1

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, Wallet, Receipt, Percent } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const supabase = createClient()
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const COLORES = ['#02AFBB', '#F59E0B', '#6366F1', '#EC4899', '#10B981', '#F97316', '#64748B']
const METODOS = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', otro: 'Otro' }

const num = (v) => Number(v) || 0

function dinero(v) {
  const n = num(v)
  const s = Math.abs(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  return n < 0 ? `-${s}` : s
}

function mesCorto(ym) {
  const [y, m] = String(ym).split('-')
  return `${MESES[Number(m) - 1]} ${y.slice(2)}`
}

function mesLargo(ym) {
  const [y, m] = String(ym).split('-')
  return `${MESES_LARGO[Number(m) - 1]} ${y}`
}

function fechaCorta(f) {
  if (!f) return '—'
  const [y, m, d] = String(f).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function pct(a, b) {
  if (!num(b)) return null
  return Math.round(((num(a) - num(b)) / Math.abs(num(b))) * 1000) / 10
}

export default function UtilidadPage() {
  const [meses, setMeses] = useState(6)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async (m) => {
    setCargando(true)
    setError('')
    const { data, error: fallo } = await supabase.rpc('mak_utilidad_mensual', { p_meses: m })
    if (fallo) {
      setError(fallo.message)
      setDatos(null)
    } else {
      setDatos(data)
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar(meses)
  }, [meses, cargar])

  const porMes = useMemo(() => datos?.por_mes || [], [datos])
  const actual = porMes[porMes.length - 1]
  const anterior = porMes.length > 1 ? porMes[porMes.length - 2] : null

  const totales = useMemo(() => {
    const t = { ingresos: 0, gastos: 0, utilidad: 0 }
    porMes.forEach((m) => {
      t.ingresos += num(m.ingresos)
      t.gastos += num(m.gastos)
      t.utilidad += num(m.utilidad)
    })
    return t
  }, [porMes])

  const margenActual = actual && num(actual.ingresos) > 0 ? Math.round((num(actual.utilidad) / num(actual.ingresos)) * 1000) / 10 : null
  const deltaUtilidad = actual && anterior ? pct(actual.utilidad, anterior.utilidad) : null
  const margenProd = num(datos?.productos_ventas) - num(datos?.productos_costo)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Utilidad mensual</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Lo que realmente le queda al gimnasio: ingresos por membresías y ventas, menos los gastos registrados.
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

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {cargando && !datos ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        datos &&
        actual && (
          <>
            <section className={`overflow-hidden rounded-3xl p-6 text-white shadow-lg ${num(actual.utilidad) >= 0 ? 'bg-gradient-to-br from-[#07838C] to-[#02AFBB]' : 'bg-gradient-to-br from-rose-700 to-rose-500'}`}>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/80">Utilidad de {mesLargo(actual.mes)} (mes en curso)</p>
              <p className="mt-2 text-5xl font-extrabold tracking-tight">{dinero(actual.utilidad)}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                {deltaUtilidad !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 font-semibold">
                    {deltaUtilidad >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {deltaUtilidad >= 0 ? '+' : ''}
                    {deltaUtilidad}% vs {mesLargo(anterior.mes)}
                  </span>
                )}
                {margenActual !== null && <span className="rounded-full bg-white/20 px-3 py-1 font-semibold">Margen {margenActual}%</span>}
                <span className="text-white/80">El mes aún no termina: las cifras son parciales.</span>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tarjeta icono={Wallet} color="text-[#07838C] bg-[#02AFBB]/15" titulo="Ingresos del mes" valor={dinero(actual.ingresos)} nota={`${dinero(actual.membresias)} membresías · ${dinero(actual.ventas)} ventas`} />
              <Tarjeta icono={Receipt} color="text-amber-700 bg-amber-100" titulo="Gastos del mes" valor={dinero(actual.gastos)} nota={anterior ? `Mes anterior: ${dinero(anterior.gastos)}` : ''} />
              <Tarjeta icono={Percent} color="text-indigo-700 bg-indigo-100" titulo={`Utilidad en ${meses} meses`} valor={dinero(totales.utilidad)} nota={`${dinero(totales.ingresos)} ingresos − ${dinero(totales.gastos)} gastos`} />
              <Tarjeta icono={TrendingUp} color="text-emerald-700 bg-emerald-100" titulo="Margen en productos" valor={dinero(margenProd)} nota={`Ventas ${dinero(datos.productos_ventas)} − costo ${dinero(datos.productos_costo)}`} />
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Ingresos, gastos y utilidad</h2>
                  <p className="text-xs text-gray-500">Mes a mes. La línea oscura es la utilidad.</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-gray-600">
                  <Leyenda color="#02AFBB" texto="Ingresos" />
                  <Leyenda color="#F59E0B" texto="Gastos" />
                  <Leyenda color="#111827" texto="Utilidad" />
                </div>
              </div>
              <Grafico datos={porMes} />
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">En qué se va el dinero</h2>
                <p className="text-xs text-gray-500">Gastos por categoría en el periodo.</p>
                <Dona items={(datos.categorias || []).map((c) => ({ etiqueta: c.categoria, valor: num(c.monto) }))} vacio="Sin gastos registrados en el periodo." />
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Cómo te pagan</h2>
                <p className="text-xs text-gray-500">Ingresos por método de cobro en el periodo.</p>
                <Dona items={(datos.metodos || []).map((m) => ({ etiqueta: METODOS[m.metodo] || m.metodo, valor: num(m.monto) }))} vacio="Sin ingresos en el periodo." />
              </section>
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Detalle por mes</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-3">Mes</th>
                      <th className="py-2 pr-3 text-right">Membresías</th>
                      <th className="py-2 pr-3 text-right">Ventas</th>
                      <th className="py-2 pr-3 text-right">Gastos</th>
                      <th className="py-2 text-right">Utilidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...porMes].reverse().map((m) => (
                      <tr key={m.mes} className="border-b border-gray-100">
                        <td className="py-2 pr-3 font-semibold text-gray-800">{mesLargo(m.mes)}</td>
                        <td className="py-2 pr-3 text-right text-gray-700">{dinero(m.membresias)}</td>
                        <td className="py-2 pr-3 text-right text-gray-700">{dinero(m.ventas)}</td>
                        <td className="py-2 pr-3 text-right text-gray-700">{dinero(m.gastos)}</td>
                        <td className={`py-2 text-right font-bold ${num(m.utilidad) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{dinero(m.utilidad)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Gastos más grandes</h2>
                <p className="text-xs text-gray-500">Los 5 mayores del periodo.</p>
                {(datos.gastos_mayores || []).length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">Sin gastos registrados.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-gray-100">
                    {datos.gastos_mayores.map((g, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-800">{g.concepto}</p>
                          <p className="text-xs text-gray-500">
                            {g.categoria || 'Sin categoría'} · {fechaCorta(g.fecha)}
                          </p>
                        </div>
                        <span className="font-bold text-amber-700">{dinero(g.monto)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Para tener en cuenta</h2>
                <ul className="mt-3 space-y-3 text-sm text-gray-700">
                  <li className="rounded-xl bg-gray-50 p-3">
                    <strong>{dinero(datos.por_cobrar)}</strong> en ventas pendientes de cobro. No se suman a los ingresos hasta que se paguen.
                  </li>
                  <li className="rounded-xl bg-gray-50 p-3">El margen de productos usa el costo actual de cada producto, por eso es referencial.</li>
                  <li className="rounded-xl bg-gray-50 p-3">La utilidad depende de que todos los gastos (arriendo, servicios, sueldos, compras) estén registrados en Caja.</li>
                </ul>
              </section>
            </div>
          </>
        )
      )}
    </div>
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

function Leyenda({ color, texto }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-sm" style={{ background: color }} />
      {texto}
    </span>
  )
}

// Barras agrupadas (ingresos / gastos) + línea de utilidad, en SVG responsive
function Grafico({ datos }) {
  const W = 680
  const H = 280
  const m = { t: 16, r: 12, b: 34, l: 56 }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b

  const valores = datos.flatMap((d) => [num(d.ingresos), num(d.gastos), num(d.utilidad)])
  const maxV = Math.max(1, ...valores)
  const minV = Math.min(0, ...valores)
  const rango = maxV - minV || 1
  const y = (v) => m.t + ih - ((v - minV) / rango) * ih
  const y0 = y(0)

  const paso = datos.length > 0 ? iw / datos.length : iw
  const ancho = Math.min(26, paso * 0.32)
  const cx = (i) => m.l + paso * i + paso / 2

  const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => minV + rango * f)
  const linea = datos.map((d, i) => `${i === 0 ? 'M' : 'L'}${cx(i)},${y(num(d.utilidad))}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-auto w-full" role="img" aria-label="Gráfico de ingresos, gastos y utilidad por mes">
      {marcas.map((v, i) => (
        <g key={i}>
          <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="#E5E7EB" strokeDasharray={i === 0 ? '0' : '3 4'} />
          <text x={m.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6B7280">
            {Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}k` : Math.round(v)}
          </text>
        </g>
      ))}
      <line x1={m.l} x2={W - m.r} y1={y0} y2={y0} stroke="#9CA3AF" />

      {datos.map((d, i) => {
        const hi = Math.abs(y(num(d.ingresos)) - y0)
        const hg = Math.abs(y(num(d.gastos)) - y0)
        return (
          <g key={d.mes}>
            <title>{`${mesLargo(d.mes)}\nIngresos: ${dinero(d.ingresos)}\nGastos: ${dinero(d.gastos)}\nUtilidad: ${dinero(d.utilidad)}`}</title>
            <rect x={cx(i) - ancho - 2} y={y0 - hi} width={ancho} height={hi} rx="4" fill="#02AFBB" />
            <rect x={cx(i) + 2} y={y0 - hg} width={ancho} height={hg} rx="4" fill="#F59E0B" />
            <text x={cx(i)} y={H - 12} textAnchor="middle" fontSize="11" fill="#4B5563">
              {mesCorto(d.mes)}
            </text>
          </g>
        )
      })}

      <path d={linea} fill="none" stroke="#111827" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {datos.map((d, i) => (
        <circle key={d.mes} cx={cx(i)} cy={y(num(d.utilidad))} r="4.5" fill="#fff" stroke="#111827" strokeWidth="2.5" />
      ))}
    </svg>
  )
}

// Dona con leyenda; muestra el total al centro
function Dona({ items, vacio }) {
  const lista = items.filter((i) => i.valor > 0)
  const total = lista.reduce((s, i) => s + i.valor, 0)
  if (total <= 0) return <p className="mt-4 text-sm text-gray-500">{vacio}</p>

  const R = 52
  const C = 2 * Math.PI * R
  let acumulado = 0

  return (
    <div className="mt-4 flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-40 w-40 shrink-0" role="img" aria-label="Gráfico de distribución">
        <g transform="rotate(-90 70 70)">
          <circle cx="70" cy="70" r={R} fill="none" stroke="#F3F4F6" strokeWidth="20" />
          {lista.map((it, i) => {
            const largo = (it.valor / total) * C
            const el = (
              <circle
                key={it.etiqueta}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={COLORES[i % COLORES.length]}
                strokeWidth="20"
                strokeDasharray={`${Math.max(0, largo - 1.5)} ${C - Math.max(0, largo - 1.5)}`}
                strokeDashoffset={-acumulado}
              >
                <title>{`${it.etiqueta}: ${dinero(it.valor)}`}</title>
              </circle>
            )
            acumulado += largo
            return el
          })}
        </g>
        <text x="70" y="66" textAnchor="middle" fontSize="11" fill="#6B7280">
          Total
        </text>
        <text x="70" y="84" textAnchor="middle" fontSize="15" fontWeight="700" fill="#111827">
          {dinero(total)}
        </text>
      </svg>

      <ul className="min-w-[10rem] flex-1 space-y-2 text-sm">
        {lista.map((it, i) => (
          <li key={it.etiqueta} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: COLORES[i % COLORES.length] }} />
              <span className="truncate text-gray-700">{it.etiqueta}</span>
            </span>
            <span className="whitespace-nowrap font-semibold text-gray-900">
              {dinero(it.valor)} <span className="font-normal text-gray-500">· {Math.round((it.valor / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
