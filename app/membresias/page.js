'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { usePerfil } from '@/components/UserContext'
import {
  Plus,
  Save,
  Search,
  CreditCard,
  CalendarDays,
  UserRound,
  PackageCheck,
  X,
  Pencil,
  Trash2,
  RefreshCw,
  BadgeDollarSign,
  ArrowUpRight,
} from 'lucide-react'

const supabase = createClient()

const tiposTarjeta = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'diners', label: 'Diners' },
  { value: 'discover', label: 'Discover' },
  { value: 'american_express', label: 'American Express' },
]

// MAK_CONFIG_PAGOS_SOCIOS_ADMIN_V1
const configPagosSociosInicial = {
  efectivo_activo: true,
  efectivo_mensaje:
    'Realiza tu pago directamente en recepción de MAK FITNESS.',

  transferencia_activa: false,
  banco: '',
  tipo_cuenta: 'ahorros',
  numero_cuenta: '',
  titular_cuenta: '',
  identificacion_titular: '',
  transferencia_aviso_comprobante:
    'Por seguridad, conserva tu comprobante de pago. Puedes enviarlo al WhatsApp de MAK FITNESS.',

  whatsapp_gym: '0991183054',

  tarjeta_activa: false,
  tarjeta_mensaje:
    'Solicita tu link de pago para tarjeta de débito o crédito.',

  tarjeta_recargo_mensaje:
    'Los pagos con tarjeta tienen un recargo adicional correspondiente al procesamiento bancario. El valor final será informado antes de generar el link de pago.',

  tarjeta_solicitud_mensaje:
    'Quiero renovar mi membresía y pagar con tarjeta. Por favor envíame el link de pago.',
}


const planInicial = {
  nombre: '',
  descripcion: '',
  precio: '',
  duracion_dias: '',
  activo: true,
  es_promocion: false,

  // MAK_PROMOS_FECHA_FIJA_V1
  modalidad_vigencia: 'duracion',
  vigencia_desde: '',
  vigencia_hasta: '',
}

// MAK_PAGOS_SEGUROS_V1
function crearIdOperacion() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  const plantilla = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
  return plantilla.replace(/[xy]/g, (caracter) => {
    const aleatorio = Math.floor(Math.random() * 16)
    const valor = caracter === 'x' ? aleatorio : (aleatorio & 0x3) | 0x8
    return valor.toString(16)
  })
}

function crearPagoMembresia(monto = '') {
  return {
    metodo_pago: 'efectivo',
    monto: String(monto ?? ''),
    notas: '',
    numero_comprobante: '',
    banco_origen: '',
    tipo_tarjeta: '',
  }
}

function ajustarPagoMembresiaPorMetodo(pago, campo, valor) {
  const nuevo = {
    ...pago,
    [campo]: valor,
  }

  if (campo !== 'metodo_pago') return nuevo

  if (valor === 'efectivo' || valor === 'canje') {
    nuevo.numero_comprobante = ''
    nuevo.banco_origen = ''
    nuevo.tipo_tarjeta = ''
  }

  if (valor === 'transferencia') {
    nuevo.tipo_tarjeta = ''
  }

  if (valor === 'tarjeta') {
    nuevo.banco_origen = ''
  }

  return nuevo
}

function obtenerTotalPagosFormulario(pagos) {
  return (pagos || []).reduce(
    (total, pago) => total + Number(pago?.monto || 0),
    0
  )
}

function validarPagosMembresia(pagos, precioPlan, permitirCanje) {
  if (!Array.isArray(pagos) || pagos.length === 0) {
    return 'Debes registrar al menos una forma de pago.'
  }

  if (pagos.length > 5) {
    return 'No se permiten más de 5 formas de pago en una operación.'
  }

  for (let indice = 0; indice < pagos.length; indice += 1) {
    const pago = pagos[indice] || {}
    const numero = indice + 1
    const monto = Number(pago.monto)

    if (!monto || monto <= 0) {
      return `El monto de la forma de pago ${numero} debe ser mayor a 0.`
    }

    if (!['efectivo', 'transferencia', 'tarjeta', 'canje'].includes(pago.metodo_pago)) {
      return `La forma de pago ${numero} no es válida.`
    }

    if (pago.metodo_pago === 'canje') {
      if (!permitirCanje) {
        return 'Los canjes solo pueden ser registrados por dueño o administrador.'
      }

      if (!String(pago.notas || '').trim()) {
        return `Describe el motivo del canje en la forma de pago ${numero}.`
      }
    }

    if (pago.metodo_pago === 'transferencia') {
      if (!String(pago.numero_comprobante || '').trim()) {
        return `Ingresa el comprobante de la transferencia ${numero}.`
      }

      if (!String(pago.banco_origen || '').trim()) {
        return `Ingresa el banco de origen de la transferencia ${numero}.`
      }
    }

    if (pago.metodo_pago === 'tarjeta') {
      if (!String(pago.numero_comprobante || '').trim()) {
        return `Ingresa el comprobante del pago con tarjeta ${numero}.`
      }

      if (!pago.tipo_tarjeta) {
        return `Selecciona el tipo de tarjeta de la forma de pago ${numero}.`
      }
    }
  }

  const total = obtenerTotalPagosFormulario(pagos)
  const precio = Number(precioPlan || 0)

  if (precio > 0 && Math.round(total * 100) < Math.round(precio * 100)) {
    return `Pago incompleto. Registrado: $${total.toFixed(2)}. Valor del plan: $${precio.toFixed(2)}.`
  }

  return ''
}

