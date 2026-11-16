'use client'

// MAK_RENOVACIONES_DIA_V1

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, UserPlus, Repeat, UserMinus, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const supabase = createClient()
const ZONA = 'America/Guayaquil'

function hoyGuayaquil() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return p // YYYY-MM-DD
}

function sumarDias(fecha, n) {
  const d = new Date(`${fecha}T12:00:00-05:00`)
  d.setUTCDate(d.getUTCDate() + n)
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

function dinero(v) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(Number(v || 0))
}

function fechaCorta(f) {
  if (!f) return '—'
  const [y, m, d] = String(f).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function hora(ts) {
  return ts ? new Date(ts).toLocaleTimeString('es-EC', { timeZone: ZONA, hour: '2-digit', minute: '2-digit' }) : ''
}

function Tarjeta({ icono: Icono, titulo, valor, color }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Icono size={18} className={color} />
        {titulo}
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900">{valor}</p>
    </div>
  )
}

export default function RenovacionesPage() {
  const [fecha, setFecha] = useState(hoyGuayaquil())
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async (f) => {
    setCargando(true)
    setError('')
    const { data, error: fallo } = await supabase.rpc('mak_movimientos_membresias', { p_fecha: f })
    if (fallo) {
      setError(fallo.message)
      setDatos(null)
    } else {
      setDatos(data)
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar(fecha)
  }, [fecha, cargar])

  const items = datos?.items || []
  const renovaciones = items.filter((i) => i.tipo === 'renovacion')
  const nuevos = items.filter((i) => i.tipo === 'nuevo')
  const esHoy = fecha === hoyGuayaquil()

  function Lista({ titulo, lista, vacio }) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">
          {titulo} <span className="text-gray-400">({lista.length})</span>
        </h2>
        {lista.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{vacio}</p>
        ) : (
          <div className="mt-3 divide-y divide-gray-100">
            {lista.map((i) => (
              <div key={i.membresia_id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-gray-900">
                    {i.nombre} {i.apellido}
                  </p>
                  <p className="font-bold text-gray-900">{dinero(i.monto_cobrado)}</p>
                </div>
                <p className="text-sm text-gray-600">
                  {i.plan || 'Plan'} · vigencia {fechaCorta(i.fecha_inicio)} al {fechaCorta(i.fecha_fin)}
                </p>
                <p className="text-xs text-gray-500">
                  Registrado por <strong>{i.registrado_por || 'sin dato'}</strong> a las {hora(i.registrado_at)}
                  {i.metodos ? ` · ${i.metodos}` : ''}
                  {i.tipo === 'renovacion' && i.vigencia_anterior_fin
                    ? ` · vigencia anterior hasta ${fechaCorta(i.vigencia_anterior_fin)}`
                    : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Renovaciones del día</h1>
        <p className="mt-2 text-sm text-gray-500">
          Quién renovó, quién es nuevo y quién dejó de estar vigente en la fecha elegida.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setFecha(sumarDias(fecha, -1))} aria-label="Día anterior" className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50">
          <ChevronLeft size={18} />
        </button>
        <input
          type="date"
          value={fecha}
          max={hoyGuayaquil()}
          onChange={(e) => e.target.value && setFecha(e.target.value)}
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold"
        />
        <button
          type="button"
          onClick={() => setFecha(sumarDias(fecha, 1))}
          disabled={esHoy}
          aria-label="Día siguiente"
          className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
        {!esHoy && (
          <button type="button" onClick={() => setFecha(hoyGuayaquil())} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-[#07838C]">
            Hoy
          </button>
        )}
        <button type="button" onClick={() => cargar(fecha)} disabled={cargando} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {cargando && !datos ? (
        <p className="text-gray-500">Cargando...</p>
      ) : datos ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tarjeta icono={Repeat} titulo="Renovaciones" valor={datos.renovaciones} color="text-[#07838C]" />
            <Tarjeta icono={UserPlus} titulo="Socios nuevos" valor={datos.nuevos} color="text-emerald-600" />
            <Tarjeta icono={UserMinus} titulo="Dejaron de estar vigentes" valor={datos.vencidas} color="text-red-500" />
            <Tarjeta icono={DollarSign} titulo="Cobrado en membresías" valor={dinero(datos.total_cobrado)} color="text-gray-700" />
          </div>

          <Lista titulo="Renovaciones" lista={renovaciones} vacio="Nadie renovó este día." />
          <Lista titulo="Socios nuevos" lista={nuevos} vacio="No hubo socios nuevos este día." />

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              Dejaron de estar vigentes <span className="text-gray-400">({datos.vencidas})</span>
            </h2>
            <p className="mt-1 text-xs text-gray-500">Su última vigencia terminó el día anterior y no tenían otra activa.</p>
            {(datos.vencidas_detalle || []).length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">Nadie dejó de estar vigente este día.</p>
            ) : (
              <div className="mt-3 divide-y divide-gray-100">
                {datos.vencidas_detalle.map((v) => (
                  <div key={v.miembro_id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                    <p className="font-semibold text-gray-900">
                      {v.nombre} {v.apellido}
                    </p>
                    <p className="text-sm text-gray-600">
                      {v.plan || 'Plan'} · venció {fechaCorta(v.fecha_fin)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
