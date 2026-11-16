// Normaliza un celular ecuatoriano a formato WhatsApp (593XXXXXXXXX). Devuelve '' si no es válido.
export function telefonoWhatsApp(telefono) {
  const numero = String(telefono || '').replace(/\D/g, '')

  if (numero.startsWith('593') && numero.length === 12 && numero.slice(3).startsWith('9')) return numero
  if (numero.startsWith('09') && numero.length === 10) return `593${numero.slice(1)}`
  if (numero.startsWith('9') && numero.length === 9) return `593${numero}`

  return ''
}

export function enlaceWhatsApp(telefono, mensaje) {
  const numero = telefonoWhatsApp(telefono)
  if (!numero) return ''
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}
