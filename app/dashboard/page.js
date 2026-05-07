'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { usePerfil } from '@/components/UserContext'
import {
  RefreshCw,
  Users,
  CreditCard,
  CalendarCheck,
  ShoppingCart,
  Package,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'

const supabase = createClient()

function obtenerFechaHoy() {
  const hoy = new Date()
  const year = hoy.getFullYear()
  const month = String(hoy.getMonth() + 1).padStart(2, '0')
  const day = String(hoy.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function crearInicioDiaISO(fecha) {
  return new Date(`${fecha}T00:00:00`).toISOString()
}

function crearFinDiaISO(fecha) {
  return new Date(`${fecha}T23:59:59`).toISOString()
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

function formatearHora(fecha) {
  if (!fecha) return '-'

  const date = new Date(fecha)

  return date.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function obtenerEstadoMembresia(membresia) {
  const hoy = obtenerFechaHoy()

  if (membresia.estado === 'suspendida') {
    return {
      estado: 'suspendida',
      texto: 'Suspendida',
      clase: 'bg-gray-100 text-gray-700',
    }
  }

  const dias = diferenciaDias(hoy, membresia.fecha_fin)

  if (dias < 0) {
    return {
      estado: 'vencida',
      texto: `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`,
      clase: 'bg-red-50 text-red-700',
    }
  }

  if (dias === 0) {
    return {
      estado: 'vence_hoy',
      texto: 'Vence hoy',
      clase: 'bg-yellow-50 text-yellow-700',
    }
  }

  if (dias <= 7) {
    return {
      estado: 'por_caducar',
      texto: `Vence en ${dias} día${dias === 1 ? '' : 's'}`,
      clase: 'bg-orange-50 text-orange-700',
    }
  }

  return {
    estado: 'activa',
    texto: `Vence en ${dias} días`,
    clase: 'bg-green-50 text-green-700',
  }
}

function TarjetaResumen({ titulo, valor, detalle, icono: Icon, tono = 'normal' }) {
  const valorClase =
    tono === 'rojo'
      ? 'text-red-700'
      : tono === 'verde'
        ? 'text-green-700'
        : tono === 'naranja'
          ? 'text-orange-700'
          : 'text-gray-900'

  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 md:text-sm">
            {titulo}
          </p>

          <h2 className={`mt-2 break-words text-2xl font-bold md:text-3xl ${valorClase}`}>
            {valor}
          </h2>

          {detalle && (
            <p className="mt-1 break-words text-xs text-gray-500 md:text-sm">
              {detalle}
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <Icon size={20} className="text-gray-600" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const perfil = usePerfil()
  const esEmpleado = perfil?.rol === 'empleado'

  const [miembros, setMiembros] = useState([])
  const [membresias, setMembresias] = useState([])
  const [asistenciasHoy, setAsistenciasHoy] = useState([])
  const [ventasHoy, setVentasHoy] = useState([])
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarDashboard()
  }, [])

  async function consultarTabla(tabla, consulta) {
    const { data, error } = await consulta

    if (error) {
      console.warn(`Error consultando ${tabla}:`, error.message)
      return []
    }

    return data || []
  }

  async function cargarDashboard() {
    setCargando(true)
    setError('')

    const hoy = obtenerFechaHoy()
    const inicioISO = crearInicioDiaISO(hoy)
    const finISO = crearFinDiaISO(hoy)

    try {
      const [
        dataMiembros,
        dataMembresias,
        dataAsistencias,
        dataVentas,
        dataProductos,
      ] = await Promise.all([
        consultarTabla(
          'miembros',
          supabase
            .from('miembros')
            .select('*')
            .order('created_at', { ascending: false })
        ),

        consultarTabla(
          'membresias',
          supabase
            .from('membresias')
            .select(`
              *,
              miembros (
                id,
                nombre,
                apellido,
                codigo_acceso,
                telefono
              ),
              planes (
                id,
                nombre
              )
            `)
            .order('fecha_fin', { ascending: true })
        ),

        consultarTabla(
          'asistencia',
          supabase
            .from('asistencia')
            .select(`
              *,
              miembros (
                id,
                nombre,
                apellido,
                codigo_acceso,
                foto_url
              )
            `)
            .gte('fecha_entrada', inicioISO)
            .lte('fecha_entrada', finISO)
            .order('fecha_entrada', { ascending: false })
        ),

        consultarTabla(
          'ventas',
          supabase
            .from('ventas')
            .select('*')
            .gte('fecha', inicioISO)
            .lte('fecha', finISO)
            .order('fecha', { ascending: false })
        ),

        consultarTabla(
          'productos',
          supabase
            .from('productos')
            .select('*')
            .order('nombre', { ascending: true })
        ),
      ])

      setMiembros(dataMiembros)
      setMembresias(dataMembresias)
      setAsistenciasHoy(dataAsistencias)
      setVentasHoy(dataVentas)
      setProductos(dataProductos)
    } catch (error) {
      setError(error.message)
    }

    setCargando(false)
  }

  const resumen = useMemo(() => {
    const hoy = obtenerFechaHoy()

    const miembrosActivos = miembros.filter((item) => item.estado === 'activo').length
    const miembrosInactivos = miembros.filter((item) => item.estado !== 'activo').length

    const membresiasConEstado = membresias.map((membresia) => ({
      ...membresia,
      estado_calculado: obtenerEstadoMembresia(membresia),
    }))

    const membresiasActivas = membresiasConEstado.filter((item) => {
      return item.estado_calculado.estado === 'activa'
    }).length

    const porCaducar = membresiasConEstado.filter((item) => {
      return item.estado_calculado.estado === 'por_caducar' || item.estado_calculado.estado === 'vence_hoy'
    })

    const vencidas = membresiasConEstado.filter((item) => {
      return item.estado_calculado.estado === 'vencida'
    })

    const sociosDistintosHoy = new Set(
      asistenciasHoy.map((item) => item.miembro_id)
    ).size

    const totalVentasHoy = ventasHoy.reduce((total, venta) => {
      return total + Number(venta.total || 0)
    }, 0)

    const productosBajoStock = productos.filter((producto) => {
      const stock = Number(producto.stock || 0)
      return stock <= 5
    })

    return {
      hoy,
      miembrosActivos,
      miembrosInactivos,
      membresiasActivas,
      porCaducar,
      vencidas,
      entradasHoy: asistenciasHoy.length,
      sociosDistintosHoy,
      totalVentasHoy,
      productosBajoStock,
    }
  }, [miembros, membresias, asistenciasHoy, ventasHoy, productos])

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold leading-tight text-gray-900 md:text-3xl">
            Dashboard
          </h1>

          <p className="mt-2 max-w-full break-words text-sm leading-relaxed text-gray-600 md:text-base">
            Panel operativo para recepción y administración del gimnasio.
          </p>
        </div>

        <button
          onClick={cargarDashboard}
          disabled={cargando}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900 md:p-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
              <ShieldCheck size={22} className="text-blue-700" />
            </div>

            <div className="min-w-0">
              <h2 className="break-words text-lg font-bold md:text-xl">
                Sesión de empleado
              </h2>

              <p className="mt-1 break-words text-sm leading-relaxed md:text-base">
                Tienes acceso operativo para registrar miembros, membresías, asistencias y ventas. Las secciones administrativas y financieras están restringidas.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaResumen
          titulo="Miembros activos"
          valor={cargando ? '-' : resumen.miembrosActivos}
          detalle={`${resumen.miembrosInactivos} no activos`}
          icono={Users}
          tono="verde"
        />

        <TarjetaResumen
          titulo="Membresías activas"
          valor={cargando ? '-' : resumen.membresiasActivas}
          detalle="Socios con vigencia regular"
          icono={CreditCard}
        />

        <TarjetaResumen
          titulo="Entradas de hoy"
          valor={cargando ? '-' : resumen.entradasHoy}
          detalle={`${resumen.sociosDistintosHoy} socios distintos`}
          icono={CalendarCheck}
        />

        <TarjetaResumen
          titulo="Ventas de hoy"
          valor={cargando ? '-' : formatearDinero(resumen.totalVentasHoy)}
          detalle="Ingresos por inventario"
          icono={ShoppingCart}
          tono="verde"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-2">
          <div className="border-b border-gray-200 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-lg font-bold text-gray-900">
                  Membresías por caducar
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Socios que debes avisar al ingresar.
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
                {resumen.porCaducar.length}
              </span>
            </div>
          </div>

          {cargando ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Cargando información...
            </div>
          ) : resumen.porCaducar.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No hay membresías próximas a vencer.
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {resumen.porCaducar.slice(0, 10).map((membresia) => {
                  const miembro = membresia.miembros || {}
                  const estado = membresia.estado_calculado

                  return (
                    <div key={membresia.id} className="p-4 md:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-words font-bold text-gray-900">
                            {miembro.nombre} {miembro.apellido}
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            Código: {miembro.codigo_acceso || '-'} · {miembro.telefono || 'Sin teléfono'}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Vence: {formatearFecha(membresia.fecha_fin)}
                          </p>
                        </div>

                        <span className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${estado.clase}`}>
                          {estado.texto}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-lg font-bold text-gray-900">
                  Alertas rápidas
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Pendientes importantes.
                </p>
              </div>

              <AlertTriangle size={22} className="shrink-0 text-orange-500" />
            </div>
          </div>

          <div className="space-y-3 p-4 md:p-5">
            <div className="rounded-2xl bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">
                Membresías vencidas
              </p>
              <p className="mt-1 text-2xl font-bold text-red-700">
                {cargando ? '-' : resumen.vencidas.length}
              </p>
            </div>

            <div className="rounded-2xl bg-orange-50 p-4">
              <p className="text-sm font-semibold text-orange-700">
                Por caducar
              </p>
              <p className="mt-1 text-2xl font-bold text-orange-700">
                {cargando ? '-' : resumen.porCaducar.length}
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700">
                Bajo stock
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {cargando ? '-' : resumen.productosBajoStock.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-4 md:p-5">
            <h2 className="break-words text-lg font-bold text-gray-900">
              Últimas entradas de hoy
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Registros más recientes de asistencia.
            </p>
          </div>

          {cargando ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Cargando entradas...
            </div>
          ) : asistenciasHoy.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No hay entradas registradas hoy.
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {asistenciasHoy.slice(0, 10).map((asistencia) => (
                  <div key={asistencia.id} className="flex items-center gap-3 p-4 md:p-5">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gray-100">
                      {asistencia.miembros?.foto_url ? (
                        <img
                          src={asistencia.miembros.foto_url}
                          alt="Foto socio"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Users size={18} className="text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900">
                        {asistencia.miembros?.nombre} {asistencia.miembros?.apellido}
                      </p>
                      <p className="text-sm text-gray-500">
                        Código: {asistencia.miembros?.codigo_acceso || '-'}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {formatearHora(asistencia.fecha_entrada)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Entrada
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-4 md:p-5">
            <h2 className="break-words text-lg font-bold text-gray-900">
              Productos con bajo stock
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Revisa reposición de inventario.
            </p>
          </div>

          {cargando ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Cargando inventario...
            </div>
          ) : resumen.productosBajoStock.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No hay productos con bajo stock.
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {resumen.productosBajoStock.slice(0, 10).map((producto) => (
                  <div key={producto.id} className="flex items-center justify-between gap-3 p-4 md:p-5">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">
                        {producto.nombre}
                      </p>
                      <p className="text-sm text-gray-500">
                        Precio: {formatearDinero(producto.precio)}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                      Stock {producto.stock || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {!esEmpleado && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h2 className="break-words text-lg font-bold text-gray-900">
                Resumen administrativo
              </h2>
              <p className="mt-1 break-words text-sm text-gray-500">
                Vista general de operación, membresías, ventas e inventario.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-green-600" />
                  <p className="text-sm font-semibold text-gray-700">Ventas hoy</p>
                </div>
                <p className="mt-2 text-xl font-bold text-gray-900">
                  {formatearDinero(resumen.totalVentasHoy)}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-gray-600" />
                  <p className="text-sm font-semibold text-gray-700">Productos</p>
                </div>
                <p className="mt-2 text-xl font-bold text-gray-900">
                  {productos.length}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-gray-600" />
                  <p className="text-sm font-semibold text-gray-700">Vencidas</p>
                </div>
                <p className="mt-2 text-xl font-bold text-red-700">
                  {resumen.vencidas.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}