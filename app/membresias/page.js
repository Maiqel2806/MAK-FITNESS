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

const planInicial = {
  nombre: '',
  descripcion: '',
  precio: '',
  duracion_dias: '',
  activo: true,
  es_promocion: false,
}

const membresiaInicial = {
  miembro_id: '',
  plan_id: '',
  fecha_inicio: obtenerFechaHoy(),
  metodo_pago: 'efectivo',
  monto: '',
  notas: '',
  renovacion_de_membresia_id: null,
  numero_comprobante: '',
  banco_origen: '',
  tipo_tarjeta: '',
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

function sumarDias(fecha, dias) {
  const date = new Date(`${fecha}T00:00:00`)
  date.setDate(date.getDate() + Number(dias || 0))

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function calcularFechaFin(fechaInicio, duracionDias) {
  if (!fechaInicio || !duracionDias) return ''

  const diasVigentes = Math.max(Number(duracionDias || 1) - 1, 0)
  return sumarDias(fechaInicio, diasVigentes)
}

function obtenerDuracionMembresia(membresia) {
  return Number(
    membresia?.plan_duracion_dias_snapshot ||
      membresia?.planes?.duracion_dias ||
      0
  )
}

function diferenciaDias(fechaDesde, fechaHasta) {
  const inicio = new Date(`${fechaDesde}T00:00:00`)
  const fin = new Date(`${fechaHasta}T00:00:00`)
  return Math.round((fin - inicio) / (1000 * 60 * 60 * 24))
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
  if (estado === 'vence_hoy') return 'Vence hoy'
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

  return 'Pago en efectivo'
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

  const [miembros, setMiembros] = useState([])
  const [planes, setPlanes] = useState([])
  const [membresias, setMembresias] = useState([])
  const [pagos, setPagos] = useState([])

  const [formPlan, setFormPlan] = useState(planInicial)
  const [formMembresia, setFormMembresia] = useState({
    ...membresiaInicial,
    fecha_inicio: obtenerFechaHoy(),
  })
  const [formInscripcion, setFormInscripcion] = useState(inscripcionInicial)
  const [formUpgrade, setFormUpgrade] = useState(upgradeInicial)
  const [formEditarMembresia, setFormEditarMembresia] = useState(edicionMembresiaInicial)

  const [mostrarPlan, setMostrarPlan] = useState(false)
  const [mostrarMembresia, setMostrarMembresia] = useState(false)
  const [mostrarInscripcion, setMostrarInscripcion] = useState(false)
  const [mostrarUpgrade, setMostrarUpgrade] = useState(false)
  const [mostrarEditarMembresia, setMostrarEditarMembresia] = useState(false)

  const [editandoPlanId, setEditandoPlanId] = useState(null)
  const [editandoMembresiaId, setEditandoMembresiaId] = useState(null)
  const [membresiaSeleccionada, setMembresiaSeleccionada] = useState(null)
  const [membresiaUpgradeSeleccionada, setMembresiaUpgradeSeleccionada] = useState(null)

  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activa')
  const [pestanaPlanes, setPestanaPlanes] = useState('activos')

  const [cargando, setCargando] = useState(true)
  const [guardandoPlan, setGuardandoPlan] = useState(false)
  const [guardandoMembresia, setGuardandoMembresia] = useState(false)
  const [guardandoInscripcion, setGuardandoInscripcion] = useState(false)
  const [guardandoUpgrade, setGuardandoUpgrade] = useState(false)
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

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
    setFormPlan((actual) => ({
      ...actual,
      [campo]: valor,
    }))
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
      }

      if (campo === 'plan_id') {
        const plan = planes.find((item) => item.id === valor)

        if (plan) {
          nuevo.monto = String(plan.precio)
        }
      }

      return ajustarDetallePagoPorMetodo(nuevo, campo, valor)
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
      duracion_dias: String(plan.duracion_dias || ''),
      activo: Boolean(plan.activo),
      es_promocion: Boolean(plan.es_promocion),
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
    })

    cerrarFormularios()
    setMostrarMembresia(true)
    setError('')
    setMensaje('')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function renovarMembresia(membresia) {
    const planId = membresia.plan_id
    const plan = planes.find((item) => item.id === planId)
    const fechaInicio = calcularFechaInicioInteligente(membresia.miembro_id)

    setFormMembresia({
      miembro_id: membresia.miembro_id,
      plan_id: planId || '',
      fecha_inicio: fechaInicio,
      metodo_pago: 'efectivo',
      monto: plan ? String(plan.precio) : String(membresia.plan_precio_snapshot || ''),
      notas: `Renovación de membresía anterior con vencimiento ${formatearFecha(membresia.fecha_fin)}.`,
      renovacion_de_membresia_id: membresia.id,
      numero_comprobante: '',
      banco_origen: '',
      tipo_tarjeta: '',
    })

    cerrarFormularios()
    setMostrarMembresia(true)
    setError('')
    setMensaje('La fecha de inicio fue calculada automáticamente para no perder días de vigencia.')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function limpiarMembresia() {
    setFormMembresia({
      ...membresiaInicial,
      fecha_inicio: obtenerFechaHoy(),
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

    const datos = {
      nombre: formPlan.nombre.trim(),
      descripcion: formPlan.descripcion.trim() || null,
      precio: Number(formPlan.precio),
      duracion_dias: Number(formPlan.duracion_dias),
      activo: Boolean(formPlan.activo),
      es_promocion: Boolean(formPlan.es_promocion),
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

    if (!datos.duracion_dias || datos.duracion_dias <= 0) {
      setError('La duración del plan debe ser mayor a 0 días.')
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
    setGuardandoMembresia(true)
    setError('')
    setMensaje('')

    const plan = planes.find((item) => item.id === formMembresia.plan_id)

    if (!formMembresia.miembro_id) {
      setError('Debes seleccionar un miembro.')
      setGuardandoMembresia(false)
      return
    }

    if (!plan) {
      setError('Debes seleccionar un plan válido.')
      setGuardandoMembresia(false)
      return
    }

    if (plan.es_upgrade || plan.codigo === 'MENSUAL_FIDELIZACION') {
      setError('El mensual fidelización no se registra directamente. Usa el botón “Ampliar a mensual fidelización” desde un plan semanal fidelización vigente.')
      setGuardandoMembresia(false)
      return
    }

    if (!formMembresia.fecha_inicio) {
      setError('La fecha de inicio es obligatoria.')
      setGuardandoMembresia(false)
      return
    }

    const monto = Number(formMembresia.monto)

    if (!monto || monto <= 0) {
      setError('El monto del pago debe ser mayor a 0.')
      setGuardandoMembresia(false)
      return
    }

    const errorPago = validarDetallePago(formMembresia)

    if (errorPago) {
      setError(errorPago)
      setGuardandoMembresia(false)
      return
    }

    const { error } = await supabase.rpc('registrar_membresia_inteligente', {
      p_miembro_id: formMembresia.miembro_id,
      p_plan_id: formMembresia.plan_id,
      p_metodo_pago: formMembresia.metodo_pago,
      p_monto: monto,
      p_notas: formMembresia.notas || null,
      p_fecha_inicio_manual: formMembresia.fecha_inicio,
      p_renovacion_de_membresia_id: formMembresia.renovacion_de_membresia_id || null,
      p_numero_comprobante: formMembresia.numero_comprobante || null,
      p_banco_origen: formMembresia.banco_origen || null,
      p_tipo_tarjeta: formMembresia.tipo_tarjeta || null,
    })

    if (error) {
      setError(error.message)
      setGuardandoMembresia(false)
      return
    }

    await cargarDatos()
    limpiarMembresia()
    setFiltroEstado('activa')
    setMensaje('Membresía y pago registrados correctamente.')
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

    const duracionDias = obtenerDuracionMembresia(membresiaSeleccionada)

    if (!duracionDias || duracionDias <= 0) {
      setError('No se pudo calcular la vigencia porque el plan no tiene duración válida.')
      setGuardandoEdicion(false)
      return
    }

    const fechaFinCalculada = calcularFechaFin(
      formEditarMembresia.fecha_inicio,
      duracionDias
    )

    const datos = {
      fecha_inicio: formEditarMembresia.fecha_inicio,
      fecha_fin: fechaFinCalculada,
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

      const dias = diferenciaDias(hoy, membresia.fecha_fin)

      if (dias < 0) {
        return {
          ...membresia,
          estado_real: 'vencida',
          dias_restantes: dias,
          texto_vigencia: `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`,
        }
      }

      if (dias === 0) {
        return {
          ...membresia,
          estado_real: 'vence_hoy',
          dias_restantes: dias,
          texto_vigencia: 'Vence hoy',
        }
      }

      if (dias <= 7) {
        return {
          ...membresia,
          estado_real: 'por_caducar',
          dias_restantes: dias,
          texto_vigencia: `Vence en ${dias} día${dias === 1 ? '' : 's'}`,
        }
      }

      return {
        ...membresia,
        estado_real: 'activa',
        dias_restantes: dias,
        texto_vigencia: `Vence en ${dias} días`,
      }
    })
  }, [membresias])

  const membresiasFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()

    return membresiasConEstadoReal.filter((membresia) => {
      const miembro = membresia.miembros || {}
      const plan = membresia.planes || {}

      let coincideEstado = true

      if (filtroEstado === 'activa') {
        coincideEstado = ['activa', 'por_caducar', 'vence_hoy'].includes(membresia.estado_real)
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
            String(valor || '').toLowerCase().includes(texto)
          )
        : true

      return coincideEstado && coincideBusqueda
    })
  }, [membresiasConEstadoReal, busqueda, filtroEstado])

  const miembrosActivos = miembros.filter((miembro) => miembro.estado === 'activo')
  const planesActivos = planes.filter((plan) => plan.activo)

  const planesDisponiblesVenta = planesActivos.filter((plan) => {
    return !plan.es_upgrade && plan.codigo !== 'MENSUAL_FIDELIZACION'
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

  const totalPagos = pagos.reduce((total, pago) => total + Number(pago.monto || 0), 0)
  const membresiasVigentes = membresiasConEstadoReal.filter((item) =>
    ['activa', 'por_caducar', 'vence_hoy'].includes(item.estado_real)
  ).length
  const membresiasPorCaducar = membresiasConEstadoReal.filter((item) =>
    item.estado_real === 'por_caducar' || item.estado_real === 'vence_hoy'
  ).length
  const membresiasFuturas = membresiasConEstadoReal.filter((item) => item.estado_real === 'futura').length
  const membresiasVencidas = membresiasConEstadoReal.filter((item) => item.estado_real === 'vencida').length
  const membresiasSuspendidas = membresiasConEstadoReal.filter((item) => item.estado_real === 'suspendida').length

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

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Duración en días
              </label>
              <input
                type="number"
                min="1"
                value={formPlan.duracion_dias}
                onChange={(e) => actualizarPlan('duracion_dias', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: 30"
              />
            </div>

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
                value={formPlan.es_promocion ? 'promo' : 'normal'}
                onChange={(e) => actualizarPlan('es_promocion', e.target.value === 'promo')}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="normal">Plan normal</option>
                <option value="promo">Plan promocional</option>
              </select>
            </div>

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
              Este socio ya tiene una membresía vigente hasta el{' '}
              <strong>{formatearFecha(membresiaActivaSocioSeleccionado.fecha_fin)}</strong>.
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
                Plan
              </label>
              <select
                value={formMembresia.plan_id}
                onChange={(e) => actualizarMembresia('plan_id', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="">Seleccionar plan</option>
                {planesDisponiblesVenta.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nombre} - {formatearDinero(plan.precio)} - {plan.duracion_dias} días
                    {plan.es_promocion ? ' - PROMO' : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Los planes promocionales solo aparecerán aquí cuando estén activos.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Fecha de inicio
              </label>
              <input
                type="date"
                value={formMembresia.fecha_inicio}
                onChange={(e) => actualizarMembresia('fecha_inicio', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Monto pagado
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formMembresia.monto}
                onChange={(e) => actualizarMembresia('monto', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: 25"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Método de pago
              </label>
              <select
                value={formMembresia.metodo_pago}
                onChange={(e) => actualizarMembresia('metodo_pago', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Fecha fin calculada
              </label>
              <div className="flex min-h-[46px] items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                {formMembresia.plan_id
                  ? formatearFecha(
                      calcularFechaFin(
                        formMembresia.fecha_inicio,
                        planes.find((plan) => plan.id === formMembresia.plan_id)?.duracion_dias || 0
                      )
                    )
                  : 'Selecciona un plan'}
              </div>
            </div>

            <CamposDetallePago
              valores={formMembresia}
              actualizar={actualizarMembresia}
            />

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notas del pago
              </label>
              <textarea
                value={formMembresia.notas}
                onChange={(e) => actualizarMembresia('notas', e.target.value)}
                className="min-h-24 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: Pago completo de mensualidad"
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
                  ? `${obtenerDuracionMembresia(membresiaSeleccionada)} días`
                  : '-'}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nueva fecha fin calculada
              </label>
              <div className="flex min-h-[46px] items-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700">
                {membresiaSeleccionada && formEditarMembresia.fecha_inicio
                  ? formatearFecha(
                      calcularFechaFin(
                        formEditarMembresia.fecha_inicio,
                        obtenerDuracionMembresia(membresiaSeleccionada)
                      )
                    )
                  : '-'}
              </div>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-white p-4 text-sm text-orange-800 md:col-span-3">
              Solo se modifica la fecha de inicio. La fecha final se calcula automáticamente según la duración real del plan contratado.
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
                      {plan.duracion_dias} días
                    </p>
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
              ['vence_hoy', 'Vence hoy'],
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
              {membresiasFiltradas.map((membresia) => {
                const pagosMembresia = obtenerPagosMembresia(membresia.id)
                const ultimoPago = obtenerUltimoPagoMembresia(membresia.id)
                const totalPagado = obtenerTotalPagadoMembresia(membresia.id)
                const miembro = membresia.miembros || {}
                const planActual = membresia.planes || {}

                const nombrePlan = membresia.plan_nombre_snapshot || planActual.nombre || '-'
                const precioPlan = membresia.plan_precio_snapshot || planActual.precio || 0
                const duracionPlan = membresia.plan_duracion_dias_snapshot || planActual.duracion_dias || 0

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
                        {formatearDinero(precioPlan)} · {duracionPlan} días
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Inicio</p>
                          <p className="font-bold text-gray-900">
                            {formatearFecha(membresia.fecha_inicio)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-500">Vence</p>
                          <p className="font-bold text-gray-900">
                            {formatearFecha(membresia.fecha_fin)}
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
                    <th className="px-5 py-3">Vence</th>
                    <th className="px-5 py-3">Vigencia</th>
                    <th className="px-5 py-3">Pago</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {membresiasFiltradas.map((membresia) => {
                    const pagosMembresia = obtenerPagosMembresia(membresia.id)
                    const ultimoPago = obtenerUltimoPagoMembresia(membresia.id)
                    const totalPagado = obtenerTotalPagadoMembresia(membresia.id)
                    const miembro = membresia.miembros || {}
                    const planActual = membresia.planes || {}

                    const nombrePlan = membresia.plan_nombre_snapshot || planActual.nombre || '-'
                    const precioPlan = membresia.plan_precio_snapshot || planActual.precio || 0
                    const duracionPlan = membresia.plan_duracion_dias_snapshot || planActual.duracion_dias || 0

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
                            {formatearDinero(precioPlan)} · {duracionPlan} días
                          </div>
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          <div className="flex items-center gap-2">
                            <CalendarDays size={16} className="text-gray-400" />
                            {formatearFecha(membresia.fecha_inicio)}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          {formatearFecha(membresia.fecha_fin)}
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
                            {puedeAmpliarFidelizacion(membresia) && (
                              <button
                                onClick={() => abrirUpgradeFidelizacion(membresia)}
                                className="rounded-lg p-2 text-purple-700 transition hover:bg-purple-50 hover:text-purple-800"
                                title="Ampliar a mensual fidelización"
                              >
                                <ArrowUpRight size={17} />
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
          </>
        )}
      </div>
    </div>
  )
}