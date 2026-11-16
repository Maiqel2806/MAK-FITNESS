'use client'

import { useState } from 'react'
import { X, Copy, Share2, CheckCircle2 } from 'lucide-react'

function dinero(valor) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(valor || 0))
}

function redondear(n) {
  return Math.round(Number(n || 0) * 100) / 100
}

function cuando(t) {
  if (t.cerrada_at) {
    return new Date(t.cerrada_at).toLocaleString('es-EC', {
      timeZone: 'America/Guayaquil',
      dateStyle: 'long',
      timeStyle: 'short',
    })
  }
  return t.fecha || ''
}

// Construye las líneas del ticket a partir del resultado del cierre
export function armarTicket(t) {
  const fondo = redondear(t.fondo_inicial)
  const esperado = redondear(t.efectivo_esperado)
  const contado = redondear(t.efectivo_contado)
  const recaudacion = redondear(esperado - fondo)
  const diferencia = redondear(contado - esperado)
  const retiro = t.retiro == null ? null : redondear(t.retiro)
  const dejado = t.efectivo_dejado == null ? null : redondear(t.efectivo_dejado)

  // Detalle ingresos/egresos solo si cuadra con la recaudación
  let ingresos = null
  let egresos = null
  if (t.ingresos != null && t.egresos != null) {
    const ing = redondear(t.ingresos)
    const egr = redondear(t.egresos)
    const aj = redondear(t.ajustes || 0)
    if (Math.abs(ing - egr + aj - recaudacion) < 0.005 && aj === 0) {
      ingresos = ing
      egresos = egr
    }
  }

  return { fondo, esperado, contado, recaudacion, diferencia, retiro, dejado, ingresos, egresos }
}

function textoTicket(t, d) {
  const l = []
  l.push('MAK FITNESS - CIERRE DE CAJA')
  l.push(cuando(t))
  if (t.responsable) l.push(`Cerrada por: ${t.responsable}`)
  l.push('------------------------------')
  l.push(`Caja chica (apertura): ${dinero(d.fondo)}`)
  if (d.ingresos != null) {
    l.push(`  Cobros en efectivo: ${dinero(d.ingresos)}`)
    if (d.egresos > 0) l.push(`  Gastos en efectivo: -${dinero(d.egresos)}`)
  }
  l.push(`TOTAL RECAUDACION EFECTIVO: ${dinero(d.recaudacion)}`)
  l.push(`TOTAL CONTEO FISICO EN CAJA: ${dinero(d.contado)}`)
  l.push(`Diferencia vs sistema: ${dinero(d.diferencia)}`)
  if (d.retiro != null) l.push(`Efectivo retirado: ${dinero(d.retiro)}`)
  if (d.dejado != null) l.push(`Queda en caja para manana: ${dinero(d.dejado)}`)
  if (t.observaciones) l.push(`Obs.: ${t.observaciones}`)
  return l.join('\n')
}

function Fila({ etiqueta, valor, fuerte, tono, chica }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${chica ? 'text-xs text-gray-500' : 'text-sm'}`}>
      <span className={fuerte ? 'font-bold text-gray-900' : 'text-gray-600'}>{etiqueta}</span>
      <span
        className={`${fuerte ? 'text-lg font-bold' : 'font-semibold'} ${
          tono === 'rojo' ? 'text-red-600' : tono === 'verde' ? 'text-[#07838C]' : 'text-gray-900'
        }`}
      >
        {valor}
      </span>
    </div>
  )
}

export default function TicketCierreCaja({ ticket, onCerrar }) {
  const [copiado, setCopiado] = useState(false)
  if (!ticket) return null

  const d = armarTicket(ticket)
  const texto = textoTicket(ticket, d)
  const puedeCompartir = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // sin portapapeles disponible: no hacer nada
    }
  }

  async function compartir() {
    try {
      await navigator.share({ title: 'Cierre de caja MAK FITNESS', text: texto })
    } catch {
      // cancelado por el usuario
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-ticket"
        className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#07838C]">MAK FITNESS</p>
            <h2 id="titulo-ticket" className="text-xl font-bold text-gray-900">
              Ticket de cierre de caja
            </h2>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar ticket" className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
            <X size={22} />
          </button>
        </div>

        <p className="mt-1 text-xs text-gray-500">{cuando(ticket)}</p>
        {ticket.responsable && <p className="text-xs text-gray-500">Cerrada por: {ticket.responsable}</p>}

        <div className="my-4 border-t border-dashed border-gray-300" />

        <div className="space-y-2">
          <Fila etiqueta="Caja chica (apertura)" valor={dinero(d.fondo)} />
          {d.ingresos != null && <Fila chica etiqueta="Cobros en efectivo" valor={dinero(d.ingresos)} />}
          {d.ingresos != null && d.egresos > 0 && <Fila chica etiqueta="Gastos en efectivo" valor={`-${dinero(d.egresos)}`} />}
          <Fila fuerte etiqueta="Total recaudación efectivo" valor={dinero(d.recaudacion)} />
        </div>

        <div className="my-4 border-t border-dashed border-gray-300" />

        <div className="space-y-2">
          <Fila fuerte etiqueta="Total conteo físico en caja" valor={dinero(d.contado)} />
          <Fila
            etiqueta="Diferencia vs. sistema"
            valor={dinero(d.diferencia)}
            tono={d.diferencia === 0 ? 'verde' : 'rojo'}
          />
        </div>

        {(d.retiro != null || d.dejado != null) && (
          <>
            <div className="my-4 border-t border-dashed border-gray-300" />
            <div className="space-y-2">
              {d.retiro != null && <Fila etiqueta="Efectivo retirado" valor={dinero(d.retiro)} />}
              {d.dejado != null && <Fila etiqueta="Queda en caja para mañana" valor={dinero(d.dejado)} />}
            </div>
          </>
        )}

        {ticket.observaciones && (
          <p className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">Obs.: {ticket.observaciones}</p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={copiar}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-3 text-sm font-semibold text-gray-700"
          >
            {copiado ? <CheckCircle2 size={17} /> : <Copy size={17} />}
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
          {puedeCompartir ? (
            <button
              type="button"
              onClick={compartir}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#02AFBB] px-3 py-3 text-sm font-bold text-white"
            >
              <Share2 size={17} />
              Compartir
            </button>
          ) : (
            <button type="button" onClick={onCerrar} className="rounded-xl bg-gray-900 px-3 py-3 text-sm font-bold text-white">
              Listo
            </button>
          )}
        </div>
        {puedeCompartir && (
          <button type="button" onClick={onCerrar} className="mt-3 w-full rounded-xl bg-gray-900 px-3 py-3 text-sm font-bold text-white">
            Listo
          </button>
        )}
      </div>
    </div>
  )
}
