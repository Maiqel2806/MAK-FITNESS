'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { usePerfil } from '@/components/UserContext'
import {
  Users,
  CreditCard,
  CalendarCheck,
  AlertTriangle,
  TrendingUp,
  Clock,
  UserRound,
  RefreshCw,
  Package,
  ShoppingCart,
  ShieldCheck,
  ClipboardCheck,
  Plus,
} from 'lucide-react'

const supabase = createClient()

function obtenerFechaHoy() {
  const hoy = new Date()
  const year = hoy.getFullYear()
  const month = String(hoy.getMonth() + 1).padStart(2, '0')
  const day = String(hoy.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function obtenerInicioMes() {
  const hoy = new Date()
  const year = hoy.getFullYear()
  const month = String(hoy.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

function crearInicioDiaISO(fecha) {
  return new Date(`${fecha}T00:00:00`).toISOString()
}

function crearFinDiaISO(fecha) {
  return new Date(`${fecha}T23:59:59`).toISOString()
}

function sumarDias(fecha, dias) {
  const date = new Date(`${fecha}T00:00:00`)
  date.setDate(date.getDate() + Number(dias || 0))
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

function formatearFechaHora(fecha) {
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

function formatearHora(fecha) {
  if (!fecha) return '-'

  const date = new Date(fecha)

  return date.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DashboardPage() {
  const perfil = usePerfil()
  const esDueno = perfil?.rol === 'dueno'
  const esEmpleado = perfil?.rol === 'empleado'

  const [miembros, setMiembros] = useState([])
  const [membresias, setMembresias] = useState([])
  const [pagos, setPagos] = useState([])
  const [asistencias, setAsistencias] = useState([])
  const [ventas, setVentas] = useState([])
  const [productos, setProductos] = useState([])

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarDashboard()
  }, [esDueno])

  async function cargarDashboard() {
    setCargando(true)
    setError('')

    const hoy = obtenerFechaHoy()
    const inicioMes = obtenerInicioMes()

    const inicioHoyISO = crearInicioDiaISO(hoy)
    const finHoyISO = crearFinDiaISO(hoy)
    const inicioMesISO = crearInicioDiaISO(inicioMes)
    const finHoyCompletoISO = crearFinDiaISO(hoy)

    const consultasBase = [
      supabase
        .from('miembros')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('membresias')
        .select(`
          *,
          miembros (
            id,
            nombre,
            apellido,
            cedula,
            telefono
          ),
          planes (
            id,
            nombre,
            precio,
            duracion_dias
          )
        `)
        .order('created_at', { ascending: false }),

      supabase
        .from('asistencia')
        .select(`
          *,
          miembros (
            id,
            nombre,
            apellido,
            cedula,
            telefono,
            foto_url
          )
        `)
        .gte('fecha_entrada', inicioHoyISO)
        .lte('fecha_entrada', finHoyISO)
        .order('fecha_entrada', { ascending: false }),

      supabase
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true }),
    ]

    const consultasDueno = esDueno
      ? [
          supabase
            .from('pagos')
            .select(`
              *,
              miembros (
                id,
                nombre,
                apellido,
                cedula
              )
            `)
            .gte('fecha_pago', inicioMesISO)
            .lte('fecha_pago', finHoyCompletoISO)
            .order('fecha_pago', { ascending: false }),

          supabase
            .from('ventas')
            .select(`
              *,
              miembros (
                id,
                nombre,
                apellido,
                cedula
              ),
              ventas_detalle (
                id,
                producto_id,
                cantidad,
                precio_unitario,
                productos (
                  id,
                  nombre,
                  categoria
                )
              )
            `)
            .gte('fecha', inicioMesISO)
            .lte('fecha', finHoyCompletoISO)
            .order('fecha', { ascending: false }),
        ]
      : []

    const respuestas = await Promise.all([
      ...consultasBase,
      ...consultasDueno,
    ])

    const respuestaMiembros = respuestas[0]
    const respuestaMembresias = respuestas[1]
    const respuestaAsistencias = respuestas[2]
    const respuestaProductos = respuestas[3]
    const respuestaPagos = esDueno ? respuestas[4] : { data: [], error: null }
    const respuestaVentas = esDueno ? respuestas[5] : { data: [], error: null }

    const errores = [
      respuestaMiembros.error,
      respuestaMembresias.error,
      respuestaAsistencias.error,
      respuestaProductos.error,
      respuestaPagos.error,
      respuestaVentas.error,
    ].filter(Boolean)

    if (errores.length > 0) {
      setError(errores[0].message)
    }

    setMiembros(respuestaMiembros.data || [])
    setMembresias(respuestaMembresias.data || [])
    setAsistencias(respuestaAsistencias.data || [])
    setProductos(respuestaProductos.data || [])
    setPagos(respuestaPagos.data || [])
    setVentas(respuestaVentas.data || [])

    setCargando(false)
  }

  const datos = useMemo(() => {
    const hoy = obtenerFechaHoy()
    const limiteProximosVencimientos = sumarDias(hoy, 7)

    const miembrosActivos = miembros.filter((miembro) => miembro.estado === 'activo')
    const miembrosInactivos = miembros.filter((miembro) => miembro.estado !== 'activo')

    const membresiasConEstadoReal = membresias.map((membresia) => {
      if (membresia.estado === 'suspendida') {
        return {
          ...membresia,
          estado_real: 'suspendida',
        }
      }

      if (membresia.fecha_fin < hoy) {
        return {
          ...membresia,
          estado_real: 'vencida',
        }
      }

      return {
        ...membresia,
        estado_real: 'activa',
      }
    })

    const membresiasActivas = membresiasConEstadoReal.filter(
      (membresia) => membresia.estado_real === 'activa'
    )

    const membresiasVencidas = membresiasConEstadoReal.filter(
      (membresia) => membresia.estado_real === 'vencida'
    )

    const membresiasSuspendidas = membresiasConEstadoReal.filter(
      (membresia) => membresia.estado_real === 'suspendida'
    )

    const proximosVencimientos = membresiasConEstadoReal
      .filter((membresia) => {
        return (
          membresia.estado_real === 'activa' &&
          membresia.fecha_fin >= hoy &&
          membresia.fecha_fin <= limiteProximosVencimientos
        )
      })
      .sort((a, b) => String(a.fecha_fin).localeCompare(String(b.fecha_fin)))
      .slice(0, 6)

    const miembrosConAsistenciaHoy = new Set(
      asistencias.map((asistencia) => asistencia.miembro_id)
    )

    const ingresosMembresias = pagos.reduce((total, pago) => {
      return total + Number(pago.monto || 0)
    }, 0)

    const ingresosVentas = ventas.reduce((total, venta) => {
      return total + Number(venta.total || 0)
    }, 0)

    const productosBajoStock = productos
      .filter((producto) => {
        return (
          producto.activo &&
          Number(producto.stock || 0) <= Number(producto.stock_minimo || 0)
        )
      })
      .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))
      .slice(0, 6)

    const productosActivos = productos.filter((producto) => producto.activo)

    const ultimosMiembros = miembros.slice(0, 5)
    const ultimasAsistencias = asistencias.slice(0, 8)
    const ultimosPagos = pagos.slice(0, 5)
    const ultimasVentas = ventas.slice(0, 5)

    return {
      miembrosActivos,
      miembrosInactivos,
      membresiasActivas,
      membresiasVencidas,
      membresiasSuspendidas,
      proximosVencimientos,
      miembrosConAsistenciaHoy,
      ingresosMembresias,
      ingresosVentas,
      ingresosTotales: ingresosMembresias + ingresosVentas,
      productosBajoStock,
      productosActivos,
      ultimosMiembros,
      ultimasAsistencias,
      ultimosPagos,
      ultimasVentas,
    }
  }, [miembros, membresias, pagos, asistencias, ventas, productos])

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            {esDueno
              ? 'Resumen general administrativo de MAK FITNESS.'
              : 'Panel operativo para recepción y atención diaria.'}
          </p>
        </div>

        <button
          onClick={cargarDashboard}
          disabled={cargando}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={18} />
          {cargando ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {esEmpleado && (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <ShieldCheck size={22} className="text-blue-700" />
            </div>

            <div>
              <h2 className="font-bold text-blue-900">
                Sesión de empleado
              </h2>
              <p className="mt-1 text-sm text-blue-800">
                Tienes acceso operativo para registrar miembros, membresías, asistencias y ventas. Las secciones administrativas y financieras están restringidas.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Miembros activos</p>
            <Users size={22} className="text-gray-400" />
          </div>

          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {cargando ? '-' : datos.miembrosActivos.length}
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Inactivos o suspendidos: {cargando ? '-' : datos.miembrosInactivos.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Entradas hoy</p>
            <CalendarCheck size={22} className="text-gray-400" />
          </div>

          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {cargando ? '-' : asistencias.length}
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Socios distintos: {cargando ? '-' : datos.miembrosConAsistenciaHoy.size}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Membresías vencidas</p>
            <AlertTriangle size={22} className="text-gray-400" />
          </div>

          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {cargando ? '-' : datos.membresiasVencidas.length}
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Próximas a vencer: {cargando ? '-' : datos.proximosVencimientos.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Productos bajo stock</p>
            <Package size={22} className="text-gray-400" />
          </div>

          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {cargando ? '-' : datos.productosBajoStock.length}
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Productos activos: {cargando ? '-' : datos.productosActivos.length}
          </p>
        </div>
      </div>

      {esDueno && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Ingresos del mes</p>
              <TrendingUp size={22} className="text-gray-400" />
            </div>

            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {cargando ? '-' : formatearDinero(datos.ingresosTotales)}
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Membresías + ventas
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Ingresos membresías</p>
              <CreditCard size={22} className="text-gray-400" />
            </div>

            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {cargando ? '-' : formatearDinero(datos.ingresosMembresias)}
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Pagos registrados: {cargando ? '-' : pagos.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Ingresos ventas</p>
              <ShoppingCart size={22} className="text-gray-400" />
            </div>

            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {cargando ? '-' : formatearDinero(datos.ingresosVentas)}
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Ventas registradas: {cargando ? '-' : ventas.length}
            </p>
          </div>
        </div>
      )}

      {esEmpleado && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Acciones rápidas</h2>
          <p className="mt-1 text-sm text-gray-500">
            Accesos frecuentes para operación diaria.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Link
              href="/miembros"
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                <Plus size={20} className="text-gray-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Nuevo miembro</p>
                <p className="text-xs text-gray-500">Registrar socio</p>
              </div>
            </Link>

            <Link
              href="/membresias"
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                <CreditCard size={20} className="text-gray-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Membresía</p>
                <p className="text-xs text-gray-500">Asignar plan</p>
              </div>
            </Link>

            <Link
              href="/asistencia"
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                <ClipboardCheck size={20} className="text-gray-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Asistencia</p>
                <p className="text-xs text-gray-500">Validar entrada</p>
              </div>
            </Link>

            <Link
              href="/inventario"
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                <ShoppingCart size={20} className="text-gray-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Venta</p>
                <p className="text-xs text-gray-500">Registrar producto</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-2">
          <div className="border-b border-gray-200 p-5">
            <h2 className="text-lg font-bold text-gray-900">Estado de membresías</h2>
            <p className="mt-1 text-sm text-gray-500">
              Resumen operativo actual.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
            <div className="rounded-2xl bg-green-50 p-5">
              <p className="text-sm font-medium text-green-700">Activas</p>
              <h3 className="mt-2 text-3xl font-bold text-green-800">
                {cargando ? '-' : datos.membresiasActivas.length}
              </h3>
            </div>

            <div className="rounded-2xl bg-red-50 p-5">
              <p className="text-sm font-medium text-red-700">Vencidas</p>
              <h3 className="mt-2 text-3xl font-bold text-red-800">
                {cargando ? '-' : datos.membresiasVencidas.length}
              </h3>
            </div>

            <div className="rounded-2xl bg-yellow-50 p-5">
              <p className="text-sm font-medium text-yellow-700">Suspendidas</p>
              <h3 className="mt-2 text-3xl font-bold text-yellow-800">
                {cargando ? '-' : datos.membresiasSuspendidas.length}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900">
                Próximos vencimientos
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Membresías que vencen en 7 días.
            </p>
          </div>

          <div className="p-5">
            {cargando ? (
              <p className="text-sm text-gray-500">Cargando...</p>
            ) : datos.proximosVencimientos.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay vencimientos próximos.
              </p>
            ) : (
              <div className="space-y-4">
                {datos.proximosVencimientos.map((membresia) => (
                  <div
                    key={membresia.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <p className="font-semibold text-gray-900">
                      {membresia.miembros?.nombre} {membresia.miembros?.apellido}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {membresia.planes?.nombre || 'Sin plan'} · vence {formatearFecha(membresia.fecha_fin)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <h2 className="text-lg font-bold text-gray-900">Entradas de hoy</h2>
            <p className="mt-1 text-sm text-gray-500">
              Últimas asistencias verificadas.
            </p>
          </div>

          <div className="p-5">
            {cargando ? (
              <p className="text-sm text-gray-500">Cargando...</p>
            ) : datos.ultimasAsistencias.length === 0 ? (
              <p className="text-sm text-gray-500">
                Todavía no hay entradas registradas hoy.
              </p>
            ) : (
              <div className="space-y-4">
                {datos.ultimasAsistencias.map((asistencia) => (
                  <div
                    key={asistencia.id}
                    className="flex items-center gap-4 rounded-xl border border-gray-200 p-4"
                  >
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-100">
                      {asistencia.miembros?.foto_url ? (
                        <img
                          src={asistencia.miembros.foto_url}
                          alt="Foto del socio"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <UserRound size={18} className="text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">
                        {asistencia.miembros?.nombre} {asistencia.miembros?.apellido}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {formatearHora(asistencia.fecha_entrada)} · {asistencia.origen_registro || 'manual'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <h2 className="text-lg font-bold text-gray-900">Últimos miembros</h2>
            <p className="mt-1 text-sm text-gray-500">
              Socios registrados recientemente.
            </p>
          </div>

          <div className="p-5">
            {cargando ? (
              <p className="text-sm text-gray-500">Cargando...</p>
            ) : datos.ultimosMiembros.length === 0 ? (
              <p className="text-sm text-gray-500">
                Todavía no hay miembros registrados.
              </p>
            ) : (
              <div className="space-y-4">
                {datos.ultimosMiembros.map((miembro) => (
                  <div
                    key={miembro.id}
                    className="flex items-center gap-4 rounded-xl border border-gray-200 p-4"
                  >
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-100">
                      {miembro.foto_url ? (
                        <img
                          src={miembro.foto_url}
                          alt="Foto del socio"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <UserRound size={18} className="text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">
                        {miembro.nombre} {miembro.apellido}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {miembro.cedula || 'Sin cédula'} · {miembro.telefono || 'Sin teléfono'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="text-lg font-bold text-gray-900">Productos con bajo stock</h2>
          <p className="mt-1 text-sm text-gray-500">
            Productos activos que necesitan reposición.
          </p>
        </div>

        {datos.productosBajoStock.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No hay productos con bajo stock.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {datos.productosBajoStock.map((producto) => (
              <div
                key={producto.id}
                className="flex flex-col gap-2 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-bold text-gray-900">
                    {producto.nombre}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {producto.categoria || 'Sin categoría'} · stock mínimo: {producto.stock_minimo}
                  </p>
                </div>

                <span className="inline-flex w-fit rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-700">
                  Stock: {producto.stock}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {esDueno && (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-900">Últimos pagos</h2>
              <p className="mt-1 text-sm text-gray-500">
                Pagos de membresías registrados este mes.
              </p>
            </div>

            <div className="p-5">
              {datos.ultimosPagos.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Todavía no hay pagos registrados este mes.
                </p>
              ) : (
                <div className="space-y-4">
                  {datos.ultimosPagos.map((pago) => (
                    <div
                      key={pago.id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 p-4"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {pago.miembros?.nombre} {pago.miembros?.apellido}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {formatearFechaHora(pago.fecha_pago)} · {pago.metodo_pago}
                        </p>
                      </div>

                      <p className="text-lg font-bold text-gray-900">
                        {formatearDinero(pago.monto)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-900">Últimas ventas</h2>
              <p className="mt-1 text-sm text-gray-500">
                Ventas de inventario registradas este mes.
              </p>
            </div>

            <div className="p-5">
              {datos.ultimasVentas.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Todavía no hay ventas registradas este mes.
                </p>
              ) : (
                <div className="space-y-4">
                  {datos.ultimasVentas.map((venta) => (
                    <div
                      key={venta.id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 p-4"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {venta.miembros
                            ? `${venta.miembros.nombre} ${venta.miembros.apellido}`
                            : 'Venta sin miembro asociado'}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {formatearFechaHora(venta.fecha)} · {venta.metodo_pago}
                        </p>
                      </div>

                      <p className="text-lg font-bold text-gray-900">
                        {formatearDinero(venta.total)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}