function PagosMembresiaEditor({
  pagos,
  actualizarPago,
  agregarPago,
  eliminarPago,
  permitirCanje,
  precioPlan,
}) {
  const total = obtenerTotalPagosFormulario(pagos)
  const precio = Number(precioPlan || 0)
  const diferencia = precio - total

  return (
    <div className="space-y-3">
      {(pagos || []).map((pago, indice) => (
        <div
          key={indice}
          className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-gray-900">
              Forma de pago {indice + 1}
            </p>

            {pagos.length > 1 && (
              <button
                type="button"
                onClick={() => eliminarPago(indice)}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                Quitar
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Monto
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={pago.monto}
                onChange={(e) => actualizarPago(indice, 'monto', e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Método
              </label>
              <select
                value={pago.metodo_pago}
                onChange={(e) => actualizarPago(indice, 'metodo_pago', e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                {permitirCanje && <option value="canje">Canje</option>}
              </select>
            </div>

            {pago.metodo_pago === 'transferencia' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Número de comprobante
                  </label>
                  <input
                    value={pago.numero_comprobante}
                    onChange={(e) => actualizarPago(indice, 'numero_comprobante', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Ej: TRX-001234"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Banco de origen
                  </label>
                  <input
                    value={pago.banco_origen}
                    onChange={(e) => actualizarPago(indice, 'banco_origen', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Ej: Banco Pichincha"
                  />
                </div>
              </>
            )}

            {pago.metodo_pago === 'tarjeta' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tipo de tarjeta
                  </label>
                  <select
                    value={pago.tipo_tarjeta}
                    onChange={(e) => actualizarPago(indice, 'tipo_tarjeta', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                  >
                    <option value="">Seleccionar tarjeta</option>
                    {tiposTarjeta.map((tarjeta) => (
                      <option key={tarjeta.value} value={tarjeta.value}>
                        {tarjeta.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Número de comprobante
                  </label>
                  <input
                    value={pago.numero_comprobante}
                    onChange={(e) => actualizarPago(indice, 'numero_comprobante', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Ej: POS-001234"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {pago.metodo_pago === 'canje' ? 'Detalle del canje *' : 'Detalle de este pago'}
              </label>
              <textarea
                value={pago.notas}
                onChange={(e) => actualizarPago(indice, 'notas', e.target.value)}
                className="min-h-20 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                placeholder={
                  pago.metodo_pago === 'canje'
                    ? 'Ej: Canje por servicio de bailoterapia'
                    : 'Opcional'
                }
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-bold text-gray-900">
            Total registrado: ${total.toFixed(2)}
          </p>
          {precio > 0 && (
            <p className={diferencia > 0.004 ? 'text-red-600' : 'text-green-700'}>
              Valor del plan: ${precio.toFixed(2)}
              {diferencia > 0.004
                ? ` · Faltan $${diferencia.toFixed(2)}`
                : diferencia < -0.004
                  ? ` · Excede $${Math.abs(diferencia).toFixed(2)}`
                  : ' · Pago exacto'}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={agregarPago}
          disabled={(pagos || []).length >= 5}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Agregar otro método
        </button>
      </div>
    </div>
  )
}

const membresiaInicial = {
  miembro_id: '',
  plan_id: '',
  fecha_inicio: obtenerFechaHoy(),
  notas: '',
  renovacion_de_membresia_id: null,
  mantener_mismo_plan: null,
  plan_historico_nombre: '',
  plan_historico_precio: '',
  plan_historico_duracion_dias: null,
  plan_historico_duracion_meses: null,
  operacion_id: '',
  pagos: [crearPagoMembresia()],
}

const inscripcionInicial = {
  miembro_id: '',
  metodo_pago: 'efectivo',
  monto: '10',
  notas: '',
  numero_comprobante: '',
  banco_origen: '',
  tipo_tarjeta: '',
}

const upgradeInicial = {
  miembro_id: '',
  metodo_pago: 'efectivo',
  monto: '20',
  notas: '',
  numero_comprobante: '',
  banco_origen: '',
  tipo_tarjeta: '',
}

const edicionMembresiaInicial = {
  fecha_inicio: '',
}

function obtenerFechaHoy() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = partes.find((parte) => parte.type === 'year')?.value
  const month = partes.find((parte) => parte.type === 'month')?.value
  const day = partes.find((parte) => parte.type === 'day')?.value

  return `${year}-${month}-${day}`
}

function obtenerMesActual() {
  return obtenerFechaHoy().slice(0, 7)
}

function formatearMes(valor) {
  if (!valor || valor === 'todas') {
    return 'Todas las caducadas'
  }

  const [year, month] = valor.split('-').map(Number)

  const fecha = new Date(
    year,
    month - 1,
    1
  )

  const texto = new Intl.DateTimeFormat(
    'es-EC',
    {
      month: 'long',
      year: 'numeric',
    }
  ).format(fecha)

  return (
    texto.charAt(0).toUpperCase() +
    texto.slice(1)
  )
}

function sumarDias(fecha, dias) {
  if (!fecha) return ''

  const [year, month, day] = String(fecha)
    .slice(0, 10)
    .split('-')
    .map(Number)

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  )

  date.setUTCDate(
    date.getUTCDate() +
      Number(dias || 0)
  )

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, '0')}-${String(
    date.getUTCDate()
  ).padStart(2, '0')}`
}

function calcularFechaFin(
  fechaInicio,
  duracionDias
) {
  if (
    !fechaInicio ||
    !duracionDias
  ) {
    return ''
  }

  return sumarDias(
    fechaInicio,
    Math.max(
      Number(
        duracionDias || 1
      ) - 1,
      0
    )
  )
}

function calcularFechaRenovacionCalendario(
  fechaInicio,
  duracionMeses,
  diaAncla = null
) {
  if (
    !fechaInicio ||
    !duracionMeses
  ) {
    return ''
  }

  const [
    year,
    month,
    day,
  ] = String(fechaInicio)
    .slice(0, 10)
    .split('-')
    .map(Number)

  const meses =
    Number(
      duracionMeses || 0
    )

  if (meses <= 0) {
    return ''
  }

  const ancla = Math.min(
    31,
    Math.max(
      1,
      Number(
        diaAncla || day
      )
    )
  )

  const indice =
    year * 12 +
    (month - 1) +
    meses

  const yearDestino =
    Math.floor(
      indice / 12
    )

  const monthDestino =
    indice % 12

  const ultimoDia =
    new Date(
      Date.UTC(
        yearDestino,
        monthDestino + 1,
        0
      )
    ).getUTCDate()

  const diaDestino =
    Math.min(
      ancla,
      ultimoDia
    )

  return `${yearDestino}-${String(
    monthDestino + 1
  ).padStart(2, '0')}-${String(
    diaDestino
  ).padStart(2, '0')}`
}

function obtenerDuracionMembresia(
  membresia
) {
  return Number(
    membresia
      ?.plan_duracion_dias_snapshot ||
      membresia
        ?.planes
        ?.duracion_dias ||
      0
  )
}

function obtenerDuracionMesesSnapshot(
  membresia
) {
  return Number(
    membresia
      ?.plan_duracion_meses_snapshot ||
      0
  )
}

function obtenerDuracionMesesParaCalculo(
  membresia
) {
  return Number(
    membresia
      ?.plan_duracion_meses_snapshot ||
      membresia
        ?.planes
        ?.duracion_meses ||
      0
  )
}

function obtenerFechaRenovacionMembresia(
  membresia
) {
  return membresia?.fecha_fin
    ? sumarDias(
        membresia.fecha_fin,
        1
      )
    : ''
}

function esPlanFechaFija(plan) {
  return (
    Boolean(plan?.es_promocion) &&
    plan?.modalidad_vigencia === 'fecha_fija'
  )
}

function calcularDiasInclusive(
  fechaInicio,
  fechaFin
) {
  if (!fechaInicio || !fechaFin) {
    return 0
  }

  const inicio =
    new Date(
      `${fechaInicio}T00:00:00Z`
    )

  const fin =
    new Date(
      `${fechaFin}T00:00:00Z`
    )

  const diferencia =
    Math.floor(
      (
        fin.getTime() -
        inicio.getTime()
      ) /
      86400000
    )

  if (diferencia < 0) {
    return 0
  }

  return diferencia + 1
}

function planDisponibleParaVenta(
  plan
) {
  if (!plan?.activo) {
    return false
  }

  if (!esPlanFechaFija(plan)) {
    return true
  }

  if (
    !plan.vigencia_desde ||
    !plan.vigencia_hasta
  ) {
    return false
  }

  const hoy =
    obtenerFechaHoy()

  return (
    hoy >= plan.vigencia_desde &&
    hoy <= plan.vigencia_hasta
  )
}

function obtenerEstadoPromoFecha(
  plan
) {
  if (!esPlanFechaFija(plan)) {
    return null
  }

  const hoy =
    obtenerFechaHoy()

  if (hoy < plan.vigencia_desde) {
    return 'programada'
  }

  if (hoy > plan.vigencia_hasta) {
    return 'finalizada'
  }

  return 'vigente'
}

function calcularFechaRenovacionPlan(
  fechaInicio,
  plan
) {
  if (
    !fechaInicio ||
    !plan
  ) {
    return ''
  }

  if (esPlanFechaFija(plan)) {
    return plan.vigencia_hasta
      ? sumarDias(
          plan.vigencia_hasta,
          1
        )
      : ''
  }

  const meses =
    Number(
      plan.duracion_meses ||
        0
    )

  if (meses > 0) {
    return calcularFechaRenovacionCalendario(
      fechaInicio,
      meses,
      Number(
        String(
          fechaInicio
        ).slice(8, 10)
      )
    )
  }

  const fin =
    calcularFechaFin(
      fechaInicio,
      plan.duracion_dias
    )

  return fin
    ? sumarDias(fin, 1)
    : ''
}

function calcularFechaRenovacionDesdeMembresia(
  membresia,
  fechaInicio
) {
  const meses =
    obtenerDuracionMesesParaCalculo(
      membresia
    )

  if (meses > 0) {
    return calcularFechaRenovacionCalendario(
      fechaInicio,
      meses,
      Number(
        String(
          fechaInicio
        ).slice(8, 10)
      )
    )
  }

  const fin =
    calcularFechaFin(
      fechaInicio,
      obtenerDuracionMembresia(
        membresia
      )
    )

  return fin
    ? sumarDias(fin, 1)
    : ''
}

function obtenerTextoDuracionMembresia(
  membresia
) {
  const meses =
    obtenerDuracionMesesSnapshot(
      membresia
    )

  if (meses > 0) {
    return `${meses} mes${
      meses === 1
        ? ''
        : 'es'
    }`
  }

  const dias =
    obtenerDuracionMembresia(
      membresia
    )

  return `${dias} día${
    dias === 1
      ? ''
      : 's'
  }`
}

function inferirDuracionMeses(
  dias
) {
  return ({
    30: 1,
    60: 2,
    90: 3,
    180: 6,
    365: 12,
  })[
    Number(dias)
  ] || null
}

function diferenciaDias(fechaDesde, fechaHasta) {
  const [
    aY,
    aM,
    aD,
  ] = String(fechaDesde)
    .slice(0, 10)
    .split('-')
    .map(Number)

  const [
    bY,
    bM,
    bD,
  ] = String(fechaHasta)
    .slice(0, 10)
    .split('-')
    .map(Number)

  return Math.round(
    (
      Date.UTC(
        bY,
        bM - 1,
        bD
      ) -
      Date.UTC(
        aY,
        aM - 1,
        aD
      )
    ) /
      86400000
  )
}

function formatearDinero(valor) {
  return `$${Number(valor || 0).toFixed(2)}`
}

function formatearFecha(fecha) {
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

function obtenerClaseEstado(estado) {
  if (estado === 'activa') return 'bg-green-50 text-green-700'
  if (estado === 'por_caducar') return 'bg-orange-50 text-orange-700'
  if (estado === 'vence_hoy') return 'bg-yellow-50 text-yellow-700'
  if (estado === 'futura') return 'bg-blue-50 text-blue-700'
  if (estado === 'vencida') return 'bg-red-50 text-red-700'
  if (estado === 'suspendida') return 'bg-gray-100 text-gray-700'
  return 'bg-gray-100 text-gray-700'
}

function obtenerEtiquetaEstado(estado) {
  if (estado === 'activa') return 'Vigente'
  if (estado === 'por_caducar') return 'Por caducar'
  if (estado === 'vence_hoy') return 'Renueva mañana'
  if (estado === 'futura') return 'Futura'
  if (estado === 'vencida') return 'Vencida'
  if (estado === 'suspendida') return 'Suspendida'
  return estado
}

function obtenerEtiquetaTarjeta(tipo) {
  return tiposTarjeta.find((item) => item.value === tipo)?.label || '-'
}

function obtenerNombreSocio(membresia) {
  const miembro = membresia.miembros || {}
  return `${miembro.nombre || ''} ${miembro.apellido || ''}`.trim() || 'Socio sin nombre'
}

function obtenerNombrePlan(membresia) {
  return (
    membresia.plan_nombre_snapshot ||
    membresia.planes?.nombre ||
    'Plan registrado'
  )
}

function obtenerDetallePago(pago) {
  if (!pago) return '-'

  if (pago.metodo_pago === 'transferencia') {
    return `Comprobante: ${pago.numero_comprobante || '-'} · Banco: ${pago.banco_origen || '-'}`
  }

  if (pago.metodo_pago === 'tarjeta') {
    return `Comprobante: ${pago.numero_comprobante || '-'} · Tarjeta: ${obtenerEtiquetaTarjeta(pago.tipo_tarjeta)}`
  }

  if (pago.metodo_pago === 'canje') {
    return pago.notas ? `Canje · ${pago.notas}` : 'Canje'
  }

  return 'Pago en efectivo'
}

// MAK_WHATSAPP_VENCIDAS_V1

function normalizarTelefonoWhatsAppMembresia(telefono) {
  const numero = String(
    telefono || ''
  ).replace(/\D/g, '')

  if (
    numero.startsWith('593') &&
    numero.length === 12 &&
    numero.slice(3).startsWith('9')
  ) {
    return numero
  }

  if (
    numero.startsWith('09') &&
    numero.length === 10
  ) {
    return `593${numero.slice(1)}`
  }

  if (
    numero.startsWith('9') &&
    numero.length === 9
  ) {
    return `593${numero}`
  }

  return ''
}

function crearMensajeRenovacion(membresia) {
  const nombre =
    obtenerNombreSocio(membresia)

  return `*¡Este mes ha sido excelente!*

Hola, *${nombre}*.

Tu constancia, disciplina y esfuerzo ya comienzan a dar resultados, y queremos seguir acompañándote en cada paso.

En *MAK FITNESS* somos más que un gimnasio: queremos ser parte de tu progreso y de cada meta que alcances.

*Renueva hoy tu membresía*, sigue formando parte de nuestra comunidad y continúa trabajando por ese objetivo que te propusiste.

*¡Vamos por más!*

*MAK FITNESS*
*Entrenamiento real, para resultados reales*`
}

function crearMensajeRecuperacion(membresia) {
  const nombre =
    obtenerNombreSocio(membresia)

  return `*¡Es un buen momento para volver!*

Hola, *${nombre}*.

A veces hacemos una pausa, pero tus objetivos siguen ahí esperando por ti.

En *MAK FITNESS* queremos verte nuevamente entrenando, recuperando el ritmo y avanzando con disciplina y constancia.

*Retoma hoy tu entrenamiento y vuelve a trabajar por la mejor versión de ti.*

*¡Te esperamos!*

*MAK FITNESS*
*Entrenamiento real, para resultados reales*`
}

function abrirWhatsAppMembresia(
  telefono,
  mensaje
) {
  const numero =
    normalizarTelefonoWhatsAppMembresia(
      telefono
    )

  if (!numero) {
    window.alert(
      'El socio no tiene un numero de WhatsApp valido.'
    )
    return
  }

  const url =
    `https://wa.me/${numero}?text=${encodeURIComponent(
      mensaje
    )}`

  window.open(
    url,
    '_blank',
    'noopener,noreferrer'
  )
}

function ajustarDetallePagoPorMetodo(nuevo, campo, valor) {
  if (campo !== 'metodo_pago') return nuevo

  if (valor === 'efectivo') {
    nuevo.numero_comprobante = ''
    nuevo.banco_origen = ''
    nuevo.tipo_tarjeta = ''
  }

  if (valor === 'transferencia') {
    nuevo.tipo_tarjeta = ''
  }

  if (valor === 'tarjeta') {
    nuevo.banco_origen = ''
  }

  return nuevo
}

function validarDetallePago(formulario) {
  if (formulario.metodo_pago === 'transferencia') {
    if (!formulario.numero_comprobante.trim()) {
      return 'Para transferencia debes ingresar el número de comprobante.'
    }

    if (!formulario.banco_origen.trim()) {
      return 'Para transferencia debes ingresar el banco de origen.'
    }
  }

  if (formulario.metodo_pago === 'tarjeta') {
    if (!formulario.numero_comprobante.trim()) {
      return 'Para pago con tarjeta debes ingresar el número de comprobante.'
    }

    if (!formulario.tipo_tarjeta) {
      return 'Para pago con tarjeta debes seleccionar el tipo de tarjeta.'
    }
  }

  return ''
}

function CamposDetallePago({ valores, actualizar }) {
  if (valores.metodo_pago === 'transferencia') {
    return (
      <>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Número de comprobante / voucher
          </label>
          <input
            value={valores.numero_comprobante}
            onChange={(e) => actualizar('numero_comprobante', e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
            placeholder="Ej: TRX-001234"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Banco de origen
          </label>
          <input
            value={valores.banco_origen}
            onChange={(e) => actualizar('banco_origen', e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
            placeholder="Ej: Banco Pichincha"
          />
        </div>
      </>
    )
  }

  if (valores.metodo_pago === 'tarjeta') {
    return (
      <>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tipo de tarjeta
          </label>
          <select
            value={valores.tipo_tarjeta}
            onChange={(e) => actualizar('tipo_tarjeta', e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          >
            <option value="">Seleccionar tarjeta</option>
            {tiposTarjeta.map((tarjeta) => (
              <option key={tarjeta.value} value={tarjeta.value}>
                {tarjeta.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Número de comprobante / voucher
          </label>
          <input
            value={valores.numero_comprobante}
            onChange={(e) => actualizar('numero_comprobante', e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
            placeholder="Ej: POS-001234"
          />
        </div>
      </>
    )
  }

  return null
}

export default function MembresiasPage() {
  const perfil = usePerfil()
  const esDueno = perfil?.rol === 'dueno'
  const esAdminPagos = ['dueno', 'administrador'].includes(perfil?.rol)

  const [miembros, setMiembros] = useState([])
  const [planes, setPlanes] = useState([])
  const [membresias, setMembresias] = useState([])
  const [pagos, setPagos] = useState([])

  const [formPlan, setFormPlan] = useState(planInicial)
  const [formMembresia, setFormMembresia] = useState(() => ({
    ...membresiaInicial,
    fecha_inicio: obtenerFechaHoy(),
    operacion_id: crearIdOperacion(),
    pagos: [crearPagoMembresia()],
  }))
  const [formInscripcion, setFormInscripcion] = useState(inscripcionInicial)
  const [formUpgrade, setFormUpgrade] = useState(upgradeInicial)
  const [formEditarMembresia, setFormEditarMembresia] = useState(edicionMembresiaInicial)

  const [mostrarPlan, setMostrarPlan] = useState(false)
  const [mostrarMembresia, setMostrarMembresia] = useState(false)
  const [mostrarInscripcion, setMostrarInscripcion] = useState(false)
  const [mostrarUpgrade, setMostrarUpgrade] = useState(false)
  const [mostrarEditarMembresia, setMostrarEditarMembresia] = useState(false)

  const [
    mostrarConfigPagosSocios,
    setMostrarConfigPagosSocios,
  ] = useState(false)

  const [
    configPagosSocios,
    setConfigPagosSocios,
  ] = useState(
    configPagosSociosInicial
  )

  const [
    cargandoConfigPagosSocios,
    setCargandoConfigPagosSocios,
  ] = useState(false)

  const [
    guardandoConfigPagosSocios,
    setGuardandoConfigPagosSocios,
  ] = useState(false)

  const [editandoPlanId, setEditandoPlanId] = useState(null)
  const [editandoMembresiaId, setEditandoMembresiaId] = useState(null)
  const [membresiaSeleccionada, setMembresiaSeleccionada] = useState(null)
  const [membresiaUpgradeSeleccionada, setMembresiaUpgradeSeleccionada] = useState(null)

  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activa')
  const [paginaMembresias, setPaginaMembresias] = useState(1)
  
  const [filtroMesVencidas, setFiltroMesVencidas] = useState(
    obtenerMesActual()
  )
const [pestanaPlanes, setPestanaPlanes] = useState('activos')

  const [cargando, setCargando] = useState(true)
  const [guardandoPlan, setGuardandoPlan] = useState(false)
  const [guardandoMembresia, setGuardandoMembresia] = useState(false)
  const [guardandoInscripcion, setGuardandoInscripcion] = useState(false)
  const [guardandoUpgrade, setGuardandoUpgrade] = useState(false)
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [detalleVencida, setDetalleVencida] = useState(null)

  // MAK_RENOVACION_HISTORICA_V1
  const [confirmacionRenovacion, setConfirmacionRenovacion] = useState(null)
  const [detallePagos, setDetallePagos] = useState(null)
  const [historialPagos, setHistorialPagos] = useState([])
  const [historialRenovaciones, setHistorialRenovaciones] = useState([])
  const [cargandoHistorialPagos, setCargandoHistorialPagos] = useState(false)
  const [cargandoHistorialRenovaciones, setCargandoHistorialRenovaciones] = useState(false)
  const [pagoCorreccion, setPagoCorreccion] = useState(null)
  const [guardandoCorreccionPago, setGuardandoCorreccionPago] = useState(false)
  const [formCorreccionPago, setFormCorreccionPago] = useState({
    metodo_pago: 'efectivo',
    notas: '',
    numero_comprobante: '',
    banco_origen: '',
    tipo_tarjeta: '',
    motivo: '',
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    setError('')
    setMensaje('')

    const [
      respuestaMiembros,
      respuestaPlanes,
      respuestaMembresias,
      respuestaPagos,
    ] = await Promise.all([
      supabase
        .from('miembros')
        .select('*')
        .order('nombre', { ascending: true }),

      supabase
        .from('planes')
        .select('*')
        .order('precio', { ascending: true }),

      supabase
        .from('membresias')
        .select(`
          *,
          miembros (
            id,
            nombre,
            apellido,
            cedula,
            telefono,
            codigo_acceso
          ),
          planes (
            id,
            codigo,
            nombre,
            precio,
            duracion_dias,
            duracion_meses,
            tipo_plan,
            es_upgrade,
            es_promocion
          )
        `)
        .order('fecha_fin', { ascending: true }),

      supabase
        .from('pagos')
        .select('*')
        .order('fecha_pago', { ascending: false }),
    ])

    if (respuestaMiembros.error) {
      setError(respuestaMiembros.error.message)
      setMiembros([])
    } else {
      setMiembros(respuestaMiembros.data || [])
    }

    if (respuestaPlanes.error) {
      setError(respuestaPlanes.error.message)
      setPlanes([])
    } else {
      setPlanes(respuestaPlanes.data || [])
    }

    if (respuestaMembresias.error) {
      setError(respuestaMembresias.error.message)
      setMembresias([])
    } else {
      setMembresias(respuestaMembresias.data || [])
    }

    if (respuestaPagos.error) {
      setError(respuestaPagos.error.message)
      setPagos([])
    } else {
      setPagos(respuestaPagos.data || [])
    }

    setCargando(false)
  }

  function calcularFechaInicioInteligente(miembroId) {
    const hoy = obtenerFechaHoy()

    const fechaFinMayor = membresias
      .filter((membresia) => {
        return (
          membresia.miembro_id === miembroId &&
          membresia.estado === 'activa' &&
          membresia.fecha_fin >= hoy
        )
      })
      .map((membresia) => membresia.fecha_fin)
      .sort((a, b) => String(b).localeCompare(String(a)))[0]

    if (!fechaFinMayor) return hoy

    return sumarDias(fechaFinMayor, 1)
  }

  function actualizarPlan(campo, valor) {
    setFormPlan((actual) => {
      const nuevo = {
        ...actual,
        [campo]: valor,
      }

      if (
        campo === 'es_promocion' &&
        valor === true
      ) {
        // Todo NUEVO plan promocional se administra
        // mediante fechas específicas.
        nuevo.modalidad_vigencia =
          'fecha_fija'

        nuevo.duracion_dias = ''
        nuevo.vigencia_desde = ''
        nuevo.vigencia_hasta = ''
      }

      if (
        campo === 'es_promocion' &&
        valor === false
      ) {
        nuevo.modalidad_vigencia =
          'duracion'

        nuevo.vigencia_desde = ''
        nuevo.vigencia_hasta = ''
      }

      if (
        campo === 'modalidad_vigencia' &&
        valor === 'fecha_fija'
      ) {
        nuevo.es_promocion = true
        nuevo.duracion_dias = ''
        nuevo.vigencia_desde = ''
        nuevo.vigencia_hasta = ''
      }

      return nuevo
    })
  }

  function actualizarMembresia(campo, valor) {
    setFormMembresia((actual) => {
      const nuevo = {
        ...actual,
        [campo]: valor,
      }

      if (campo === 'miembro_id') {
        nuevo.fecha_inicio = valor ? calcularFechaInicioInteligente(valor) : obtenerFechaHoy()
        nuevo.renovacion_de_membresia_id = null
        nuevo.mantener_mismo_plan = null
        nuevo.plan_historico_nombre = ''
        nuevo.plan_historico_precio = ''
        nuevo.plan_historico_duracion_dias = null
        nuevo.plan_historico_duracion_meses = null
      }

      if (campo === 'plan_id') {
        const plan = planes.find((item) => item.id === valor)
        const pagosActuales = Array.isArray(actual.pagos) && actual.pagos.length > 0
          ? actual.pagos.map((pago) => ({ ...pago }))
          : [crearPagoMembresia()]

        if (pagosActuales.length === 1) {
          pagosActuales[0].monto = plan ? String(plan.precio) : ''
        }

        nuevo.pagos = pagosActuales
      }

      return nuevo
    })
  }

  function actualizarPagoMembresia(indice, campo, valor) {
    setFormMembresia((actual) => ({
      ...actual,
      pagos: actual.pagos.map((pago, posicion) =>
        posicion === indice
          ? ajustarPagoMembresiaPorMetodo(pago, campo, valor)
          : pago
      ),
    }))
  }

  function agregarPagoMembresia() {
    setFormMembresia((actual) => {
      if (actual.pagos.length >= 5) return actual

      return {
        ...actual,
        pagos: [
          ...actual.pagos,
          crearPagoMembresia(),
        ],
      }
    })
  }

  function eliminarPagoMembresia(indice) {
    setFormMembresia((actual) => {
      if (actual.pagos.length <= 1) return actual

      return {
        ...actual,
        pagos: actual.pagos.filter((_, posicion) => posicion !== indice),
      }
    })
  }

  function actualizarInscripcion(campo, valor) {
    setFormInscripcion((actual) => {
      const nuevo = {
        ...actual,
        [campo]: valor,
      }

      return ajustarDetallePagoPorMetodo(nuevo, campo, valor)
    })
  }

  function actualizarUpgrade(campo, valor) {
    setFormUpgrade((actual) => {
      const nuevo = {
        ...actual,
        [campo]: valor,
      }

      return ajustarDetallePagoPorMetodo(nuevo, campo, valor)
    })
  }

  function actualizarEdicionMembresia(campo, valor) {
    setFormEditarMembresia((actual) => ({
      ...actual,
      [campo]: valor,
    }))
  }

  function cerrarFormularios() {
    setMostrarPlan(false)
    setMostrarMembresia(false)
    setMostrarInscripcion(false)
    setMostrarUpgrade(false)
    setMostrarEditarMembresia(false)
    setMostrarConfigPagosSocios(false)
  }

  function actualizarConfigPagosSocios(
    campo,
    valor
  ) {
    setConfigPagosSocios(
      (actual) => ({
        ...actual,
        [campo]: valor,
      })
    )
  }


  async function abrirConfigPagosSocios() {
    if (!esAdminPagos) {
      setError(
        'No tienes permisos para administrar los métodos de pago de los socios.'
      )
      return
    }

    setCargandoConfigPagosSocios(true)
    setError('')
    setMensaje('')

    try {
      const {
        data,
        error: errorConfig,
      } = await supabase.rpc(
        'obtener_config_pagos_admin'
      )

      if (errorConfig) {
        throw new Error(
          errorConfig.message
        )
      }

      setConfigPagosSocios({
        ...configPagosSociosInicial,
        ...(data || {}),
      })

      cerrarFormularios()
      setMostrarConfigPagosSocios(true)

    } catch (errorConfig) {
      setError(
        errorConfig.message
      )

    } finally {
      setCargandoConfigPagosSocios(false)
    }
  }


  function cerrarConfigPagosSocios() {
    setMostrarConfigPagosSocios(false)
    setError('')
  }


  async function guardarConfigPagosSocios(
    evento
  ) {
    evento.preventDefault()

    if (!esAdminPagos) {
      return
    }

    setGuardandoConfigPagosSocios(true)
    setError('')
    setMensaje('')

    try {
      const {
        error: errorGuardar,
      } = await supabase.rpc(
        'guardar_config_pagos_admin',
        {
          p_efectivo_activo:
            Boolean(
              configPagosSocios
                .efectivo_activo
            ),

          p_efectivo_mensaje:
            String(
              configPagosSocios
                .efectivo_mensaje || ''
            ).trim(),

          p_transferencia_activa:
            Boolean(
              configPagosSocios
                .transferencia_activa
            ),

          p_banco:
            String(
              configPagosSocios
                .banco || ''
            ).trim(),

          p_tipo_cuenta:
            configPagosSocios
              .tipo_cuenta ||
            'ahorros',

          p_numero_cuenta:
            String(
              configPagosSocios
                .numero_cuenta || ''
            ).trim(),

          p_titular_cuenta:
            String(
              configPagosSocios
                .titular_cuenta || ''
            ).trim(),

          p_identificacion_titular:
            String(
              configPagosSocios
                .identificacion_titular || ''
            ).trim(),

          p_transferencia_aviso_comprobante:
            String(
              configPagosSocios
                .transferencia_aviso_comprobante ||
              ''
            ).trim(),

          p_whatsapp_gym:
            String(
              configPagosSocios
                .whatsapp_gym || ''
            ).trim(),

          p_tarjeta_activa:
            Boolean(
              configPagosSocios
                .tarjeta_activa
            ),

          p_tarjeta_mensaje:
            String(
              configPagosSocios
                .tarjeta_mensaje || ''
            ).trim(),

          p_tarjeta_recargo_mensaje:
            String(
              configPagosSocios
                .tarjeta_recargo_mensaje ||
              ''
            ).trim(),

          p_tarjeta_solicitud_mensaje:
            String(
              configPagosSocios
                .tarjeta_solicitud_mensaje ||
              ''
            ).trim(),
        }
      )

      if (errorGuardar) {
        throw new Error(
          errorGuardar.message
        )
      }

      setMostrarConfigPagosSocios(false)

      setMensaje(
        'Métodos de pago para socios actualizados correctamente.'
      )

    } catch (errorGuardar) {
      setError(
        errorGuardar.message
      )

    } finally {
      setGuardandoConfigPagosSocios(false)
    }
  }


  function abrirNuevoPlan() {
    if (!esDueno) {
      setError('No tienes permisos para crear planes.')
      return
    }

    setFormPlan(planInicial)
    setEditandoPlanId(null)
    cerrarFormularios()
    setMostrarPlan(true)
    setError('')
    setMensaje('')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function editarPlan(plan) {
    if (!esDueno) {
      setError('No tienes permisos para editar planes.')
      return
    }

    setFormPlan({
      nombre: plan.nombre || '',
      descripcion: plan.descripcion || '',
      precio: String(plan.precio || ''),

      duracion_dias:
        plan.modalidad_vigencia ===
        'fecha_fija'
          ? ''
          : String(
              plan.duracion_dias ||
              ''
            ),

      activo:
        Boolean(plan.activo),

      es_promocion:
        Boolean(plan.es_promocion),

      modalidad_vigencia:
        plan.modalidad_vigencia ||
        'duracion',

      vigencia_desde:
        plan.vigencia_desde ||
        '',

      vigencia_hasta:
        plan.vigencia_hasta ||
        '',
    })

    setEditandoPlanId(plan.id)
    cerrarFormularios()
    setMostrarPlan(true)
    setError('')
    setMensaje('')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function limpiarPlan() {
    setFormPlan(planInicial)
    setEditandoPlanId(null)
    setMostrarPlan(false)
    setError('')
  }

  function abrirNuevaMembresia() {
    setFormMembresia({
      ...membresiaInicial,
      fecha_inicio: obtenerFechaHoy(),
      operacion_id: crearIdOperacion(),
      pagos: [crearPagoMembresia()],
    })

    cerrarFormularios()
    setMostrarMembresia(true)
    setError('')
    setMensaje('')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function esMembresiaMensualHistorica(membresia) {
    if (
      membresia
        .plan_modalidad_vigencia_snapshot ===
      'fecha_fija'
    ) {
      return false
    }

    const mesesSnapshot = Number(
      membresia.plan_duracion_meses_snapshot || 0
    )

    if (mesesSnapshot === 1) {
      return true
    }

    return (
      !membresia.plan_duracion_meses_snapshot &&
      Number(
        membresia.plan_duracion_dias_snapshot || 0
      ) === 30
    )
  }

  function prepararFormularioRenovacion(
    membresia,
    mantenerMismoPlan
  ) {
    const fechaInicio =
      calcularFechaInicioInteligente(
        membresia.miembro_id
      )

    const precioHistorico = Number(
      membresia.plan_precio_snapshot ??
      membresia.planes?.precio ??
      0
    )

    const nombreHistorico =
      membresia.plan_nombre_snapshot ||
      membresia.planes?.nombre ||
      'Plan registrado'

    setFormMembresia({
      ...membresiaInicial,

      miembro_id:
        membresia.miembro_id,

      plan_id:
        mantenerMismoPlan
          ? (
              membresia.plan_id ||
              ''
            )
          : '',

      fecha_inicio:
        fechaInicio,

      notas:
        mantenerMismoPlan
          ? `Renovación conservando ${nombreHistorico} por ${formatearDinero(precioHistorico)}.`
          : `Renovación con cambio de plan desde ${nombreHistorico}.`,

      renovacion_de_membresia_id:
        membresia.id,

      mantener_mismo_plan:
        Boolean(
          mantenerMismoPlan
        ),

      plan_historico_nombre:
        nombreHistorico,

      plan_historico_precio:
        precioHistorico,

      plan_historico_duracion_dias:
        membresia
          .plan_duracion_dias_snapshot ??
        null,

      plan_historico_duracion_meses:
        membresia
          .plan_duracion_meses_snapshot ??
        (
          Number(
            membresia
              .plan_duracion_dias_snapshot ||
            0
          ) === 30
            ? 1
            : null
        ),

      operacion_id:
        crearIdOperacion(),

      pagos: [
        crearPagoMembresia(
          mantenerMismoPlan
            ? precioHistorico
            : ''
        ),
      ],
    })

    setConfirmacionRenovacion(
      null
    )

    cerrarFormularios()

    setMostrarMembresia(
      true
    )

    setError('')

    if (mantenerMismoPlan) {

      setMensaje(
        `Se conservarán el plan y el precio histórico: ${nombreHistorico} · ${formatearDinero(precioHistorico)}.`
      )

    } else if (
      esMembresiaMensualHistorica(
        membresia
      )
    ) {

      setMensaje(
        `Selecciona uno de los planes activos actuales. No se conservará automáticamente ${nombreHistorico}.`
      )

    } else {

      setMensaje(
        `El plan anterior (${nombreHistorico}) no es mensual y no se renueva automáticamente. Selecciona un plan activo actual.`
      )
    }

    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    }, 100)
  }

  function renovarMembresia(
    membresia
  ) {
    setError('')
    setMensaje('')

    if (
      esMembresiaMensualHistorica(
        membresia
      )
    ) {

      cerrarFormularios()

      setConfirmacionRenovacion(
        membresia
      )

      return
    }

    prepararFormularioRenovacion(
      membresia,
      false
    )
  }

  function limpiarMembresia() {
    setFormMembresia({
      ...membresiaInicial,
      fecha_inicio: obtenerFechaHoy(),
      operacion_id: crearIdOperacion(),
      pagos: [crearPagoMembresia()],
    })

    setMostrarMembresia(false)
    setError('')
  }

  function abrirInscripcion() {
    setFormInscripcion(inscripcionInicial)
    cerrarFormularios()
    setMostrarInscripcion(true)
    setError('')
    setMensaje('')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function limpiarInscripcion() {
    setFormInscripcion(inscripcionInicial)
    setMostrarInscripcion(false)
    setError('')
  }

  function abrirUpgradeFidelizacion(membresia) {
    setMembresiaUpgradeSeleccionada(membresia)

    setFormUpgrade({
      miembro_id: membresia.miembro_id,
      metodo_pago: 'efectivo',
      monto: '20',
      notas: `Ampliación de ${obtenerNombrePlan(membresia)} a mensual fidelización.`,
      numero_comprobante: '',
      banco_origen: '',
      tipo_tarjeta: '',
    })

    cerrarFormularios()
    setMostrarUpgrade(true)
    setError('')
    setMensaje('Se cobrará únicamente el saldo restante de fidelización: $20.')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function limpiarUpgrade() {
    setFormUpgrade(upgradeInicial)
    setMembresiaUpgradeSeleccionada(null)
    setMostrarUpgrade(false)
    setError('')
  }

  function abrirEditarMembresia(membresia) {
    if (!esDueno) {
      setError('No tienes permisos para editar vigencias.')
      return
    }

    setMembresiaSeleccionada(membresia)
    setEditandoMembresiaId(membresia.id)

    setFormEditarMembresia({
      fecha_inicio: membresia.fecha_inicio || '',
    })

    cerrarFormularios()
    setMostrarEditarMembresia(true)
    setError('')
    setMensaje('')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function limpiarEdicionMembresia() {
    setFormEditarMembresia(edicionMembresiaInicial)
    setEditandoMembresiaId(null)
    setMembresiaSeleccionada(null)
    setMostrarEditarMembresia(false)
    setError('')
  }

  async function guardarPlan(evento) {
    evento.preventDefault()

    if (!esDueno) {
      setError('No tienes permisos para guardar planes.')
      return
    }

    setGuardandoPlan(true)
    setError('')
    setMensaje('')

    const esFechaFija =
      Boolean(
        formPlan.es_promocion
      ) &&
      formPlan.modalidad_vigencia ===
        'fecha_fija'

    const esPromoHistoricaDuracion =
      Boolean(
        formPlan.es_promocion
      ) &&
      formPlan.modalidad_vigencia ===
        'duracion' &&
      Boolean(editandoPlanId)

    const datos = {
      nombre:
        formPlan.nombre.trim(),

      descripcion:
        formPlan.descripcion.trim() ||
        null,

      precio:
        Number(formPlan.precio),

      duracion_dias:
        esFechaFija
          ? null
          : Number(
              formPlan.duracion_dias
            ),

      duracion_meses:
        esFechaFija
          ? null
          : inferirDuracionMeses(
              formPlan.duracion_dias
            ),

      activo:
        Boolean(formPlan.activo),

      es_promocion:
        Boolean(
          formPlan.es_promocion
        ),

      modalidad_vigencia:
        esFechaFija
          ? 'fecha_fija'
          : 'duracion',

      vigencia_desde:
        esFechaFija
          ? formPlan.vigencia_desde
          : null,

      vigencia_hasta:
        esFechaFija
          ? formPlan.vigencia_hasta
          : null,
    }

    if (
      formPlan.es_promocion &&
      !editandoPlanId &&
      !esFechaFija
    ) {
      setError(
        'Los nuevos planes promocionales deben configurarse mediante fecha inicial y fecha final.'
      )

      setGuardandoPlan(false)
      return
    }

    if (!datos.nombre) {
      setError('El nombre del plan es obligatorio.')
      setGuardandoPlan(false)
      return
    }

    if (!datos.precio || datos.precio <= 0) {
      setError('El precio del plan debe ser mayor a 0.')
      setGuardandoPlan(false)
      return
    }

    if (esFechaFija) {

      if (
        !formPlan.vigencia_desde ||
        !formPlan.vigencia_hasta
      ) {
        setError(
          'Debes seleccionar la fecha inicial y la fecha final de la promoción.'
        )

        setGuardandoPlan(false)
        return
      }

      if (
        formPlan.vigencia_hasta <
        formPlan.vigencia_desde
      ) {
        setError(
          'La fecha final de la promoción no puede ser anterior a la fecha inicial.'
        )

        setGuardandoPlan(false)
        return
      }

    } else if (
      !datos.duracion_dias ||
      datos.duracion_dias <= 0
    ) {

      setError(
        'La duración del plan debe ser mayor a 0 días.'
      )

      setGuardandoPlan(false)
      return
    }

    let respuesta

    if (editandoPlanId) {
      respuesta = await supabase
        .from('planes')
        .update(datos)
        .eq('id', editandoPlanId)
    } else {
      respuesta = await supabase
        .from('planes')
        .insert(datos)
    }

    if (respuesta.error) {
      setError(respuesta.error.message)
      setGuardandoPlan(false)
      return
    }

    await cargarDatos()
    limpiarPlan()
    setMensaje(editandoPlanId ? 'Plan actualizado correctamente.' : 'Plan registrado correctamente.')
    setGuardandoPlan(false)
  }

  async function guardarMembresia(evento) {
    evento.preventDefault()

    if (guardandoMembresia) return

    setGuardandoMembresia(true)
    setError('')
    setMensaje('')

    const esRenovacion = Boolean(
      formMembresia
        .renovacion_de_membresia_id
    )

    const mantenerMismoPlan =
      esRenovacion &&
      formMembresia
        .mantener_mismo_plan === true

    const plan = planes.find(
      (item) =>
        item.id ===
        formMembresia.plan_id
    )

    if (!formMembresia.miembro_id) {
      setError(
        'Debes seleccionar un miembro.'
      )

      setGuardandoMembresia(false)
      return
    }

    if (
      esRenovacion &&
      formMembresia
        .mantener_mismo_plan === null
    ) {

      setError(
        'Debes indicar si la renovación conserva el plan anterior o cambia de plan.'
      )

      setGuardandoMembresia(false)
      return
    }

    if (
      !mantenerMismoPlan &&
      !plan
    ) {

      setError(
        'Debes seleccionar un plan válido.'
      )

      setGuardandoMembresia(false)
      return
    }

    if (
      !mantenerMismoPlan &&
      (
        plan.es_upgrade ||
        plan.codigo ===
          'MENSUAL_FIDELIZACION'
      )
    ) {

      setError(
        'El mensual fidelización no se registra directamente. Usa el botón “Ampliar a mensual fidelización” desde un plan semanal fidelización vigente.'
      )

      setGuardandoMembresia(false)
      return
    }

    if (!formMembresia.fecha_inicio) {

      setError(
        'La fecha de inicio es obligatoria.'
      )

      setGuardandoMembresia(false)
      return
    }

    const precioObjetivo =
      mantenerMismoPlan
        ? Number(
            formMembresia
              .plan_historico_precio ||
            0
          )
        : Number(
            plan?.precio ||
            0
          )

    const errorPagos =
      validarPagosMembresia(
        formMembresia.pagos,
        precioObjetivo,
        esAdminPagos
      )

    if (errorPagos) {
      setError(errorPagos)
      setGuardandoMembresia(false)
      return
    }

    const operacionId = formMembresia.operacion_id || crearIdOperacion()

    if (!formMembresia.operacion_id) {
      setFormMembresia((actual) => ({
        ...actual,
        operacion_id: operacionId,
      }))
    }

    const pagosOperacion = formMembresia.pagos.map((pago) => ({
      metodo_pago: pago.metodo_pago,
      monto: Number(pago.monto),
      notas: String(pago.notas || '').trim() || null,
      numero_comprobante: String(pago.numero_comprobante || '').trim() || null,
      banco_origen: String(pago.banco_origen || '').trim() || null,
      tipo_tarjeta: pago.tipo_tarjeta || null,
    }))

    const respuestaRegistro =
      esRenovacion

        ? await supabase.rpc(
            'registrar_renovacion_con_pagos',
            {
              p_miembro_id:
                formMembresia.miembro_id,

              p_membresia_anterior_id:
                formMembresia
                  .renovacion_de_membresia_id,

              p_mantener_mismo_plan:
                mantenerMismoPlan,

              p_plan_nuevo_id:
                mantenerMismoPlan
                  ? null
                  : formMembresia.plan_id,

              p_pagos:
                pagosOperacion,

              p_notas:
                formMembresia.notas ||
                null,

              p_operacion_id:
                operacionId,
            }
          )

        : await supabase.rpc(
            'registrar_membresia_con_pagos',
            {
              p_miembro_id:
                formMembresia.miembro_id,

              p_plan_id:
                formMembresia.plan_id,

              p_pagos:
                pagosOperacion,

              p_fecha_inicio_manual:
                formMembresia.fecha_inicio,

              p_renovacion_de_membresia_id:
                null,

              p_notas:
                formMembresia.notas ||
                null,

              p_operacion_id:
                operacionId,
            }
          )

    const {
      error,
    } = respuestaRegistro

    if (error) {
      setError(error.message)
      setGuardandoMembresia(false)
      return
    }

    await cargarDatos()
    limpiarMembresia()
    setFiltroEstado('activa')
    setMensaje(
      esRenovacion
        ? 'Renovación y pagos registrados correctamente. La decisión quedó guardada en el historial.'
        : 'Membresía y pagos registrados correctamente.'
    )
    setGuardandoMembresia(false)
  }

  async function guardarInscripcion(evento) {
    evento.preventDefault()
    setGuardandoInscripcion(true)
    setError('')
    setMensaje('')

    if (!formInscripcion.miembro_id) {
      setError('Debes seleccionar un miembro.')
      setGuardandoInscripcion(false)
      return
    }

    const monto = Number(formInscripcion.monto)

    if (!monto || monto <= 0) {
      setError('El monto de inscripción debe ser mayor a 0.')
      setGuardandoInscripcion(false)
      return
    }

    const errorPago = validarDetallePago(formInscripcion)

    if (errorPago) {
      setError(errorPago)
      setGuardandoInscripcion(false)
      return
    }

    const { error } = await supabase.rpc('registrar_pago_inscripcion', {
      p_miembro_id: formInscripcion.miembro_id,
      p_metodo_pago: formInscripcion.metodo_pago,
      p_monto: monto,
      p_notas: formInscripcion.notas || null,
      p_numero_comprobante: formInscripcion.numero_comprobante || null,
      p_banco_origen: formInscripcion.banco_origen || null,
      p_tipo_tarjeta: formInscripcion.tipo_tarjeta || null,
    })

    if (error) {
      setError(error.message)
      setGuardandoInscripcion(false)
      return
    }

    await cargarDatos()
    limpiarInscripcion()
    setMensaje('Pago de inscripción registrado correctamente.')
    setGuardandoInscripcion(false)
  }

  async function guardarUpgradeFidelizacion(evento) {
    evento.preventDefault()
    setGuardandoUpgrade(true)
    setError('')
    setMensaje('')

    if (!formUpgrade.miembro_id || !membresiaUpgradeSeleccionada) {
      setError('No se encontró la membresía semanal a ampliar.')
      setGuardandoUpgrade(false)
      return
    }

    const monto = Number(formUpgrade.monto)

    if (!monto || monto <= 0) {
      setError('El monto de ampliación debe ser mayor a 0.')
      setGuardandoUpgrade(false)
      return
    }

    const errorPago = validarDetallePago(formUpgrade)

    if (errorPago) {
      setError(errorPago)
      setGuardandoUpgrade(false)
      return
    }

    const { error } = await supabase.rpc('ampliar_semanal_a_mensual_fidelizacion', {
      p_miembro_id: formUpgrade.miembro_id,
      p_metodo_pago: formUpgrade.metodo_pago,
      p_monto: monto,
      p_notas: formUpgrade.notas || null,
      p_numero_comprobante: formUpgrade.numero_comprobante || null,
      p_banco_origen: formUpgrade.banco_origen || null,
      p_tipo_tarjeta: formUpgrade.tipo_tarjeta || null,
    })

    if (error) {
      setError(error.message)
      setGuardandoUpgrade(false)
      return
    }

    await cargarDatos()
    limpiarUpgrade()
    setFiltroEstado('activa')
    setMensaje('Plan semanal ampliado correctamente a mensual fidelización.')
    setGuardandoUpgrade(false)
  }

  async function guardarEdicionMembresia(evento) {
    evento.preventDefault()

    if (!esDueno) {
      setError('No tienes permisos para editar vigencias.')
      return
    }

    if (!editandoMembresiaId || !membresiaSeleccionada) return

    setGuardandoEdicion(true)
    setError('')
    setMensaje('')

    if (!formEditarMembresia.fecha_inicio) {
      setError('La fecha de inicio es obligatoria.')
      setGuardandoEdicion(false)
      return
    }

    const duracionMeses =
      obtenerDuracionMesesParaCalculo(
        membresiaSeleccionada
      )

    const duracionDias =
      obtenerDuracionMembresia(
        membresiaSeleccionada
      )

    if (
      duracionMeses <= 0 &&
      duracionDias <= 0
    ) {
      setError(
        'No se pudo calcular la vigencia porque el plan no tiene duración válida.'
      )

      setGuardandoEdicion(
        false
      )

      return
    }

    const diaAncla =
      Number(
        String(
          formEditarMembresia.fecha_inicio
        ).slice(8, 10)
      )

    const fechaRenovacion =
      calcularFechaRenovacionDesdeMembresia(
        membresiaSeleccionada,
        formEditarMembresia.fecha_inicio
      )

    const datos = {
      fecha_inicio:
        formEditarMembresia.fecha_inicio,

      fecha_fin:
        sumarDias(
          fechaRenovacion,
          -1
        ),

      dia_ancla_renovacion:
        diaAncla,
    }

    if (
      duracionMeses > 0
    ) {
      datos.plan_duracion_meses_snapshot =
        duracionMeses
    }

    const { error } = await supabase
      .from('membresias')
      .update(datos)
      .eq('id', editandoMembresiaId)

    if (error) {
      setError(error.message)
      setGuardandoEdicion(false)
      return
    }

    await cargarDatos()
    limpiarEdicionMembresia()
    setFiltroEstado('activa')
    setMensaje('Fecha de inicio actualizada y vigencia recalculada correctamente.')
    setGuardandoEdicion(false)
  }

  async function suspenderMembresia(membresia) {
    if (!esDueno) {
      setError('No tienes permisos para suspender membresías.')
      return
    }

    const confirmar = window.confirm('¿Seguro que deseas suspender esta membresía?')

    if (!confirmar) return

    setError('')
    setMensaje('')

    const { error } = await supabase
      .from('membresias')
      .update({ estado: 'suspendida' })
      .eq('id', membresia.id)

    if (error) {
      setError(error.message)
      return
    }

    await cargarDatos()
    setMensaje('Membresía suspendida correctamente.')
  }

  async function activarMembresia(membresia) {
    if (!esDueno) {
      setError('No tienes permisos para activar membresías.')
      return
    }

    setError('')
    setMensaje('')

    const { error } = await supabase
      .from('membresias')
      .update({ estado: 'activa' })
      .eq('id', membresia.id)

    if (error) {
      setError(error.message)
      return
    }

    await cargarDatos()
    setMensaje('Membresía activada correctamente.')
  }

  async function eliminarMembresia(membresia) {
    if (!esDueno) {
      setError('No tienes permisos para eliminar membresías.')
      return
    }

    const nombre = obtenerNombreSocio(membresia)

    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar la membresía de ${nombre}?`
    )

    if (!confirmar) return

    setError('')
    setMensaje('')

    const { error } = await supabase
      .from('membresias')
      .delete()
      .eq('id', membresia.id)

    if (error) {
      setError(error.message)
      return
    }

    await cargarDatos()
    setMensaje('Membresía eliminada correctamente.')
  }

  function abrirDetalleVencida(
    membresia
  ) {
    if (
      membresia.estado_real !==
      'vencida'
    ) {
      return
    }

    setDetalleVencida(
      membresia
    )
  }

  function cerrarDetalleVencida() {
    setDetalleVencida(null)
  }

  function enviarMensajeVencida(
    tipo
  ) {
    if (!detalleVencida) {
      return
    }

    const telefono =
      detalleVencida.miembros
        ?.telefono

    const mensajeWhatsApp =
      tipo === 'recuperacion'
        ? crearMensajeRecuperacion(
            detalleVencida
          )
        : crearMensajeRenovacion(
            detalleVencida
          )

    abrirWhatsAppMembresia(
      telefono,
      mensajeWhatsApp
    )
  }

  async function cargarHistorialPagosMembresia(membresiaId) {
    const idsPagos = pagos
      .filter((pago) => pago.membresia_id === membresiaId)
      .map((pago) => pago.id)

    if (idsPagos.length === 0) {
      setHistorialPagos([])
      return
    }

    const { data, error: errorHistorial } = await supabase
      .from('pagos_historial')
      .select('id, pago_id, accion, datos_anteriores, datos_nuevos, motivo, realizado_por, fecha_evento')
      .in('pago_id', idsPagos)
      .order('fecha_evento', { ascending: false })

    if (errorHistorial) {
      throw new Error(errorHistorial.message)
    }

    setHistorialPagos(data || [])
  }

  async function cargarHistorialRenovacionesMiembro(
    miembroId
  ) {
    setCargandoHistorialRenovaciones(
      true
    )

    const {
      data,
      error: errorHistorial,
    } = await supabase
      .from(
        'membresias_renovacion_historial'
      )
      .select(`
        id,
        miembro_id,
        membresia_anterior_id,
        membresia_nueva_id,
        decision,
        plan_anterior_nombre,
        plan_anterior_precio,
        plan_nuevo_nombre,
        plan_nuevo_precio,
        fecha_inicio_anterior,
        fecha_fin_anterior,
        fecha_inicio_nueva,
        fecha_fin_nueva,
        motivo,
        realizado_por,
        fecha_evento
      `)
      .eq(
        'miembro_id',
        miembroId
      )
      .order(
        'fecha_evento',
        {
          ascending: false,
        }
      )

    setCargandoHistorialRenovaciones(
      false
    )

    if (errorHistorial) {
      throw new Error(
        errorHistorial.message
      )
    }

    setHistorialRenovaciones(
      data || []
    )
  }

  async function abrirHistorialPagos(membresia) {
    if (!esAdminPagos) {
      setError('Solo dueño o administrador puede consultar el historial de pagos.')
      return
    }

    setDetallePagos(membresia)
    setHistorialPagos([])
    setHistorialRenovaciones([])
    setPagoCorreccion(null)
    setCargandoHistorialPagos(true)
    setError('')

    try {

      await Promise.all([
        cargarHistorialPagosMembresia(
          membresia.id
        ),

        cargarHistorialRenovacionesMiembro(
          membresia.miembro_id
        ),
      ])

    } catch (errorHistorial) {

      setError(
        errorHistorial.message
      )

    } finally {

      setCargandoHistorialPagos(
        false
      )

      setCargandoHistorialRenovaciones(
        false
      )
    }
  }

  function cerrarHistorialPagos() {
    setDetallePagos(null)
    setHistorialPagos([])
    setHistorialRenovaciones([])
    setPagoCorreccion(null)
    setGuardandoCorreccionPago(false)
  }

  function iniciarCorreccionPago(pago) {
    setPagoCorreccion(pago)
    setFormCorreccionPago({
      metodo_pago: pago.metodo_pago || 'efectivo',
      notas: pago.notas || '',
      numero_comprobante: pago.numero_comprobante || '',
      banco_origen: pago.banco_origen || '',
      tipo_tarjeta: pago.tipo_tarjeta || '',
      motivo: '',
    })
  }

  function actualizarCorreccionPago(campo, valor) {
    setFormCorreccionPago((actual) =>
      ajustarDetallePagoPorMetodo(
        {
          ...actual,
          [campo]: valor,
        },
        campo,
        valor
      )
    )
  }

  async function guardarCorreccionPago(evento) {
    evento.preventDefault()

    if (!esAdminPagos || !pagoCorreccion || !detallePagos) return
    if (guardandoCorreccionPago) return

    const errorDetalle = validarDetallePago(formCorreccionPago)

    if (errorDetalle) {
      setError(errorDetalle)
      return
    }

    if (
      formCorreccionPago.metodo_pago === 'canje' &&
      !String(formCorreccionPago.notas || '').trim()
    ) {
      setError('Para un canje debes indicar el motivo o servicio asociado.')
      return
    }

    if (!String(formCorreccionPago.motivo || '').trim()) {
      setError('Debes indicar por qué se corrige este pago.')
      return
    }

    setGuardandoCorreccionPago(true)
    setError('')

    const { error: errorCorreccion } = await supabase.rpc('corregir_pago_mak', {
      p_pago_id: pagoCorreccion.id,
      p_metodo_pago: formCorreccionPago.metodo_pago,
      p_monto: Number(pagoCorreccion.monto),
      p_notas: String(formCorreccionPago.notas || '').trim() || null,
      p_numero_comprobante: String(formCorreccionPago.numero_comprobante || '').trim() || null,
      p_banco_origen: String(formCorreccionPago.banco_origen || '').trim() || null,
      p_tipo_tarjeta: formCorreccionPago.tipo_tarjeta || null,
      p_motivo: formCorreccionPago.motivo.trim(),
    })

    if (errorCorreccion) {
      setError(errorCorreccion.message)
      setGuardandoCorreccionPago(false)
      return
    }

    const { data: pagoActualizado, error: errorPagoActualizado } = await supabase
      .from('pagos')
      .select('*')
      .eq('id', pagoCorreccion.id)
      .single()

    if (errorPagoActualizado) {
      setError(errorPagoActualizado.message)
      setGuardandoCorreccionPago(false)
      return
    }

    setPagos((actuales) =>
      actuales.map((pago) =>
        pago.id === pagoActualizado.id ? pagoActualizado : pago
      )
    )

    setPagoCorreccion(null)
    setFormCorreccionPago({
      metodo_pago: 'efectivo',
      notas: '',
      numero_comprobante: '',
      banco_origen: '',
      tipo_tarjeta: '',
      motivo: '',
    })

    try {
      await cargarHistorialPagosMembresia(detallePagos.id)
    } catch (errorHistorial) {
      setError(errorHistorial.message)
    }

    setMensaje('Pago corregido. El valor anterior quedó guardado en el historial.')
    setGuardandoCorreccionPago(false)
  }

  const membresiasConEstadoReal = useMemo(() => {
    const hoy = obtenerFechaHoy()

    return membresias.map((membresia) => {
      if (membresia.estado === 'suspendida') {
        return {
          ...membresia,
          estado_real: 'suspendida',
          dias_restantes: null,
          texto_vigencia: 'Suspendida manualmente',
        }
      }

      if (membresia.fecha_inicio > hoy) {
        const diasInicio = diferenciaDias(hoy, membresia.fecha_inicio)

        return {
          ...membresia,
          estado_real: 'futura',
          dias_restantes: diasInicio,
          texto_vigencia: `Inicia en ${diasInicio} día${diasInicio === 1 ? '' : 's'}`,
        }
      }

      const fechaRenovacion =
        obtenerFechaRenovacionMembresia(
          membresia
        )

      const dias =
        diferenciaDias(
          hoy,
          fechaRenovacion
        )

      if (dias <= 0) {
        return {
          ...membresia,
          estado_real: 'vencida',
          dias_restantes: dias,
          texto_vigencia:
            dias === 0
              ? 'Renovación pendiente hoy'
              : `Sin renovar hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`,
        }
      }

      if (dias === 1) {
        return {
          ...membresia,
          estado_real: 'vence_hoy',
          dias_restantes: dias,
          texto_vigencia: 'Renueva mañana',
        }
      }

      if (dias <= 7) {
        return {
          ...membresia,
          estado_real: 'por_caducar',
          dias_restantes: dias,
          texto_vigencia: `Renueva en ${dias} días`,
        }
      }

      return {
        ...membresia,
        estado_real: 'activa',
        dias_restantes: dias,
        texto_vigencia: `Renueva en ${dias} días`,
      }
    })
  }, [membresias])

  const idsSociosConMembresiaActualOFutura = useMemo(() => {
    return new Set(
      membresiasConEstadoReal
        .filter((membresia) =>
          ['activa', 'por_caducar', 'vence_hoy', 'futura'].includes(
            membresia.estado_real
          )
        )
        .map((membresia) => membresia.miembro_id)
    )
  }, [membresiasConEstadoReal])

  const ultimaMembresiaVencidaPorSocio = useMemo(() => {
    const mapa = new Map()

    membresiasConEstadoReal.forEach((membresia) => {
      if (membresia.estado_real !== 'vencida') return

      const actual = mapa.get(membresia.miembro_id)

      if (
        !actual ||
        String(membresia.fecha_fin).localeCompare(String(actual.fecha_fin)) > 0
      ) {
        mapa.set(membresia.miembro_id, membresia)
      }
    })

    return mapa
  }, [membresiasConEstadoReal])

  const mesesDisponiblesVencidas = useMemo(() => {
    const meses = new Set([
      obtenerMesActual(),
    ])

    Array.from(
      ultimaMembresiaVencidaPorSocio.values()
    ).forEach((membresia) => {
      if (
        idsSociosConMembresiaActualOFutura.has(
          membresia.miembro_id
        )
      ) {
        return
      }

      const fechaRenovacion = String(
        obtenerFechaRenovacionMembresia(
          membresia
        ) || ''
      )

      if (
        fechaRenovacion.length >= 7
      ) {
        meses.add(
          fechaRenovacion.slice(
            0,
            7
          )
        )
      }
    })

    return Array.from(meses).sort(
      (a, b) => b.localeCompare(a)
    )
  }, [
    ultimaMembresiaVencidaPorSocio,
    idsSociosConMembresiaActualOFutura,
  ])

  const membresiasFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()

    return membresiasConEstadoReal.filter((membresia) => {
      const miembro = membresia.miembros || {}
      const plan = membresia.planes || {}

      let coincideEstado = true

      if (filtroEstado === 'activa') {
        coincideEstado = ['activa', 'por_caducar', 'vence_hoy'].includes(
          membresia.estado_real
        )
      } else if (filtroEstado === 'vencida') {
        const ultimaVencida =
          ultimaMembresiaVencidaPorSocio.get(
            membresia.miembro_id
          )

        const coincideMes =
          filtroMesVencidas === 'todas' ||
          String(
            obtenerFechaRenovacionMembresia(
              membresia
            ) || ''
          ).startsWith(
            filtroMesVencidas
          )

        coincideEstado =
          membresia.estado_real === 'vencida' &&
          !idsSociosConMembresiaActualOFutura.has(
            membresia.miembro_id
          ) &&
          ultimaVencida?.id === membresia.id &&
          coincideMes
      } else if (filtroEstado === 'todas') {
        coincideEstado = true
      } else {
        coincideEstado = membresia.estado_real === filtroEstado
      }

      const valores = [
        miembro.nombre,
        miembro.apellido,
        miembro.cedula,
        miembro.codigo_acceso,
        miembro.telefono,
        plan.nombre,
        plan.codigo,
        membresia.plan_nombre_snapshot,
        membresia.estado_real,
        membresia.texto_vigencia,
      ]

      const coincideBusqueda = texto
        ? valores.some((valor) =>
            String(valor || '')
              .toLowerCase()
              .includes(texto)
          )
        : true

      return coincideEstado && coincideBusqueda
    })
  }, [
    membresiasConEstadoReal,
    busqueda,
    filtroEstado,
    filtroMesVencidas,
    idsSociosConMembresiaActualOFutura,
    ultimaMembresiaVencidaPorSocio,
  ])

  // MAK_MEMBRESIAS_PAGINACION_PRECIO_V1
  const membresiasOrdenadas = useMemo(() => {
    const listado = [...membresiasFiltradas]

    if (filtroEstado === 'activa') {
      listado.sort((a, b) => {
        const precioA = Number(a.plan_precio_snapshot || a.planes?.precio || 0)
        const precioB = Number(b.plan_precio_snapshot || b.planes?.precio || 0)
        const diferencia = precioB - precioA

        if (diferencia !== 0) return diferencia

        const nombreA = `${a.miembros?.nombre || ''} ${a.miembros?.apellido || ''}`
        const nombreB = `${b.miembros?.nombre || ''} ${b.miembros?.apellido || ''}`

        return nombreA.localeCompare(nombreB, 'es')
      })
    }

    return listado
  }, [membresiasFiltradas, filtroEstado])

  const totalPaginasMembresias = Math.max(
    1,
    Math.ceil(membresiasOrdenadas.length / 10)
  )

  const paginaMembresiasVisible = Math.min(
    paginaMembresias,
    totalPaginasMembresias
  )

  const membresiasPaginadas = useMemo(() => {
    const inicio = (paginaMembresiasVisible - 1) * 10

    return membresiasOrdenadas.slice(inicio, inicio + 10)
  }, [membresiasOrdenadas, paginaMembresiasVisible])

  const paginasVisiblesMembresias = Array.from(
    { length: totalPaginasMembresias },
    (_, indice) => indice + 1
  ).filter((pagina) =>
    pagina === 1 ||
    pagina === totalPaginasMembresias ||
    Math.abs(pagina - paginaMembresiasVisible) <= 1
  )

  useEffect(() => {
    setPaginaMembresias(1)
  }, [filtroEstado, busqueda, filtroMesVencidas])

  const miembrosActivos = miembros.filter(
    (miembro) => miembro.estado === 'activo'
  )

  const planesActivos = planes.filter((plan) => plan.activo)

  const planesDisponiblesVenta = planesActivos.filter((plan) => {
    return (
      !plan.es_upgrade &&
      plan.codigo !==
        'MENSUAL_FIDELIZACION' &&
      planDisponibleParaVenta(plan)
    )
  })

  const planesVisibles = useMemo(() => {
    if (!esDueno) {
      return planes.filter((plan) => {
        return (
          plan.activo &&
          !plan.es_upgrade &&
          plan.codigo !== 'MENSUAL_FIDELIZACION'
        )
      })
    }

    if (pestanaPlanes === 'activos') {
      return planes.filter((plan) => plan.activo && !plan.es_promocion)
    }

    if (pestanaPlanes === 'inactivos') {
      return planes.filter((plan) => !plan.activo && !plan.es_promocion)
    }

    if (pestanaPlanes === 'promos') {
      return planes.filter((plan) => plan.es_promocion)
    }

    return planes
  }, [planes, esDueno, pestanaPlanes])

  const totalPagos = pagos.reduce(
    (total, pago) => total + Number(pago.monto || 0),
    0
  )

  const membresiasVigentes = membresiasConEstadoReal.filter((item) =>
    ['activa', 'por_caducar', 'vence_hoy'].includes(item.estado_real)
  ).length

  const membresiasPorCaducar = membresiasConEstadoReal.filter(
    (item) =>
      item.estado_real === 'por_caducar' ||
      item.estado_real === 'vence_hoy'
  ).length

  const membresiasFuturas = membresiasConEstadoReal.filter(
    (item) => item.estado_real === 'futura'
  ).length

  const membresiasVencidas = Array.from(
    ultimaMembresiaVencidaPorSocio.values()
  ).filter(
    (item) =>
      !idsSociosConMembresiaActualOFutura.has(item.miembro_id)
  ).length

  const membresiasVencidasPeriodo = Array.from(
    ultimaMembresiaVencidaPorSocio.values()
  ).filter(
    (item) =>
      !idsSociosConMembresiaActualOFutura.has(
        item.miembro_id
      ) &&
      (
        filtroMesVencidas === 'todas' ||
        String(
          obtenerFechaRenovacionMembresia(
            item
          ) || ''
        ).startsWith(
          filtroMesVencidas
        )
      )
  ).length

  const membresiasSuspendidas = membresiasConEstadoReal.filter(
    (item) => item.estado_real === 'suspendida'
  ).length

  const membresiaActivaSocioSeleccionado = membresiasConEstadoReal.find((membresia) => {
    return (
      membresia.miembro_id === formMembresia.miembro_id &&
      ['activa', 'por_caducar', 'vence_hoy'].includes(membresia.estado_real)
    )
  })

  function obtenerPagosMembresia(membresiaId) {
    return pagos.filter((pago) => pago.membresia_id === membresiaId)
  }

  function obtenerTotalPagadoMembresia(membresiaId) {
    return obtenerPagosMembresia(membresiaId).reduce(
      (total, pago) => total + Number(pago.monto || 0),
      0
    )
  }

  function obtenerUltimoPagoMembresia(membresiaId) {
    return obtenerPagosMembresia(membresiaId)[0] || null
  }

  function puedeAmpliarFidelizacion(membresia) {
    const codigo = membresia.planes?.codigo || ''
    const nombre = `${membresia.plan_nombre_snapshot || ''} ${membresia.planes?.nombre || ''}`.toLowerCase()

    const esSemanalFidelizacion =
      codigo === 'SEMANAL_FIDELIZACION' ||
      (nombre.includes('semanal') && nombre.includes('fidel'))

    return (
      esSemanalFidelizacion &&
      ['activa', 'por_caducar', 'vence_hoy'].includes(membresia.estado_real)
    )
  }


  const esRenovacionFormulario =
    Boolean(
      formMembresia
        .renovacion_de_membresia_id
    )

  const mantienePlanHistoricoFormulario =
    esRenovacionFormulario &&
    formMembresia
      .mantener_mismo_plan === true

  const planActualFormulario =
    planes.find(
      (plan) =>
        plan.id ===
        formMembresia.plan_id
    )

  const precioFormularioMembresia =
    mantienePlanHistoricoFormulario
      ? Number(
          formMembresia
            .plan_historico_precio ||
          0
        )
      : Number(
          planActualFormulario
            ?.precio ||
          0
        )

  const planCalculoFormulario =
    mantienePlanHistoricoFormulario

      ? {
          duracion_dias:
            formMembresia
              .plan_historico_duracion_dias,

          duracion_meses:
            formMembresia
              .plan_historico_duracion_meses,
        }

      : planActualFormulario

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Membresías y pagos
          </h1>
          <p className="mt-2 text-sm text-gray-600 md:text-base">
            Administra planes, renovaciones inteligentes, inscripción, fidelización y pagos.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {esDueno && (
            <button
              onClick={abrirNuevoPlan}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              <PackageCheck size={18} />
              Nuevo plan
            </button>
          )}

          <button
            onClick={abrirInscripcion}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            <BadgeDollarSign size={18} />
            Inscripción
          </button>

          {esAdminPagos && (
            <button
              type="button"
              onClick={
                abrirConfigPagosSocios
              }
              disabled={
                cargandoConfigPagosSocios
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CreditCard size={18} />

              {cargandoConfigPagosSocios
                ? 'Cargando...'
                : 'Pagos socios'}
            </button>
          )}

          <button
            onClick={abrirNuevaMembresia}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <Plus size={18} />
            Nueva membresía
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {mensaje}
        </div>
      )}

      {detalleVencida && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={
            cerrarDetalleVencida
          }
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Membresía caducada
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {obtenerNombreSocio(
                    detalleVencida
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  cerrarDetalleVencida
                }
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Código
                </p>
                <p className="mt-1 font-bold text-gray-900">
                  {detalleVencida.miembros
                    ?.codigo_acceso ||
                    '-'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  WhatsApp
                </p>
                <p className="mt-1 font-bold text-gray-900">
                  {detalleVencida.miembros
                    ?.telefono ||
                    'Sin teléfono'}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Último plan
                </p>
                <p className="mt-1 font-bold text-gray-900">
                  {obtenerNombrePlan(
                    detalleVencida
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Inicio
                </p>
                <p className="mt-1 font-bold text-gray-900">
                  {formatearFecha(
                    detalleVencida.fecha_inicio
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Debió renovar
                </p>
                <p className="mt-1 font-bold text-gray-900">
                  {formatearFecha(
                    obtenerFechaRenovacionMembresia(
                      detalleVencida
                    )
                  )}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Estado
                </p>
                <p className="mt-1 font-bold text-red-700">
                  {detalleVencida.texto_vigencia}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-sm text-gray-600">
                Elige el mensaje que deseas enviar al socio:
              </p>

              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    enviarMensajeVencida(
                      'renovacion'
                    )
                  }
                  disabled={
                    !normalizarTelefonoWhatsAppMembresia(
                      detalleVencida
                        .miembros
                        ?.telefono
                    )
                  }
                  className="rounded-xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Enviar mensaje renovación
                </button>

                <button
                  type="button"
                  onClick={() =>
                    enviarMensajeVencida(
                      'recuperacion'
                    )
                  }
                  disabled={
                    !normalizarTelefonoWhatsAppMembresia(
                      detalleVencida
                        .miembros
                        ?.telefono
                    )
                  }
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Mensaje recuperación cliente
                </button>
              </div>

              {!normalizarTelefonoWhatsAppMembresia(
                detalleVencida.miembros
                  ?.telefono
              ) && (
                <p className="mt-3 text-xs font-semibold text-red-600">
                  El socio no tiene un número de WhatsApp válido registrado.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmacionRenovacion && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() =>
            setConfirmacionRenovacion(
              null
            )
          }
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Confirmar renovación
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {obtenerNombreSocio(
                    confirmacionRenovacion
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setConfirmacionRenovacion(
                    null
                  )
                }
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
              >
                <X size={19} />
              </button>

            </div>

            <div className="mt-5 rounded-2xl border border-teal-200 bg-teal-50 p-4">

              <p className="text-sm font-semibold text-gray-700">
                Este socio tiene un plan mensual registrado anteriormente:
              </p>

              <p className="mt-2 text-lg font-bold text-gray-900">
                {obtenerNombrePlan(
                  confirmacionRenovacion
                )}
              </p>

              <p className="mt-1 text-sm text-gray-700">
                Precio histórico:{' '}

                <strong>
                  {formatearDinero(
                    confirmacionRenovacion
                      .plan_precio_snapshot ??
                    confirmacionRenovacion
                      .planes?.precio ??
                    0
                  )}
                </strong>
              </p>

            </div>

            <p className="mt-5 text-sm font-semibold text-gray-800">
              ¿Deseas renovar manteniendo el mismo plan y el mismo precio registrado anteriormente?
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">

              <button
                type="button"
                onClick={() =>
                  prepararFormularioRenovacion(
                    confirmacionRenovacion,
                    true
                  )
                }
                className="rounded-xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
              >
                Sí, mantener plan y precio
              </button>

              <button
                type="button"
                onClick={() =>
                  prepararFormularioRenovacion(
                    confirmacionRenovacion,
                    false
                  )
                }
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-800 transition hover:bg-gray-50"
              >
                No, elegir otro plan
              </button>

            </div>

          </div>
        </div>
      )}

      {detallePagos && esAdminPagos && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={cerrarHistorialPagos}
        >
          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Historial de membresía
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {obtenerNombreSocio(detallePagos)} · {obtenerNombrePlan(detallePagos)}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarHistorialPagos}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-bold text-gray-900">Pagos registrados</h3>

              <div className="mt-3 space-y-3">
                {obtenerPagosMembresia(detallePagos.id).map((pago) => (
                  <div
                    key={pago.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-bold text-gray-900">
                          {formatearDinero(pago.monto)} · <span className="capitalize">{pago.metodo_pago}</span>
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleString('es-EC', {
                            timeZone: 'America/Guayaquil',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }) : '-'}
                        </p>
                        <p className="mt-2 text-sm text-gray-600">
                          {obtenerDetallePago(pago)}
                        </p>
                        {pago.notas && (
                          <p className="mt-1 text-sm text-gray-600">
                            Nota: {pago.notas}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => iniciarCorreccionPago(pago)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        Corregir método
                      </button>
                    </div>
                  </div>
                ))}

                {obtenerPagosMembresia(detallePagos.id).length === 0 && (
                  <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                    Esta membresía no tiene pagos asociados.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-5">

              <h3 className="text-sm font-bold text-gray-900">
                Historial de renovaciones
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Registra si se conservó el plan/precio anterior o si se cambió a otro plan.
              </p>

              {cargandoHistorialRenovaciones ? (

                <p className="mt-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  Cargando historial de renovaciones...
                </p>

              ) : historialRenovaciones.length === 0 ? (

                <p className="mt-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  Todavía no existen decisiones de renovación registradas con el nuevo historial.
                </p>

              ) : (

                <div className="mt-3 space-y-3">

                  {historialRenovaciones.map(
                    (evento) => (

                      <div
                        key={evento.id}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                      >

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                          <div>

                            <p className="text-sm font-bold text-gray-900">

                              {evento.decision ===
                              'mismo_plan'

                                ? 'Mismo plan y precio histórico'

                                : evento.decision ===
                                  'promo_finalizada_cambio_plan'

                                  ? 'Promoción finalizada · cambio de plan'

                                  : 'Cambio de plan'}

                            </p>

                            <p className="mt-1 text-sm text-gray-700">

                              {evento.plan_anterior_nombre ||
                                'Plan anterior'}

                              {' ('}

                              {formatearDinero(
                                evento.plan_anterior_precio ||
                                0
                              )}

                              {') → '}

                              {evento.plan_nuevo_nombre ||
                                'Plan nuevo'}

                              {' ('}

                              {formatearDinero(
                                evento.plan_nuevo_precio ||
                                0
                              )}

                              {')'}

                            </p>

                            <p className="mt-1 text-xs text-gray-500">

                              Nueva vigencia:{' '}

                              {formatearFecha(
                                evento.fecha_inicio_nueva
                              )}

                              {' → '}

                              {formatearFecha(
                                evento.fecha_fin_nueva
                              )}

                            </p>

                            {evento.motivo && (

                              <p className="mt-2 text-xs text-gray-600">
                                {evento.motivo}
                              </p>

                            )}

                          </div>

                          <p className="text-xs text-gray-500">

                            {evento.fecha_evento

                              ? new Date(
                                  evento.fecha_evento
                                ).toLocaleString(
                                  'es-EC',
                                  {
                                    timeZone:
                                      'America/Guayaquil',

                                    day:
                                      '2-digit',

                                    month:
                                      '2-digit',

                                    year:
                                      'numeric',

                                    hour:
                                      '2-digit',

                                    minute:
                                      '2-digit',
                                  }
                                )

                              : '-'}

                          </p>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

            {pagoCorreccion && (
              <form
                onSubmit={guardarCorreccionPago}
                className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900">Corregir pago</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      El monto se mantiene en {formatearDinero(pagoCorreccion.monto)}. Solo se corrigen los datos del medio de pago.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPagoCorreccion(null)}
                    className="rounded-lg p-2 text-gray-500 transition hover:bg-white"
                  >
                    <X size={17} />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Método correcto
                    </label>
                    <select
                      value={formCorreccionPago.metodo_pago}
                      onChange={(e) => actualizarCorreccionPago('metodo_pago', e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="canje">Canje</option>
                    </select>
                  </div>

                  {formCorreccionPago.metodo_pago === 'transferencia' && (
                    <>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Comprobante
                        </label>
                        <input
                          value={formCorreccionPago.numero_comprobante}
                          onChange={(e) => actualizarCorreccionPago('numero_comprobante', e.target.value)}
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Banco de origen
                        </label>
                        <input
                          value={formCorreccionPago.banco_origen}
                          onChange={(e) => actualizarCorreccionPago('banco_origen', e.target.value)}
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                        />
                      </div>
                    </>
                  )}

                  {formCorreccionPago.metodo_pago === 'tarjeta' && (
                    <>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Tipo de tarjeta
                        </label>
                        <select
                          value={formCorreccionPago.tipo_tarjeta}
                          onChange={(e) => actualizarCorreccionPago('tipo_tarjeta', e.target.value)}
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                        >
                          <option value="">Seleccionar tarjeta</option>
                          {tiposTarjeta.map((tarjeta) => (
                            <option key={tarjeta.value} value={tarjeta.value}>
                              {tarjeta.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Comprobante
                        </label>
                        <input
                          value={formCorreccionPago.numero_comprobante}
                          onChange={(e) => actualizarCorreccionPago('numero_comprobante', e.target.value)}
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                        />
                      </div>
                    </>
                  )}

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Nota del pago
                    </label>
                    <textarea
                      value={formCorreccionPago.notas}
                      onChange={(e) => actualizarCorreccionPago('notas', e.target.value)}
                      className="min-h-20 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                      placeholder={formCorreccionPago.metodo_pago === 'canje' ? 'Describe el canje' : 'Opcional'}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Motivo de la corrección *
                    </label>
                    <textarea
                      value={formCorreccionPago.motivo}
                      onChange={(e) => actualizarCorreccionPago('motivo', e.target.value)}
                      className="min-h-20 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                      placeholder="Ej: Se registró efectivo por error; el cliente pagó por transferencia."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={guardandoCorreccionPago}
                  className="mt-4 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardandoCorreccionPago ? 'Guardando...' : 'Guardar corrección'}
                </button>
              </form>
            )}

            <div className="mt-6 border-t border-gray-200 pt-5">
              <h3 className="text-sm font-bold text-gray-900">Auditoría</h3>

              {cargandoHistorialPagos ? (
                <p className="mt-3 text-sm text-gray-500">Cargando historial...</p>
              ) : historialPagos.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">Sin cambios históricos registrados.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {historialPagos.map((evento) => {
                    const datos = evento.datos_nuevos || evento.datos_anteriores || {}

                    return (
                      <div
                        key={evento.id}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm"
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-bold text-gray-900">
                            {evento.accion} · {formatearDinero(datos.monto || 0)} · <span className="capitalize">{datos.metodo_pago || '-'}</span>
                          </p>
                          <p className="text-xs text-gray-500">
                            {evento.fecha_evento ? new Date(evento.fecha_evento).toLocaleString('es-EC', {
                              timeZone: 'America/Guayaquil',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }) : '-'}
                          </p>
                        </div>

                        {evento.motivo && (
                          <p className="mt-1 text-xs text-gray-600">
                            {evento.motivo}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAK_RESUMEN_MEMBRESIAS_SOLO_ADMIN */}
      {perfil?.rol !== 'empleado' && (
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs text-gray-500 md:text-sm">Vigentes</p>
          <h2 className="mt-2 text-2xl font-bold text-green-700 md:text-3xl">
            {cargando ? '-' : membresiasVigentes}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs text-gray-500 md:text-sm">Por caducar</p>
          <h2 className="mt-2 text-2xl font-bold text-orange-700 md:text-3xl">
            {cargando ? '-' : membresiasPorCaducar}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs text-gray-500 md:text-sm">Futuras</p>
          <h2 className="mt-2 text-2xl font-bold text-blue-700 md:text-3xl">
            {cargando ? '-' : membresiasFuturas}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs text-gray-500 md:text-sm">Vencidas</p>
          <h2 className="mt-2 text-2xl font-bold text-red-700 md:text-3xl">
            {cargando ? '-' : membresiasVencidas}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs text-gray-500 md:text-sm">Suspendidas</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">
            {cargando ? '-' : membresiasSuspendidas}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs text-gray-500 md:text-sm">Pagos</p>
          <h2 className="mt-2 text-xl font-bold text-gray-900 md:text-2xl">
            {cargando ? '-' : formatearDinero(totalPagos)}
          </h2>
        </div>
      </div>
      )}

      {esAdminPagos &&
        mostrarConfigPagosSocios && (

        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          onClick={
            cerrarConfigPagosSocios
          }
        >

          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl md:p-6"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="flex items-start justify-between gap-4">

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Configurar pagos de socios
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Define los métodos de pago que aparecerán en MAK Socios.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  cerrarConfigPagosSocios
                }
                className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <X size={20} />
              </button>

            </div>


            <form
              onSubmit={
                guardarConfigPagosSocios
              }
              className="mt-6 space-y-5"
            >

              <section className="rounded-2xl border border-gray-200 p-4">

                <label className="flex cursor-pointer items-center justify-between gap-4">

                  <div>
                    <p className="font-bold text-gray-900">
                      Efectivo
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Pago directamente en recepción.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      Boolean(
                        configPagosSocios
                          .efectivo_activo
                      )
                    }
                    onChange={(e) =>
                      actualizarConfigPagosSocios(
                        'efectivo_activo',
                        e.target.checked
                      )
                    }
                    className="h-5 w-5"
                  />

                </label>


                {configPagosSocios
                  .efectivo_activo && (

                  <div className="mt-4">

                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Mensaje para el socio
                    </label>

                    <textarea
                      rows={2}
                      value={
                        configPagosSocios
                          .efectivo_mensaje
                      }
                      onChange={(e) =>
                        actualizarConfigPagosSocios(
                          'efectivo_mensaje',
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    />

                  </div>
                )}

              </section>


              <section className="rounded-2xl border border-gray-200 p-4">

                <label className="flex cursor-pointer items-center justify-between gap-4">

                  <div>
                    <p className="font-bold text-gray-900">
                      Transferencia bancaria
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Muestra tus datos bancarios en MAK Socios.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      Boolean(
                        configPagosSocios
                          .transferencia_activa
                      )
                    }
                    onChange={(e) =>
                      actualizarConfigPagosSocios(
                        'transferencia_activa',
                        e.target.checked
                      )
                    }
                    className="h-5 w-5"
                  />

                </label>


                {configPagosSocios
                  .transferencia_activa && (

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Banco
                      </label>

                      <input
                        value={
                          configPagosSocios
                            .banco
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'banco',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                        placeholder="Ej: Banco Pichincha"
                      />
                    </div>


                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Tipo de cuenta
                      </label>

                      <select
                        value={
                          configPagosSocios
                            .tipo_cuenta
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'tipo_cuenta',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      >
                        <option value="ahorros">
                          Ahorros
                        </option>

                        <option value="corriente">
                          Corriente
                        </option>
                      </select>
                    </div>


                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Número de cuenta
                      </label>

                      <input
                        value={
                          configPagosSocios
                            .numero_cuenta
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'numero_cuenta',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      />
                    </div>


                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Titular
                      </label>

                      <input
                        value={
                          configPagosSocios
                            .titular_cuenta
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'titular_cuenta',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      />
                    </div>


                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Identificación del titular
                      </label>

                      <input
                        value={
                          configPagosSocios
                            .identificacion_titular
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'identificacion_titular',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      />
                    </div>


                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        WhatsApp MAK FITNESS
                      </label>

                      <input
                        value={
                          configPagosSocios
                            .whatsapp_gym
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'whatsapp_gym',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                        placeholder="0991183054"
                      />
                    </div>


                    <div className="md:col-span-2">

                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Aviso sobre comprobante
                      </label>

                      <textarea
                        rows={3}
                        value={
                          configPagosSocios
                            .transferencia_aviso_comprobante
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'transferencia_aviso_comprobante',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      />

                    </div>

                  </div>
                )}

              </section>


              <section className="rounded-2xl border border-gray-200 p-4">

                <label className="flex cursor-pointer items-center justify-between gap-4">

                  <div>
                    <p className="font-bold text-gray-900">
                      Tarjeta de débito o crédito
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      El socio solicitará el link de pago por WhatsApp.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      Boolean(
                        configPagosSocios
                          .tarjeta_activa
                      )
                    }
                    onChange={(e) =>
                      actualizarConfigPagosSocios(
                        'tarjeta_activa',
                        e.target.checked
                      )
                    }
                    className="h-5 w-5"
                  />

                </label>


                {configPagosSocios
                  .tarjeta_activa && (

                  <div className="mt-4 space-y-4">

                    <div>

                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Texto de la opción
                      </label>

                      <textarea
                        rows={2}
                        value={
                          configPagosSocios
                            .tarjeta_mensaje
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'tarjeta_mensaje',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      />

                    </div>


                    <div>

                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Aviso de recargo
                      </label>

                      <textarea
                        rows={3}
                        value={
                          configPagosSocios
                            .tarjeta_recargo_mensaje
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'tarjeta_recargo_mensaje',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm outline-none focus:border-amber-500"
                      />

                      <p className="mt-1 text-xs text-gray-500">
                        No coloques un porcentaje si el banco o procesador puede variarlo.
                      </p>

                    </div>


                    <div>

                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Mensaje que enviará el socio
                      </label>

                      <textarea
                        rows={3}
                        value={
                          configPagosSocios
                            .tarjeta_solicitud_mensaje
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'tarjeta_solicitud_mensaje',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      />

                      <p className="mt-1 text-xs text-gray-500">
                        MAK Socios añadirá automáticamente el nombre y código del socio.
                      </p>

                    </div>

                  </div>
                )}

              </section>


              <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row">

                <button
                  type="submit"
                  disabled={
                    guardandoConfigPagosSocios
                  }
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={18} />

                  {guardandoConfigPagosSocios
                    ? 'Guardando...'
                    : 'Guardar configuración'}
                </button>


                <button
                  type="button"
                  onClick={
                    cerrarConfigPagosSocios
                  }
                  disabled={
                    guardandoConfigPagosSocios
                  }
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {esDueno && mostrarPlan && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editandoPlanId ? 'Editar plan' : 'Registrar nuevo plan'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Puedes crear planes normales o promociones. Las promos inactivas quedan guardadas para activarlas cuando las necesites.
              </p>
            </div>

            <button
              onClick={limpiarPlan}
              className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={guardarPlan} className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nombre del plan
              </label>
              <input
                value={formPlan.nombre}
                onChange={(e) => actualizarPlan('nombre', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: Promo apertura"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Precio
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formPlan.precio}
                onChange={(e) => actualizarPlan('precio', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: 25"
              />
            </div>

            {(
              !formPlan.es_promocion ||
              formPlan.modalidad_vigencia ===
                'duracion'
            ) && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Duración en días
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    formPlan.duracion_dias
                  }
                  onChange={(e) =>
                    actualizarPlan(
                      'duracion_dias',
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Ej: 30"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Estado
              </label>
              <select
                value={formPlan.activo ? 'activo' : 'inactivo'}
                onChange={(e) => actualizarPlan('activo', e.target.value === 'activo')}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tipo de plan
              </label>

              <select
                value={
                  formPlan.es_promocion
                    ? 'promo'
                    : 'normal'
                }
                onChange={(e) =>
                  actualizarPlan(
                    'es_promocion',
                    e.target.value ===
                      'promo'
                  )
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="normal">
                  Plan normal
                </option>

                <option value="promo">
                  Plan promocional
                </option>
              </select>
            </div>

            {formPlan.es_promocion &&
              formPlan.modalidad_vigencia ===
                'fecha_fija' && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Disponible desde
                    </label>

                    <input
                      type="date"
                      value={
                        formPlan
                          .vigencia_desde
                      }
                      onChange={(e) =>
                        actualizarPlan(
                          'vigencia_desde',
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Finaliza el
                    </label>

                    <input
                      type="date"
                      value={
                        formPlan
                          .vigencia_hasta
                      }
                      min={
                        formPlan
                          .vigencia_desde ||
                        undefined
                      }
                      onChange={(e) =>
                        actualizarPlan(
                          'vigencia_hasta',
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    />
                  </div>

                  <div className="md:col-span-5 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-800">

                    {formPlan.vigencia_desde &&
                    formPlan.vigencia_hasta
                      ? (
                          <>
                            Esta promoción estará disponible del{' '}

                            <strong>
                              {formatearFecha(
                                formPlan
                                  .vigencia_desde
                              )}
                            </strong>

                            {' '}al{' '}

                            <strong>
                              {formatearFecha(
                                formPlan
                                  .vigencia_hasta
                              )}
                            </strong>.

                            {' '}Duración máxima:{' '}

                            <strong>
                              {calcularDiasInclusive(
                                formPlan
                                  .vigencia_desde,

                                formPlan
                                  .vigencia_hasta
                              )}{' '}
                              días
                            </strong>.

                            {' '}Cada socio que ingrese durante la promoción terminará su membresía exactamente el{' '}

                            <strong>
                              {formatearFecha(
                                formPlan
                                  .vigencia_hasta
                              )}
                            </strong>.
                          </>
                        )
                      : 'Selecciona en el calendario la fecha inicial y la fecha final de la promoción.'}

                  </div>
                </>
              )}

            {formPlan.es_promocion &&
              formPlan.modalidad_vigencia ===
                'duracion' &&
              editandoPlanId && (

                <div className="md:col-span-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">

                  <p className="font-semibold">
                    Promoción histórica por duración
                  </p>

                  <p className="mt-1">
                    Este plan fue creado antes de implementar promociones por fecha fija. Puedes conservarlo sin alterar su historial o convertirlo para futuras ventas.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      actualizarPlan(
                        'modalidad_vigencia',
                        'fecha_fija'
                      )
                    }
                    className="mt-3 rounded-xl border border-yellow-300 bg-white px-4 py-2 text-sm font-semibold text-yellow-900 transition hover:bg-yellow-100"
                  >
                    Convertir a fechas específicas
                  </button>

                </div>

              )}

            <div className="md:col-span-5">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                value={formPlan.descripcion}
                onChange={(e) => actualizarPlan('descripcion', e.target.value)}
                className="min-h-24 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Descripción del plan"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:col-span-5">
              <button
                type="submit"
                disabled={guardandoPlan}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {guardandoPlan
                  ? 'Guardando...'
                  : editandoPlanId
                    ? 'Actualizar plan'
                    : 'Guardar plan'}
              </button>

              <button
                type="button"
                onClick={limpiarPlan}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {mostrarInscripcion && (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm md:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Registrar pago de inscripción
              </h2>
              <p className="mt-1 text-sm text-gray-700">
                Este pago es independiente de la membresía.
              </p>
            </div>

            <button
              onClick={limpiarInscripcion}
              className="rounded-xl p-2 text-gray-500 transition hover:bg-white hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={guardarInscripcion} className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Miembro
              </label>
              <select
                value={formInscripcion.miembro_id}
                onChange={(e) => actualizarInscripcion('miembro_id', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="">Seleccionar miembro</option>
                {miembrosActivos.map((miembro) => (
                  <option key={miembro.id} value={miembro.id}>
                    {miembro.nombre} {miembro.apellido} - Código {miembro.codigo_acceso || '-'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Monto inscripción
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formInscripcion.monto}
                onChange={(e) => actualizarInscripcion('monto', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Método de pago
              </label>
              <select
                value={formInscripcion.metodo_pago}
                onChange={(e) => actualizarInscripcion('metodo_pago', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </div>

            <CamposDetallePago
              valores={formInscripcion}
              actualizar={actualizarInscripcion}
            />

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notas
              </label>
              <textarea
                value={formInscripcion.notas}
                onChange={(e) => actualizarInscripcion('notas', e.target.value)}
                className="min-h-20 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: Inscripción no cobrada por promoción de apertura."
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:col-span-3">
              <button
                type="submit"
                disabled={guardandoInscripcion}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <BadgeDollarSign size={18} />
                {guardandoInscripcion ? 'Guardando...' : 'Guardar inscripción'}
              </button>

              <button
                type="button"
                onClick={limpiarInscripcion}
                className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {mostrarUpgrade && (
        <div className="mt-6 rounded-2xl border border-purple-200 bg-purple-50 p-4 shadow-sm md:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Ampliar a mensual fidelización
              </h2>
              <p className="mt-1 text-sm text-gray-700">
                {membresiaUpgradeSeleccionada
                  ? `${obtenerNombreSocio(membresiaUpgradeSeleccionada)} · Se toma en cuenta la semana ya pagada y se cobra solo el saldo.`
                  : 'Ampliación del plan semanal al mensual fidelización.'}
              </p>
            </div>

            <button
              onClick={limpiarUpgrade}
              className="rounded-xl p-2 text-gray-500 transition hover:bg-white hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={guardarUpgradeFidelizacion} className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Socio
              </label>
              <div className="flex min-h-[46px] items-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700">
                {membresiaUpgradeSeleccionada
                  ? obtenerNombreSocio(membresiaUpgradeSeleccionada)
                  : '-'}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Saldo a cobrar
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formUpgrade.monto}
                onChange={(e) => actualizarUpgrade('monto', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
              <p className="mt-1 text-xs text-gray-500">
                Recomendado: $20 porque ya pagó $10 del semanal.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Método de pago
              </label>
              <select
                value={formUpgrade.metodo_pago}
                onChange={(e) => actualizarUpgrade('metodo_pago', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </div>

            <CamposDetallePago
              valores={formUpgrade}
              actualizar={actualizarUpgrade}
            />

            <div className="rounded-2xl border border-purple-200 bg-white p-4 text-sm text-purple-800 md:col-span-3">
              La membresía existente no se duplica. El sistema actualiza el plan semanal a mensual fidelización y extiende la fecha final hasta completar el mes desde la fecha inicial original.
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notas
              </label>
              <textarea
                value={formUpgrade.notas}
                onChange={(e) => actualizarUpgrade('notas', e.target.value)}
                className="min-h-20 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Detalle adicional"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:col-span-3">
              <button
                type="submit"
                disabled={guardandoUpgrade}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowUpRight size={18} />
                {guardandoUpgrade ? 'Guardando...' : 'Ampliar a mensual'}
              </button>

              <button
                type="button"
                onClick={limpiarUpgrade}
                className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {mostrarMembresia && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {formMembresia.renovacion_de_membresia_id ? 'Renovar membresía' : 'Registrar nueva membresía'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Registra membresía y respaldo del pago cuando aplique.
              </p>
            </div>

            <button
              onClick={limpiarMembresia}
              className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          {membresiaActivaSocioSeleccionado && (
            <div className="mb-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              Este socio ya tiene una membresía vigente. Su próxima renovación es el{' '}
              <strong>{formatearFecha(obtenerFechaRenovacionMembresia(membresiaActivaSocioSeleccionado))}</strong>.
              El sistema calculó la siguiente fecha disponible para evitar duplicar o cruzar vigencias.
            </div>
          )}

          <form onSubmit={guardarMembresia} className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Miembro
              </label>
              <select
                value={formMembresia.miembro_id}
                onChange={(e) => actualizarMembresia('miembro_id', e.target.value)}
                disabled={esRenovacionFormulario}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600"
              >
                <option value="">Seleccionar miembro</option>
                {miembrosActivos.map((miembro) => (
                  <option key={miembro.id} value={miembro.id}>
                    {miembro.nombre} {miembro.apellido} - Código {miembro.codigo_acceso || '-'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Plan
              </label>

              {mantienePlanHistoricoFormulario ? (

                <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">

                  <p className="text-sm font-bold text-gray-900">
                    {formMembresia.plan_historico_nombre}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-teal-800">
                    Precio histórico conservado:{' '}
                    {formatearDinero(
                      formMembresia
                        .plan_historico_precio ||
                      0
                    )}
                  </p>

                </div>

              ) : (

                <>

                  <select
                    value={formMembresia.plan_id}
                    onChange={(e) =>
                      actualizarMembresia(
                        'plan_id',
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  >

                    <option value="">
                      {esRenovacionFormulario
                        ? 'Seleccionar nuevo plan'
                        : 'Seleccionar plan'}
                    </option>

                    {planesDisponiblesVenta.map(
                      (plan) => (

                        <option
                          key={plan.id}
                          value={plan.id}
                        >
                          {plan.nombre}
                          {' - '}
                          {formatearDinero(
                            plan.precio
                          )}

                          {esPlanFechaFija(plan)
                            ? (
                                <>
                                  {' - hasta '}
                                  {formatearFecha(
                                    plan.vigencia_hasta
                                  )}
                                </>
                              )
                            : (
                                <>
                                  {' - '}
                                  {plan.duracion_dias}
                                  {' días'}
                                </>
                              )}

                          {plan.es_promocion
                            ? ' - PROMO'
                            : ''}
                        </option>

                      )
                    )}

                  </select>

                  <p className="mt-1 text-xs text-gray-500">

                    {esRenovacionFormulario
                      ? 'Al cambiar de plan se aplican el precio y condiciones vigentes del plan seleccionado.'
                      : 'Los planes promocionales solo aparecerán aquí cuando estén activos.'}

                  </p>

                </>

              )}

            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Fecha de inicio
              </label>
              <input
                type="date"
                value={formMembresia.fecha_inicio}
                onChange={(e) => actualizarMembresia('fecha_inicio', e.target.value)}

                min={
                  esPlanFechaFija(
                    planActualFormulario
                  )
                    ? planActualFormulario
                        .vigencia_desde
                    : undefined
                }

                max={
                  esPlanFechaFija(
                    planActualFormulario
                  )
                    ? planActualFormulario
                        .vigencia_hasta
                    : undefined
                }

                disabled={
                  esRenovacionFormulario
                }

                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600"
              />

              {!esRenovacionFormulario &&
                esPlanFechaFija(
                  planActualFormulario
                ) && (

                  <p className="mt-1 text-xs font-semibold text-purple-700">
                    Esta promoción finaliza el{' '}
                    {formatearFecha(
                      planActualFormulario
                        .vigencia_hasta
                    )}.
                  </p>

                )}

              {esRenovacionFormulario && (

                <p className="mt-1 text-xs text-gray-500">
                  La fecha de inicio de una renovación se calcula automáticamente para no perder días pagados.
                </p>

              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Próxima renovación
              </label>
              <div className="flex min-h-[46px] items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                {planCalculoFormulario
                  ? formatearFecha(
                      calcularFechaRenovacionPlan(
                        formMembresia.fecha_inicio,
                        planCalculoFormulario
                      )
                    )
                  : 'Selecciona un plan'}
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="mb-2 block text-sm font-bold text-gray-900">
                Formas de pago
              </label>
              <PagosMembresiaEditor
                pagos={formMembresia.pagos}
                actualizarPago={actualizarPagoMembresia}
                agregarPago={agregarPagoMembresia}
                eliminarPago={eliminarPagoMembresia}
                permitirCanje={esAdminPagos}
                precioPlan={
                  precioFormularioMembresia
                }
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nota general de la operación
              </label>
              <textarea
                value={formMembresia.notas}
                onChange={(e) => actualizarMembresia('notas', e.target.value)}
                className="min-h-20 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Opcional. Ej: Renovación registrada en recepción"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:col-span-3">
              <button
                type="submit"
                disabled={guardandoMembresia}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CreditCard size={18} />
                {guardandoMembresia ? 'Guardando...' : 'Guardar membresía y pago'}
              </button>

              <button
                type="button"
                onClick={limpiarMembresia}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {esDueno && mostrarEditarMembresia && (
        <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-sm md:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Editar fecha de inicio
              </h2>
              <p className="mt-1 text-sm text-gray-700">
                {membresiaSeleccionada
                  ? `${obtenerNombreSocio(membresiaSeleccionada)} · ${obtenerNombrePlan(membresiaSeleccionada)}`
                  : 'Actualiza la fecha de inicio de la membresía.'}
              </p>
            </div>

            <button
              onClick={limpiarEdicionMembresia}
              className="rounded-xl p-2 text-gray-500 transition hover:bg-white hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={guardarEdicionMembresia} className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nueva fecha de inicio
              </label>
              <input
                type="date"
                value={formEditarMembresia.fecha_inicio}
                onChange={(e) => actualizarEdicionMembresia('fecha_inicio', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Duración del plan
              </label>
              <div className="flex min-h-[46px] items-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700">
                {membresiaSeleccionada
                  ? obtenerTextoDuracionMembresia(
                      membresiaSeleccionada
                    )
                  : '-'}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nueva fecha de renovación
              </label>
              <div className="flex min-h-[46px] items-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700">
                {membresiaSeleccionada &&
                formEditarMembresia.fecha_inicio
                  ? formatearFecha(
                      calcularFechaRenovacionDesdeMembresia(
                        membresiaSeleccionada,
                        formEditarMembresia.fecha_inicio
                      )
                    )
                  : '-'}
              </div>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-white p-4 text-sm text-orange-800 md:col-span-3">
              Solo se modifica la fecha de inicio. La próxima renovación se calcula automáticamente respetando el ciclo calendario del plan contratado.
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:col-span-3">
              <button
                type="submit"
                disabled={guardandoEdicion}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {guardandoEdicion ? 'Guardando...' : 'Guardar nueva fecha de inicio'}
              </button>

              <button
                type="button"
                onClick={limpiarEdicionMembresia}
                className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Planes disponibles</h2>
            <p className="text-sm text-gray-500">
              {esDueno
                ? 'Administra planes activos, inactivos y promociones.'
                : 'Planes activos disponibles para registrar membresías.'}
            </p>
          </div>
        </div>

        {esDueno && (
          <div className="flex gap-2 overflow-x-auto border-b border-gray-200 px-4 py-3 md:px-5">
            {[
              ['activos', 'Planes activos'],
              ['inactivos', 'Planes inactivos'],
              ['promos', 'Promos'],
            ].map(([valor, etiqueta]) => (
              <button
                key={valor}
                onClick={() => setPestanaPlanes(valor)}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  pestanaPlanes === valor
                    ? 'bg-black text-white'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        )}

        {planesVisibles.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No hay planes en esta sección.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3 md:p-5">
            {planesVisibles.map((plan) => (
              <div
                key={plan.id}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{plan.nombre}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {plan.descripcion || 'Sin descripción'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        plan.activo
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {plan.activo ? 'Activo' : 'Inactivo'}
                    </span>

                    {plan.es_promocion && (
                      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                        Promo
                      </span>
                    )}
                  </div>
                </div>

                {plan.es_upgrade && (
                  <div className="mt-3 rounded-xl bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700">
                    Plan de ampliación. No se vende directamente.
                  </div>
                )}

                {plan.es_promocion && !plan.activo && (
                  <div className="mt-3 rounded-xl bg-yellow-50 px-3 py-2 text-xs font-semibold text-yellow-700">
                    Promo guardada. Actívala cuando quieras usarla.
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Precio</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatearDinero(plan.precio)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-500">Duración</p>
                    <p className="text-lg font-bold text-gray-900">
                      {esPlanFechaFija(plan)
                        ? `Hasta ${formatearFecha(
                            plan.vigencia_hasta
                          )}`
                        : `${plan.duracion_dias} días`}
                    </p>

                    {esPlanFechaFija(plan) && (
                      <p className="mt-1 text-xs font-semibold text-gray-500">

                        {obtenerEstadoPromoFecha(plan) ===
                        'programada'
                          ? 'Programada'

                          : obtenerEstadoPromoFecha(plan) ===
                            'finalizada'
                            ? 'Finalizada'
                            : 'Vigente'}

                      </p>
                    )}
                  </div>
                </div>

                {esDueno && (
                  <div className="mt-5">
                    <button
                      onClick={() => editarPlan(plan)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
                    >
                      <Pencil size={17} />
                      Editar plan
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Listado de membresías</h2>
              <p className="text-sm text-gray-500">
                Vista principal: membresías vigentes. Usa los filtros para ver futuras, vencidas o suspendidas.
              </p>
            </div>

            <div className="relative w-full md:w-96">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-black"
                placeholder="Buscar por socio, código, cédula, teléfono o plan"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              ['activa', 'Vigentes'],
              ['por_caducar', 'Por caducar'],
              ['vence_hoy', 'Renueva mañana'],
              ['futura', 'Futuras'],
              ['vencida', 'Vencidas'],
              ['suspendida', 'Suspendidas'],
              ['todas', 'Todas'],
            ].map(([valor, etiqueta]) => (
              <button
                key={valor}
                onClick={() => setFiltroEstado(valor)}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  filtroEstado === valor
                    ? 'bg-black text-white'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>

        
        {filtroEstado === 'vencida' && (
          <div className="mx-4 mt-4 flex flex-col gap-3 rounded-xl border border-red-100 bg-red-50/50 p-4 sm:flex-row sm:items-center sm:justify-between md:mx-5">

            <div>
              <p className="text-sm font-semibold text-gray-900">
                Filtrar socios caducados
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {filtroMesVencidas === 'todas'
                  ? `${membresiasVencidasPeriodo} socio${membresiasVencidasPeriodo === 1 ? '' : 's'} sin renovar en total`
                  : `${membresiasVencidasPeriodo} socio${membresiasVencidasPeriodo === 1 ? '' : 's'} sin renovar en ${formatearMes(filtroMesVencidas).toLowerCase()}`}
              </p>
            </div>

            <select
              value={filtroMesVencidas}
              onChange={(e) =>
                setFiltroMesVencidas(
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 outline-none focus:border-black sm:w-auto"
            >
              <option value="todas">
                Todas las caducadas ({membresiasVencidas})
              </option>

              {mesesDisponiblesVencidas.map(
                (mes) => (
                  <option
                    key={mes}
                    value={mes}
                  >
                    {formatearMes(mes)}
                    {mes === obtenerMesActual()
                      ? ' (mes actual)'
                      : ''}
                  </option>
                )
              )}
            </select>

          </div>
        )}

        {cargando ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Cargando membresías...
          </div>
        ) : membresiasFiltradas.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <UserRound size={24} className="text-gray-500" />
            </div>
            <p className="font-semibold text-gray-900">No hay membresías en este filtro</p>
            <p className="mt-1 text-sm text-gray-500">
              Cambia el filtro o registra una nueva membresía.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
              {membresiasPaginadas.map((membresia) => {
                const pagosMembresia = obtenerPagosMembresia(membresia.id)
                const ultimoPago = obtenerUltimoPagoMembresia(membresia.id)
                const totalPagado = obtenerTotalPagadoMembresia(membresia.id)
                const miembro = membresia.miembros || {}
                const planActual = membresia.planes || {}

                const nombrePlan = membresia.plan_nombre_snapshot || planActual.nombre || '-'
                const precioPlan = membresia.plan_precio_snapshot || planActual.precio || 0
                const duracionPlan = obtenerTextoDuracionMembresia(membresia)

                return (
                  <div
                    key={membresia.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {miembro.nombre} {miembro.apellido}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          Código: {miembro.codigo_acceso || '-'}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {miembro.telefono || 'Sin teléfono'}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${obtenerClaseEstado(membresia.estado_real)}`}
                      >
                        {obtenerEtiquetaEstado(membresia.estado_real)}
                      </span>
                    </div>

                    <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {nombrePlan}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatearDinero(precioPlan)} · {duracionPlan}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Inicio</p>
                          <p className="font-bold text-gray-900">
                            {formatearFecha(membresia.fecha_inicio)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-500">Renueva</p>
                          <p className="font-bold text-gray-900">
                            {formatearFecha(
                              obtenerFechaRenovacionMembresia(
                                membresia
                              )
                            )}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-sm font-semibold text-gray-700">
                        {membresia.texto_vigencia}
                      </p>
                    </div>

                    <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-3">
                      <p className="text-xs font-semibold text-gray-500">Pago acumulado</p>
                      <p className="font-bold text-gray-900">
                        {formatearDinero(totalPagado)}
                      </p>
                      <p className="mt-1 text-xs capitalize text-gray-500">
                        Último método: {ultimoPago?.metodo_pago || '-'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {obtenerDetallePago(ultimoPago)}
                      </p>
                      {pagosMembresia.length > 1 && (
                        <p className="mt-1 text-xs font-semibold text-purple-700">
                          Incluye {pagosMembresia.length} pagos asociados.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      {membresia.estado_real === 'vencida' && (
                        <button
                          type="button"
                          onClick={() =>
                            abrirDetalleVencida(
                              membresia
                            )
                          }
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          Ver
                        </button>
                      )}

                      {puedeAmpliarFidelizacion(membresia) && (
                        <button
                          onClick={() => abrirUpgradeFidelizacion(membresia)}
                          className="inline-flex items-center gap-2 rounded-lg border border-purple-100 px-3 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-50"
                          title="Ampliar a mensual fidelización"
                        >
                          <ArrowUpRight size={17} />
                          Ampliar
                        </button>
                      )}

                      {esAdminPagos && (
                        <button
                          type="button"
                          onClick={() => abrirHistorialPagos(membresia)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                          title="Historial de membresía"
                        >
                          <BadgeDollarSign size={17} />
                          Historial
                        </button>
                      )}

                      <button
                        onClick={() => renovarMembresia(membresia)}
                        className="rounded-lg border border-blue-100 p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
                        title="Renovar"
                      >
                        <RefreshCw size={17} />
                      </button>

                      {esDueno && (
                        <>
                          <button
                            onClick={() => abrirEditarMembresia(membresia)}
                            className="rounded-lg border border-orange-100 p-2 text-orange-600 transition hover:bg-orange-50 hover:text-orange-700"
                            title="Editar fecha de inicio"
                          >
                            <CalendarDays size={17} />
                          </button>

                          {membresia.estado === 'suspendida' ? (
                            <button
                              onClick={() => activarMembresia(membresia)}
                              className="rounded-lg border border-green-100 p-2 text-green-600 transition hover:bg-green-50 hover:text-green-700"
                              title="Activar"
                            >
                              <Pencil size={17} />
                            </button>
                          ) : (
                            <button
                              onClick={() => suspenderMembresia(membresia)}
                              className="rounded-lg border border-yellow-100 p-2 text-yellow-600 transition hover:bg-yellow-50 hover:text-yellow-700"
                              title="Suspender"
                            >
                              <Pencil size={17} />
                            </button>
                          )}

                          <button
                            onClick={() => eliminarMembresia(membresia)}
                            className="rounded-lg border border-red-100 p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700"
                            title="Eliminar"
                          >
                            <Trash2 size={17} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1320px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Miembro</th>
                    <th className="px-5 py-3">Plan histórico</th>
                    <th className="px-5 py-3">Inicio</th>
                    <th className="px-5 py-3">Renueva</th>
                    <th className="px-5 py-3">Vigencia</th>
                    <th className="px-5 py-3">Pago</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {membresiasPaginadas.map((membresia) => {
                    const pagosMembresia = obtenerPagosMembresia(membresia.id)
                    const ultimoPago = obtenerUltimoPagoMembresia(membresia.id)
                    const totalPagado = obtenerTotalPagadoMembresia(membresia.id)
                    const miembro = membresia.miembros || {}
                    const planActual = membresia.planes || {}

                    const nombrePlan = membresia.plan_nombre_snapshot || planActual.nombre || '-'
                    const precioPlan = membresia.plan_precio_snapshot || planActual.precio || 0
                    const duracionPlan = obtenerTextoDuracionMembresia(membresia)

                    return (
                      <tr key={membresia.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">
                            {miembro.nombre} {miembro.apellido}
                          </div>
                          <div className="text-xs text-gray-500">
                            Código: {miembro.codigo_acceso || '-'} · {miembro.telefono || 'Sin teléfono'}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">
                            {nombrePlan}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatearDinero(precioPlan)} · {duracionPlan}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          <div className="flex items-center gap-2">
                            <CalendarDays size={16} className="text-gray-400" />
                            {formatearFecha(membresia.fecha_inicio)}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          {formatearFecha(
                            obtenerFechaRenovacionMembresia(
                              membresia
                            )
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${obtenerClaseEstado(membresia.estado_real)}`}
                          >
                            {obtenerEtiquetaEstado(membresia.estado_real)}
                          </span>

                          <div className="mt-1 text-xs text-gray-500">
                            {membresia.texto_vigencia}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">
                            {formatearDinero(totalPagado)}
                          </div>
                          <div className="text-xs capitalize text-gray-500">
                            Último: {ultimoPago?.metodo_pago || '-'}
                          </div>
                          <div className="mt-1 max-w-[300px] text-xs text-gray-500">
                            {obtenerDetallePago(ultimoPago)}
                          </div>
                          {pagosMembresia.length > 1 && (
                            <div className="mt-1 text-xs font-semibold text-purple-700">
                              {pagosMembresia.length} pagos asociados
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            {membresia.estado_real === 'vencida' && (
                              <button
                                type="button"
                                onClick={() =>
                                  abrirDetalleVencida(
                                    membresia
                                  )
                                }
                                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                              >
                                Ver
                              </button>
                            )}

                            {puedeAmpliarFidelizacion(membresia) && (
                              <button
                                onClick={() => abrirUpgradeFidelizacion(membresia)}
                                className="rounded-lg p-2 text-purple-700 transition hover:bg-purple-50 hover:text-purple-800"
                                title="Ampliar a mensual fidelización"
                              >
                                <ArrowUpRight size={17} />
                              </button>
                            )}

                            {esAdminPagos && (
                              <button
                                type="button"
                                onClick={() => abrirHistorialPagos(membresia)}
                                className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                                title="Historial de membresía"
                              >
                                <BadgeDollarSign size={17} />
                              </button>
                            )}

                            <button
                              onClick={() => renovarMembresia(membresia)}
                              className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
                              title="Renovar"
                            >
                              <RefreshCw size={17} />
                            </button>

                            {esDueno && (
                              <>
                                <button
                                  onClick={() => abrirEditarMembresia(membresia)}
                                  className="rounded-lg p-2 text-orange-600 transition hover:bg-orange-50 hover:text-orange-700"
                                  title="Editar fecha de inicio"
                                >
                                  <CalendarDays size={17} />
                                </button>

                                {membresia.estado === 'suspendida' ? (
                                  <button
                                    onClick={() => activarMembresia(membresia)}
                                    className="rounded-lg p-2 text-green-600 transition hover:bg-green-50 hover:text-green-700"
                                    title="Activar"
                                  >
                                    <Pencil size={17} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => suspenderMembresia(membresia)}
                                    className="rounded-lg p-2 text-yellow-600 transition hover:bg-yellow-50 hover:text-yellow-700"
                                    title="Suspender"
                                  >
                                    <Pencil size={17} />
                                  </button>
                                )}

                                <button
                                  onClick={() => eliminarMembresia(membresia)}
                                  className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700"
                                  title="Eliminar"
                                >
                                  <Trash2 size={17} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
              <p className="text-sm text-gray-600">
                Mostrando <span className="font-semibold">{(paginaMembresiasVisible - 1) * 10 + 1}</span>
                {' - '}
                <span className="font-semibold">{Math.min(paginaMembresiasVisible * 10, membresiasOrdenadas.length)}</span>
                {' de '}
                <span className="font-semibold">{membresiasOrdenadas.length}</span> membresías

                {filtroEstado === 'activa' && (
                  <span className="ml-2 text-xs text-gray-500">
                    · Mayor precio primero
                  </span>
                )}
              </p>

              {totalPaginasMembresias > 1 && (
                <nav
                  aria-label="Páginas de membresías"
                  className="flex flex-wrap items-center gap-1.5"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setPaginaMembresias(
                        Math.max(1, paginaMembresiasVisible - 1)
                      )
                    }
                    disabled={paginaMembresiasVisible === 1}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Anterior
                  </button>

                  {paginasVisiblesMembresias.map((pagina, indice) => (
                    <span
                      key={pagina}
                      className="inline-flex items-center gap-1.5"
                    >
                      {indice > 0 &&
                        pagina - paginasVisiblesMembresias[indice - 1] > 1 && (
                          <span className="px-1 text-sm text-gray-400">
                            …
                          </span>
                        )}

                      <button
                        type="button"
                        onClick={() => setPaginaMembresias(pagina)}
                        aria-label={`Ir a la página ${pagina}`}
                        aria-current={
                          pagina === paginaMembresiasVisible
                            ? 'page'
                            : undefined
                        }
                        className={`min-w-9 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                          pagina === paginaMembresiasVisible
                            ? 'border-black bg-black text-white'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pagina}
                      </button>
                    </span>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setPaginaMembresias(
                        Math.min(
                          totalPaginasMembresias,
                          paginaMembresiasVisible + 1
                        )
                      )
                    }
                    disabled={
                      paginaMembresiasVisible === totalPaginasMembresias
                    }
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </nav>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}