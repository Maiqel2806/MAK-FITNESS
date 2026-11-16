// Montos en USD escritos con coma o punto decimal (teclado de celular es-EC).
// Devuelve un Number con máximo 2 decimales, o null si el texto no es válido.
export function parsearDinero(texto) {
  const limpio = String(texto ?? '').trim().replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null
  const numero = Number(limpio)
  return numero <= 9999999999.99 ? numero : null
}

export function esDineroValido(texto) {
  return parsearDinero(texto) !== null
}

// Deja escribir solo dígitos, coma y punto.
export function limpiarEntradaDinero(texto) {
  return String(texto ?? '').replace(/[^\d.,]/g, '')
}
