'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  RefreshCw,
  Download,
  Users,
  CreditCard,
  CalendarCheck,
  AlertTriangle,
  Package,
  ShoppingCart,
  TrendingUp,
  Clock,
  BarChart3,
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

function obtenerFechaLocalDesdeISO(fecha) {
  if (!fecha) return ''
  const date = new Date(fecha)
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

function prepararCSV(valor) {
  const texto = String(valor ?? '')
  return `"${texto.replaceAll('"', '""')}"`
}

function descargarCSV(nombreArchivo, filas) {
  if (!filas.length) return

  const encabezados = Object.keys(filas[0])
  const contenido = [
    encabezados.map(prepararCSV).join(','),
    ...filas.map((fila) =>
      encabezados.map((encabezado) => prepararCSV(fila[encabezado])).join(',')
    ),
  ].join('\n')

  const blob = new Blob([contenido], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombreArchivo
  link.click()
  URL.revokeObjectURL(url)
}

export default function ReportesPage() {
  const [fechaDesde, setFechaDesde] = useState(obtenerInicioMes())
  const [fechaHasta, setFechaHasta] = useState(obtenerFechaHoy())

  const [miembros, setMiembros] = useState([])
  const [membresias, setMembresias] = useState([])
  const [pagos, setPagos] = useState([])
  const [asistencias, setAsistencias] = useState([])
  const [ventas, setVentas] = useState([])
  const [productos, setProductos] = useState([])

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarReportes()
  }, [])

  async function cargarReportes() {
    setCargando(true)
    setError('')

    const inicioISO = crearInicioDiaISO(fechaDesde)
    const finISO = crearFinDiaISO(fechaHasta)

    const [
      respuestaMiembros,
      respuestaMembresias,
      respuestaPagos,
      respuestaAsistencias,
      respuestaVentas,
      respuestaProductos,
    ] = await Promise.all([
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
        .order('fecha_fin', { ascending: true }),

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
        .gte('fecha_pago', inicioISO)
        .lte('fecha_pago', finISO)
        .order('fecha_pago', { ascending: false }),

      supabase
        .from('asistencia')
        .select(`
          *,
          miembros (
            id,
            nombre,
            apellido,
            cedula,
            telefono
          )
        `)
        .gte('fecha_entrada', inicioISO)
        .lte('fecha_entrada', finISO)
        .order('fecha_entrada', { ascending: false }),

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
        .gte('fecha', inicioISO)
        .lte('fecha', finISO)
        .order('fecha', { ascending: false }),

      supabase
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true }),
    ])

    const errores = [
      respuestaMiembros.error,
      respuestaMembresias.error,
      respuestaPagos.error,
      respuestaAsistencias.error,
      respuestaVentas.error,
      respuestaProductos.error,
    ].filter(Boolean)

    if (errores.length > 0) {
      setError(errores[0].message)
    }

    setMiembros(respuestaMiembros.data || [])
    setMembresias(respuestaMembresias.data || [])
    setPagos(respuestaPagos.data || [])
    setAsistencias(respuestaAsistencias.data || [])
    setVentas(respuestaVentas.data || [])
    setProductos(respuestaProductos.data || [])

    setCargando(false)
  }

  const datos = useMemo(() => {
    const hoy = obtenerFechaHoy()
    const limiteVencimientos = sumarDias(hoy, 7)

    const inicioRango = new Date(crearInicioDiaISO(fechaDesde))
    const finRango = new Date(crearFinDiaISO(fechaHasta))

    const miembrosActivos = miembros.filter((miembro) => miembro.estado === 'activo')
    const miembrosInactivos = miembros.filter((miembro) => miembro.estado !== 'activo')

    const miembrosNuevos = miembros.filter((miembro) => {
      const fecha = new Date(miembro.created_at)
      return fecha >= inicioRango && fecha <= finRango
    })

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
          membresia.fecha_fin <= limiteVencimientos
        )
      })
      .sort((a, b) => String(a.fecha_fin).localeCompare(String(b.fecha_fin)))
      .slice(0, 10)

    const vencidasRecientes = membresiasVencidas
      .sort((a, b) => String(b.fecha_fin).localeCompare(String(a.fecha_fin)))
      .slice(0, 10)

    const ingresosMembresias = pagos.reduce((total, pago) => {
      return total + Number(pago.monto || 0)
    }, 0)

    const ingresosVentas = ventas.reduce((total, venta) => {
      return total + Number(venta.total || 0)
    }, 0)

    const ingresosTotales = ingresosMembresias + ingresosVentas

    const metodos = ['efectivo', 'transferencia', 'tarjeta']

    const ingresosPorMetodo = metodos.map((metodo) => {
      const totalMembresias = pagos
        .filter((pago) => pago.metodo_pago === metodo)
        .reduce((total, pago) => total + Number(pago.monto || 0), 0)

      const totalVentas = ventas
        .filter((venta) => venta.metodo_pago === metodo)
        .reduce((total, venta) => total + Number(venta.total || 0), 0)

      return {
        metodo,
        membresias: totalMembresias,
        ventas: totalVentas,
        total: totalMembresias + totalVentas,
      }
    })

    const sociosDistintosAsistencia = new Set(
      asistencias.map((asistencia) => asistencia.miembro_id)
    )

    const asistenciaPorDiaMapa = new Map()

    asistencias.forEach((asistencia) => {
      const fecha = obtenerFechaLocalDesdeISO(asistencia.fecha_entrada)

      if (!asistenciaPorDiaMapa.has(fecha)) {
        asistenciaPorDiaMapa.set(fecha, {
          fecha,
          entradas: 0,
          socios: new Set(),
          manual: 0,
          biometrico: 0,
          app_otp: 0,
          qr: 0,
        })
      }

      const registro = asistenciaPorDiaMapa.get(fecha)
      registro.entradas += 1
      registro.socios.add(asistencia.miembro_id)

      if (asistencia.origen_registro === 'biometrico') {
        registro.biometrico += 1
      } else if (asistencia.origen_registro === 'app_otp') {
        registro.app_otp += 1
      } else if (asistencia.origen_registro === 'qr') {
        registro.qr += 1
      } else {
        registro.manual += 1
      }
    })

    const asistenciaPorDia = Array.from(asistenciaPorDiaMapa.values())
      .map((item) => ({
        fecha: item.fecha,
        entradas: item.entradas,
        socios_distintos: item.socios.size,
        manual: item.manual,
        biometrico: item.biometrico,
        app_otp: item.app_otp,
        qr: item.qr,
      }))
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))

    const productosBajoStock = productos
      .filter((producto) => {
        return (
          producto.activo &&
          Number(producto.stock || 0) <= Number(producto.stock_minimo || 0)
        )
      })
      .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))

    const productosVendidosMapa = new Map()

    ventas.forEach((venta) => {
      ;(venta.ventas_detalle || []).forEach((detalle) => {
        const productoId = detalle.producto_id
        const nombreProducto = detalle.productos?.nombre || 'Producto'
        const categoria = detalle.productos?.categoria || 'Sin categoría'

        if (!productosVendidosMapa.has(productoId)) {
          productosVendidosMapa.set(productoId, {
            producto_id: productoId,
            nombre: nombreProducto,
            categoria,
            cantidad: 0,
            total: 0,
          })
        }

        const actual = productosVendidosMapa.get(productoId)
        actual.cantidad += Number(detalle.cantidad || 0)
        actual.total += Number(detalle.cantidad || 0) * Number(detalle.precio_unitario || 0)
      })
    })

    const productosMasVendidos = Array.from(productosVendidosMapa.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10)

    const ventasRecientes = ventas.slice(0, 8)
    const pagosRecientes = pagos.slice(0, 8)

    return {
      miembrosActivos,
      miembrosInactivos,
      miembrosNuevos,
      membresiasActivas,
      membresiasVencidas,
      membresiasSuspendidas,
      proximosVencimientos,
      vencidasRecientes,
      ingresosMembresias,
      ingresosVentas,
      ingresosTotales,
      ingresosPorMetodo,
      sociosDistintosAsistencia: sociosDistintosAsistencia.size,
      asistenciaPorDia,
      productosBajoStock,
      productosMasVendidos,
      ventasRecientes,
      pagosRecientes,
    }
  }, [miembros, membresias, pagos, asistencias, ventas, productos, fechaDesde, fechaHasta])

  function exportarResumen() {
    descargarCSV(`reporte_resumen_${fechaDesde}_${fechaHasta}.csv`, [
      {
        indicador: 'Miembros activos',
        valor: datos.miembrosActivos.length,
      },
      {
        indicador: 'Miembros inactivos o suspendidos',
        valor: datos.miembrosInactivos.length,
      },
      {
        indicador: 'Miembros nuevos en el rango',
        valor: datos.miembrosNuevos.length,
      },
      {
        indicador: 'Membresías activas',
        valor: datos.membresiasActivas.length,
      },
      {
        indicador: 'Membresías vencidas',
        valor: datos.membresiasVencidas.length,
      },
      {
        indicador: 'Membresías suspendidas',
        valor: datos.membresiasSuspendidas.length,
      },
      {
        indicador: 'Ingresos por membresías',
        valor: datos.ingresosMembresias,
      },
      {
        indicador: 'Ingresos por ventas',
        valor: datos.ingresosVentas,
      },
      {
        indicador: 'Ingresos totales',
        valor: datos.ingresosTotales,
      },
      {
        indicador: 'Entradas registradas',
        valor: asistencias.length,
      },
      {
        indicador: 'Socios distintos que asistieron',
        valor: datos.sociosDistintosAsistencia,
      },
      {
        indicador: 'Productos con bajo stock',
        valor: datos.productosBajoStock.length,
      },
    ])
  }

  function exportarAsistencias() {
    descargarCSV(
      `reporte_asistencias_${fechaDesde}_${fechaHasta}.csv`,
      asistencias.map((asistencia) => ({
        fecha_entrada: formatearFechaHora(asistencia.fecha_entrada),
        miembro: `${asistencia.miembros?.nombre || ''} ${asistencia.miembros?.apellido || ''}`.trim(),
        cedula: asistencia.miembros?.cedula || '',
        origen: asistencia.origen_registro || 'manual',
        metodo_verificacion: asistencia.metodo_verificacion || '',
        verificado_visualmente: asistencia.verificado_visualmente ? 'Sí' : 'No',
      }))
    )
  }

  function exportarIngresos() {
    const filasPagos = pagos.map((pago) => ({
      tipo: 'Membresía',
      fecha: formatearFechaHora(pago.fecha_pago),
      cliente: `${pago.miembros?.nombre || ''} ${pago.miembros?.apellido || ''}`.trim(),
      cedula: pago.miembros?.cedula || '',
      metodo_pago: pago.metodo_pago,
      total: pago.monto,
    }))

    const filasVentas = ventas.map((venta) => ({
      tipo: 'Venta inventario',
      fecha: formatearFechaHora(venta.fecha),
      cliente: venta.miembros
        ? `${venta.miembros.nombre || ''} ${venta.miembros.apellido || ''}`.trim()
        : 'Sin miembro asociado',
      cedula: venta.miembros?.cedula || '',
      metodo_pago: venta.metodo_pago,
      total: venta.total,
    }))

    descargarCSV(`reporte_ingresos_${fechaDesde}_${fechaHasta}.csv`, [
      ...filasPagos,
      ...filasVentas,
    ])
  }

  return (
    <div>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
          <p className="mt-2 text-gray-600">
            Resumen consolidado de miembros, ingresos, asistencias, membresías e inventario.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>
          </div>

          <button
            onClick={cargarReportes}
            disabled={cargando}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 md:self-end"
          >
            <RefreshCw size={18} />
            {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 md:flex-row">
        <button
          onClick={exportarResumen}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
        >
          <Download size={18} />
          Exportar resumen
        </button>

        <button
          onClick={exportarIngresos}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
        >
          <Download size={18} />
          Exportar ingresos
        </button>

        <button
          onClick={exportarAsistencias}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
        >
          <Download size={18} />
          Exportar asistencias
        </button>
      </div>

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
            Nuevos en rango: {cargando ? '-' : datos.miembrosNuevos.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Membresías activas</p>
            <CreditCard size={22} className="text-gray-400" />
          </div>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {cargando ? '-' : datos.membresiasActivas.length}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Vencidas: {cargando ? '-' : datos.membresiasVencidas.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Ingresos totales</p>
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
            <p className="text-sm text-gray-500">Entradas registradas</p>
            <CalendarCheck size={22} className="text-gray-400" />
          </div>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {cargando ? '-' : asistencias.length}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Socios distintos: {cargando ? '-' : datos.sociosDistintosAsistencia}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Ingresos membresías</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {cargando ? '-' : formatearDinero(datos.ingresosMembresias)}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Ingresos ventas</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {cargando ? '-' : formatearDinero(datos.ingresosVentas)}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Productos bajo stock</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {cargando ? '-' : datos.productosBajoStock.length}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Ventas registradas</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {cargando ? '-' : ventas.length}
          </h2>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <h2 className="text-lg font-bold text-gray-900">Ingresos por método de pago</h2>
            <p className="text-sm text-gray-500">
              Incluye pagos de membresías y ventas de inventario.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Método</th>
                  <th className="px-5 py-3">Membresías</th>
                  <th className="px-5 py-3">Ventas</th>
                  <th className="px-5 py-3">Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {datos.ingresosPorMetodo.map((item) => (
                  <tr key={item.metodo}>
                    <td className="px-5 py-4 font-semibold capitalize text-gray-900">
                      {item.metodo}
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {formatearDinero(item.membresias)}
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {formatearDinero(item.ventas)}
                    </td>
                    <td className="px-5 py-4 font-bold text-gray-900">
                      {formatearDinero(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <h2 className="text-lg font-bold text-gray-900">Asistencia por día</h2>
            <p className="text-sm text-gray-500">
              Entradas registradas dentro del rango.
            </p>
          </div>

          {datos.asistenciaPorDia.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No hay asistencias en este rango.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Entradas</th>
                    <th className="px-5 py-3">Socios distintos</th>
                    <th className="px-5 py-3">Manual</th>
                    <th className="px-5 py-3">Biométrico</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {datos.asistenciaPorDia.map((item) => (
                    <tr key={item.fecha}>
                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {formatearFecha(item.fecha)}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {item.entradas}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {item.socios_distintos}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {item.manual}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {item.biometrico}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900">Próximos vencimientos</h2>
            </div>
            <p className="text-sm text-gray-500">
              Membresías activas que vencen en los próximos 7 días.
            </p>
          </div>

          {datos.proximosVencimientos.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No hay vencimientos próximos.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {datos.proximosVencimientos.map((membresia) => (
                <div key={membresia.id} className="p-5">
                  <p className="font-bold text-gray-900">
                    {membresia.miembros?.nombre} {membresia.miembros?.apellido}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {membresia.miembros?.cedula || 'Sin cédula'} · {membresia.planes?.nombre || 'Sin plan'}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-red-700">
                    Vence: {formatearFecha(membresia.fecha_fin)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900">Productos bajo stock</h2>
            </div>
            <p className="text-sm text-gray-500">
              Productos activos con stock igual o menor al mínimo.
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
                  className="flex items-center justify-between gap-4 p-5"
                >
                  <div>
                    <p className="font-bold text-gray-900">{producto.nombre}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {producto.categoria || 'Sin categoría'} · mínimo: {producto.stock_minimo}
                    </p>
                  </div>

                  <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-700">
                    Stock: {producto.stock}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <div className="flex items-center gap-2">
              <Package size={20} className="text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900">Productos más vendidos</h2>
            </div>
            <p className="text-sm text-gray-500">
              Ranking por cantidad vendida en el rango.
            </p>
          </div>

          {datos.productosMasVendidos.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No hay productos vendidos en este rango.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Producto</th>
                    <th className="px-5 py-3">Categoría</th>
                    <th className="px-5 py-3">Cantidad</th>
                    <th className="px-5 py-3">Total</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {datos.productosMasVendidos.map((producto) => (
                    <tr key={producto.producto_id}>
                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {producto.nombre}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {producto.categoria}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {producto.cantidad}
                      </td>
                      <td className="px-5 py-4 font-bold text-gray-900">
                        {formatearDinero(producto.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} className="text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900">Últimas ventas</h2>
            </div>
            <p className="text-sm text-gray-500">
              Ventas recientes dentro del rango seleccionado.
            </p>
          </div>

          {datos.ventasRecientes.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No hay ventas registradas en este rango.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {datos.ventasRecientes.map((venta) => (
                <div
                  key={venta.id}
                  className="flex items-center justify-between gap-4 p-5"
                >
                  <div>
                    <p className="font-bold text-gray-900">
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

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-gray-500" />
            <h2 className="text-lg font-bold text-gray-900">Pagos recientes de membresías</h2>
          </div>
          <p className="text-sm text-gray-500">
            Últimos pagos registrados dentro del rango.
          </p>
        </div>

        {datos.pagosRecientes.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No hay pagos de membresías en este rango.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Miembro</th>
                  <th className="px-5 py-3">Cédula</th>
                  <th className="px-5 py-3">Método</th>
                  <th className="px-5 py-3">Monto</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {datos.pagosRecientes.map((pago) => (
                  <tr key={pago.id}>
                    <td className="px-5 py-4 text-gray-700">
                      {formatearFechaHora(pago.fecha_pago)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {pago.miembros?.nombre} {pago.miembros?.apellido}
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {pago.miembros?.cedula || '-'}
                    </td>
                    <td className="px-5 py-4 capitalize text-gray-700">
                      {pago.metodo_pago}
                    </td>
                    <td className="px-5 py-4 font-bold text-gray-900">
                      {formatearDinero(pago.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}