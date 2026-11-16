// Lógica de vigencia de membresía para registrar entradas (misma regla que la pantalla de Asistencia).
const ZONA = 'America/Guayaquil'

export function fechaHoyGuayaquil() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function inicioDiaISOGuayaquil(fecha) {
  return new Date(`${fecha}T00:00:00-05:00`).toISOString()
}

export function finDiaISOGuayaquil(fecha) {
  return new Date(`${fecha}T23:59:59-05:00`).toISOString()
}

function diferenciaDias(fechaDesde, fechaHasta) {
  const inicio = new Date(`${fechaDesde}T00:00:00`)
  const fin = new Date(`${fechaHasta}T00:00:00`)
  return Math.round((fin - inicio) / (1000 * 60 * 60 * 24))
}

export function formatearFecha(fecha) {
  if (!fecha) return '-'

  const texto = String(fecha)

  if (texto.includes('T')) {
    const date = new Date(texto)

    return date.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const [year, month, day] = texto.split('-')
  return `${day}/${month}/${year}`
}

export function formatearFechaHora(fecha) {
  if (!fecha) return '-'

  const date = new Date(fecha)

  return date.toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function obtenerNombrePlan(membresia) {
  return (
    membresia?.plan_nombre_snapshot ||
    membresia?.planes?.nombre ||
    'Plan registrado'
  )
}

export function obtenerEstadoMembresia(membresias) {
  const hoy = fechaHoyGuayaquil()

  const vigentesActivas = membresias
    .filter((membresia) => {
      return (
        membresia.estado === 'activa' &&
        membresia.fecha_inicio <= hoy &&
        membresia.fecha_fin >= hoy
      )
    })
    .sort((a, b) => {
      const fechaFinComparacion = String(b.fecha_fin).localeCompare(String(a.fecha_fin))

      if (fechaFinComparacion !== 0) return fechaFinComparacion

      return String(b.fecha_inicio).localeCompare(String(a.fecha_inicio))
    })

  const vigente = vigentesActivas[0]

  if (vigente) {
    const diasRestantes = diferenciaDias(hoy, vigente.fecha_fin)

    if (diasRestantes === 0) {
      return {
        autorizado: true,
        tipo: 'vence_hoy',
        titulo: 'Membresía vigente, vence hoy',
        mensaje: 'El socio puede ingresar hoy. Recuerda informar que su membresía vence hoy.',
        membresia: vigente,
      }
    }

    if (diasRestantes <= 7) {
      return {
        autorizado: true,
        tipo: 'por_caducar',
        titulo: 'Membresía vigente, por caducar',
        mensaje: `El socio puede ingresar. Su membresía vence en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}.`,
        membresia: vigente,
      }
    }

    return {
      autorizado: true,
      tipo: 'vigente',
      titulo: 'Membresía vigente',
      mensaje: `El socio puede ingresar. Su membresía vence el ${formatearFecha(vigente.fecha_fin)}.`,
      membresia: vigente,
    }
  }

  const suspendidaActual = membresias.find((membresia) => {
    return (
      membresia.estado === 'suspendida' &&
      membresia.fecha_inicio <= hoy &&
      membresia.fecha_fin >= hoy
    )
  })

  if (suspendidaActual) {
    return {
      autorizado: false,
      tipo: 'suspendida',
      titulo: 'Membresía suspendida',
      mensaje: 'El socio tiene una membresía suspendida y no tiene otra membresía activa vigente. No se permite registrar entrada.',
      membresia: suspendidaActual,
    }
  }

  const futura = membresias
    .filter((membresia) => {
      return (
        membresia.estado === 'activa' &&
        membresia.fecha_inicio > hoy
      )
    })
    .sort((a, b) => String(a.fecha_inicio).localeCompare(String(b.fecha_inicio)))[0]

  if (futura) {
    return {
      autorizado: false,
      tipo: 'futura',
      titulo: 'Membresía futura',
      mensaje: `El socio tiene una membresía registrada, pero inicia el ${formatearFecha(futura.fecha_inicio)}.`,
      membresia: futura,
    }
  }

  const ultima = membresias
    .filter((membresia) => membresia.estado !== 'suspendida')
    .sort((a, b) => String(b.fecha_fin).localeCompare(String(a.fecha_fin)))[0]

  if (ultima) {
    return {
      autorizado: false,
      tipo: 'vencida',
      titulo: 'Membresía vencida',
      mensaje: `La última membresía venció el ${formatearFecha(ultima.fecha_fin)}. Debe renovar antes de ingresar.`,
      membresia: ultima,
    }
  }

  return {
    autorizado: false,
    tipo: 'sin_membresia',
    titulo: 'Sin membresía',
    mensaje: 'El socio no tiene una membresía registrada. Debe registrar una membresía antes de ingresar.',
    membresia: null,
  }
}


export function claseEstado(tipo) {
  if (tipo === 'vigente') return 'border-green-200 bg-green-50 text-green-800'
  if (tipo === 'por_caducar') return 'border-orange-200 bg-orange-50 text-orange-800'
  if (tipo === 'vence_hoy') return 'border-yellow-200 bg-yellow-50 text-yellow-800'
  return 'border-red-200 bg-red-50 text-red-800'
}
