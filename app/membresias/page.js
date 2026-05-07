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
} from 'lucide-react'

const supabase = createClient()

const planInicial = {
  nombre: '',
  descripcion: '',
  precio: '',
  duracion_dias: '',
  activo: true,
}

const membresiaInicial = {
  miembro_id: '',
  plan_id: '',
  fecha_inicio: obtenerFechaHoy(),
  metodo_pago: 'efectivo',
  monto: '',
  notas: '',
  renovacion_de_membresia_id: null,
}

function obtenerFechaHoy() {
  const hoy = new Date()
  const year = hoy.getFullYear()
  const month = String(hoy.getMonth() + 1).padStart(2, '0')
  const day = String(hoy.getDate()).padStart(2, '0')
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
  if (estado === 'vencida') return 'bg-red-50 text-red-700'
  if (estado === 'suspendida') return 'bg-gray-100 text-gray-700'
  return 'bg-gray-100 text-gray-700'
}

function obtenerEtiquetaEstado(estado) {
  if (estado === 'activa') return 'Activa'
  if (estado === 'por_caducar') return 'Por caducar'
  if (estado === 'vence_hoy') return 'Vence hoy'
  if (estado === 'vencida') return 'Vencida'
  if (estado === 'suspendida') return 'Suspendida'
  return estado
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

  const [mostrarPlan, setMostrarPlan] = useState(false)
  const [mostrarMembresia, setMostrarMembresia] = useState(false)
  const [editandoPlanId, setEditandoPlanId] = useState(null)

  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [cargando, setCargando] = useState(true)
  const [guardandoPlan, setGuardandoPlan] = useState(false)
  const [guardandoMembresia, setGuardandoMembresia] = useState(false)
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
            nombre,
            precio,
            duracion_dias
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

      return nuevo
    })
  }

  function abrirNuevoPlan() {
    if (!esDueno) {
      setError('No tienes permisos para crear planes.')
      return
    }

    setFormPlan(planInicial)
    setEditandoPlanId(null)
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
    })

    setEditandoPlanId(plan.id)
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
    })

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

    const { error } = await supabase.rpc('registrar_membresia_inteligente', {
      p_miembro_id: formMembresia.miembro_id,
      p_plan_id: formMembresia.plan_id,
      p_metodo_pago: formMembresia.metodo_pago,
      p_monto: monto,
      p_notas: formMembresia.notas || null,
      p_fecha_inicio_manual: formMembresia.fecha_inicio,
      p_renovacion_de_membresia_id: formMembresia.renovacion_de_membresia_id || null,
    })

    if (error) {
      setError(error.message)
      setGuardandoMembresia(false)
      return
    }

    await cargarDatos()
    limpiarMembresia()
    setMensaje('Membresía y pago registrados correctamente con vigencia inteligente.')
    setGuardandoMembresia(false)
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

    const nombre = `${membresia.miembros?.nombre || ''} ${membresia.miembros?.apellido || ''}`.trim()

    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar la membresía de ${nombre || 'este miembro'}?`
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

      const coincideEstado = filtroEstado === 'todas'
        ? true
        : membresia.estado_real === filtroEstado

      const valores = [
        miembro.nombre,
        miembro.apellido,
        miembro.cedula,
        miembro.codigo_acceso,
        miembro.telefono,
        plan.nombre,
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

  const totalPagos = pagos.reduce((total, pago) => total + Number(pago.monto || 0), 0)
  const membresiasActivas = membresiasConEstadoReal.filter((item) => item.estado_real === 'activa').length
  const membresiasPorCaducar = membresiasConEstadoReal.filter((item) => item.estado_real === 'por_caducar' || item.estado_real === 'vence_hoy').length
  const membresiasVencidas = membresiasConEstadoReal.filter((item) => item.estado_real === 'vencida').length
  const membresiasSuspendidas = membresiasConEstadoReal.filter((item) => item.estado_real === 'suspendida').length

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Membresías y pagos
          </h1>
          <p className="mt-2 text-sm text-gray-600 md:text-base">
            Administra planes, renovaciones inteligentes, fechas de vencimiento y pagos.
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

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs text-gray-500 md:text-sm">Activas</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">
            {cargando ? '-' : membresiasActivas}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs text-gray-500 md:text-sm">Por caducar</p>
          <h2 className="mt-2 text-2xl font-bold text-orange-700 md:text-3xl">
            {cargando ? '-' : membresiasPorCaducar}
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

        <div className="col-span-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:col-span-1 md:p-5">
          <p className="text-xs text-gray-500 md:text-sm">Pagos</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 md:text-2xl">
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
                Los cambios aplicarán a nuevas membresías. Las membresías ya creadas conservan su historial.
              </p>
            </div>

            <button
              onClick={limpiarPlan}
              className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={guardarPlan} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nombre del plan
              </label>
              <input
                value={formPlan.nombre}
                onChange={(e) => actualizarPlan('nombre', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: Mensual"
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

            <div className="md:col-span-4">
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

            <div className="flex flex-col gap-3 sm:flex-row md:col-span-4">
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

      {mostrarMembresia && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {formMembresia.renovacion_de_membresia_id ? 'Renovar membresía' : 'Registrar nueva membresía'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                La fecha de inicio se calcula para no perder días si el socio aún tiene vigencia.
              </p>
            </div>

            <button
              onClick={limpiarMembresia}
              className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

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
                {planesActivos.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nombre} - {formatearDinero(plan.precio)} - {plan.duracion_dias} días
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Fecha de inicio inteligente
              </label>
              <input
                type="date"
                value={formMembresia.fecha_inicio}
                onChange={(e) => actualizarMembresia('fecha_inicio', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
              <p className="mt-1 text-xs text-gray-500">
                El sistema evitará solapamientos de vigencia.
              </p>
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
                      sumarDias(
                        formMembresia.fecha_inicio,
                        planes.find((plan) => plan.id === formMembresia.plan_id)?.duracion_dias || 0
                      )
                    )
                  : 'Selecciona un plan'}
              </div>
            </div>

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

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Planes disponibles</h2>
            <p className="text-sm text-gray-500">
              Total de planes: {planes.length}
            </p>
          </div>
        </div>

        {planes.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No hay planes registrados.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3 md:p-5">
            {planes.map((plan) => (
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

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      plan.activo
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {plan.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

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
                Total registradas: {membresias.length}
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
              ['todas', 'Todas'],
              ['activa', 'Activas'],
              ['por_caducar', 'Por caducar'],
              ['vence_hoy', 'Vence hoy'],
              ['vencida', 'Vencidas'],
              ['suspendida', 'Suspendidas'],
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
            <p className="font-semibold text-gray-900">No hay membresías registradas</p>
            <p className="mt-1 text-sm text-gray-500">
              Registra la primera membresía para empezar.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
              {membresiasFiltradas.map((membresia) => {
                const pago = pagos.find((item) => item.membresia_id === membresia.id)
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

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-500">Pago</p>
                        <p className="font-bold text-gray-900">
                          {formatearDinero(pago?.monto)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {pago?.metodo_pago || '-'}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => renovarMembresia(membresia)}
                          className="rounded-lg border border-blue-100 p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
                          title="Renovar"
                        >
                          <RefreshCw size={17} />
                        </button>

                        {esDueno && (
                          <>
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
                  </div>
                )
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1150px] text-left text-sm">
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
                    const pago = pagos.find((item) => item.membresia_id === membresia.id)
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
                            {formatearDinero(pago?.monto)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {pago?.metodo_pago || '-'}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => renovarMembresia(membresia)}
                              className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
                              title="Renovar"
                            >
                              <RefreshCw size={17} />
                            </button>

                            {esDueno && (
                              <>
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