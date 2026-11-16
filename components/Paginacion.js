'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

export const POR_PAGINA = 10

// Devuelve la página corregida (nunca fuera de rango) y los elementos que le tocan.
export function paginar(lista, pagina, porPagina = POR_PAGINA) {
  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina))
  const actual = Math.min(Math.max(1, pagina), totalPaginas)
  const inicio = (actual - 1) * porPagina
  return { actual, totalPaginas, items: lista.slice(inicio, inicio + porPagina), inicio }
}

export default function Paginacion({ total, pagina, porPagina = POR_PAGINA, onCambiar }) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  if (total <= porPagina) return null
  const actual = Math.min(Math.max(1, pagina), totalPaginas)
  const desde = (actual - 1) * porPagina + 1
  const hasta = Math.min(actual * porPagina, total)

  // Ventana de números alrededor de la página actual
  const numeros = []
  for (let p = 1; p <= totalPaginas; p++) {
    if (p === 1 || p === totalPaginas || Math.abs(p - actual) <= 1) numeros.push(p)
    else if (numeros[numeros.length - 1] !== '...') numeros.push('...')
  }

  const base = 'inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-xl border px-3 text-sm font-semibold'

  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <p className="text-sm text-gray-600">
        Mostrando {desde}–{hasta} de {total}
      </p>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onCambiar(actual - 1)} disabled={actual === 1} aria-label="Página anterior" className={`${base} border-gray-300 text-gray-700 disabled:opacity-40`}>
          <ChevronLeft size={16} />
        </button>
        {numeros.map((n, i) =>
          n === '...' ? (
            <span key={`p${i}`} className="px-1 text-gray-400">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onCambiar(n)}
              aria-current={n === actual ? 'page' : undefined}
              className={`${base} ${n === actual ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700'}`}
            >
              {n}
            </button>
          )
        )}
        <button type="button" onClick={() => onCambiar(actual + 1)} disabled={actual === totalPaginas} aria-label="Página siguiente" className={`${base} border-gray-300 text-gray-700 disabled:opacity-40`}>
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  )
}
