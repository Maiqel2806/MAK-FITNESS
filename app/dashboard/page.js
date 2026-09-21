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

const ZONA_HORARIA = 'America/Guayaquil'

function obtenerFechaHoy() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = partes.find((p) => p.type === 'year')?.value
  const month = partes.find((p) => p.type === 'month')?.value
  const day = partes.find((p) => p.type === 'day')?.value

  return `${year}-${month}-${day}`
}

function crearInicioDiaISO(fecha) {
  return new Date(`${fecha}T00:00:00-05:00`).toISOString()
}

function crearFinDiaISO(fecha) {
  return new Date(`${fecha}T23:59:59.999-05:00`).toISOString()
}

function obtenerRangoMesActual() {
  const hoy = obtenerFechaHoy()

  const [year, month] = hoy.split('-').map(Number)

  const ultimoDia = new Date(
    year,
    month,
    0
  ).getDate()

  const mesTexto = String(month).padStart(2, '0')

  const inicioFecha =
    `${year}-${mesTexto}-01`

  const finFecha =
    `${year}-${mesTexto}-${String(ultimoDia).padStart(2, '0')}`

  return {
    hoy,
    claveMes: `${year}-${mesTexto}`,
    inicioFecha,
    finFecha,
    inicioISO: crearInicioDiaISO(inicioFecha),
    finISO: crearFinDiaISO(finFecha),
  }
}

function sumarDiasFecha(fecha, dias) {
  if (!fecha) return null

  const [year, month, day] =
    String(fecha)
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
    date.getUTCDate() + dias
  )

  return date
    .toISOString()
    .slice(0, 10)
}

function diferenciaDias(fechaDesde, fechaHasta) {
  const [yearDesde, monthDesde, dayDesde] =
    fechaDesde.split('-').map(Number)

  const [yearHasta, monthHasta, dayHasta] =
    fechaHasta.split('-').map(Number)

  const inicio = Date.UTC(
    yearDesde,
    monthDesde - 1,
    dayDesde
  )

  const fin = Date.UTC(
    yearHasta,
    monthHasta - 1,
    dayHasta
  )

  return Math.round(
    (fin - inicio) /
      (1000 * 60 * 60 * 24)
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

    return date.toLocaleDateString(
      'es-EC',
      {
        timeZone: ZONA_HORARIA,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }
    )
  }

  const [year, month, day] =
    texto.split('-')

  return `${day}/${month}/${year}`
}

function formatearHora(fecha) {
  if (!fecha) return '-'

  const date = new Date(fecha)

  return date.toLocaleTimeString(
    'es-EC',
    {
      timeZone: ZONA_HORARIA,
      hour: '2-digit',
      minute: '2-digit',
    }
  )
}

function formatearMes(fecha) {
  if (!fecha) return '-'

  const [year, month] =
    fecha.split('-').map(Number)

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      1
    )
  )

  const texto =
    new Intl.DateTimeFormat(
      'es-EC',
      {
        timeZone: 'UTC',
        month: 'long',
        year: 'numeric',
      }
    ).format(date)

  return (
    texto.charAt(0).toUpperCase() +
    texto.slice(1)
  )
}

function obtenerEstadoMembresia(membresia) {
  const hoy = obtenerFechaHoy()

  if (
    membresia.estado === 'suspendida'
  ) {
    return {
      estado: 'suspendida',
      texto: 'Suspendida',
      clase: 'bg-gray-100 text-gray-700',
    }
  }

  if (
    membresia.fecha_inicio > hoy
  ) {
    const dias =
      diferenciaDias(
        hoy,
        membresia.fecha_inicio
      )

    return {
      estado: 'futura',
      texto: `Inicia en ${dias} día${dias === 1 ? '' : 's'}`,
      clase: 'bg-blue-50 text-blue-700',
    }
  }

  const dias =
    diferenciaDias(
      hoy,
      membresia.fecha_fin
    )

  if (dias < 0) {
    return {
      estado: 'vencida',
      texto:
        `Vencida hace ${Math.abs(dias)} día${
          Math.abs(dias) === 1
            ? ''
            : 's'
        }`,
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
      texto:
        `Vence en ${dias} día${
          dias === 1 ? '' : 's'
        }`,
      clase: 'bg-orange-50 text-orange-700',
    }
  }

  return {
    estado: 'activa',
    texto: `Vence en ${dias} días`,
    clase: 'bg-green-50 text-green-700',
  }
}

function esMembresiaVigente(
  membresia
) {
  return [
    'activa',
    'por_caducar',
    'vence_hoy',
  ].includes(
    membresia.estado_calculado.estado
  )
}

function TarjetaResumen({
  titulo,
  valor,
  detalle,
  icono: Icon,
  tono = 'normal',
}) {
  const valorClase =
    tono === 'rojo'
      ? 'text-red-700'
      : tono === 'verde'
        ? 'text-green-700'
        : tono === 'naranja'
          ? 'text-orange-700'
          : tono === 'azul'
            ? 'text-blue-700'
            : 'text-gray-900'

  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 md:text-sm">
            {titulo}
          </p>

          <h2
            className={`mt-2 break-words text-2xl font-bold md:text-3xl ${valorClase}`}
          >
            {valor}
          </h2>

          {detalle && (
            <p className="mt-1 break-words text-xs text-gray-500 md:text-sm">
              {detalle}
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <Icon
            size={20}
            className="text-gray-600"
          />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const perfil = usePerfil()

  const esEmpleado =
    perfil?.rol === 'empleado'

  const esAdmin =
    perfil?.rol === 'dueno' ||
    perfil?.rol === 'administrador'

  const [miembros, setMiembros] =
    useState([])

  const [
    membresias,
    setMembresias,
  ] = useState([])

  const [
    asistenciasHoy,
    setAsistenciasHoy,
  ] = useState([])

  const [
    ventasHoy,
    setVentasHoy,
  ] = useState([])

  const [
    productos,
    setProductos,
  ] = useState([])

  const [
    pagosMes,
    setPagosMes,
  ] = useState([])

  const [
    cargando,
    setCargando,
  ] = useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    if (!perfil) return

    cargarDashboard()
  }, [perfil?.rol])

  async function consultarTabla(
    tabla,
    consulta
  ) {
    const {
      data,
      error,
    } = await consulta

    if (error) {
      console.warn(
        `Error consultando ${tabla}:`,
        error.message
      )

      return []
    }

    return data || []
  }

  async function cargarDashboard() {
    setCargando(true)
    setError('')

    const rangoMes =
      obtenerRangoMesActual()

    const inicioHoy =
      crearInicioDiaISO(
        rangoMes.hoy
      )

    const finHoy =
      crearFinDiaISO(
        rangoMes.hoy
      )

    try {
      const [
        dataMiembros,
        dataMembresias,
        dataAsistencias,
        dataVentas,
        dataProductos,
        dataPagos,
      ] = await Promise.all([
        consultarTabla(
          'miembros',
          supabase
            .from('miembros')
            .select('*')
            .order(
              'created_at',
              {
                ascending: false,
              }
            )
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
                nombre,
                precio
              )
            `)
            .order(
              'fecha_fin',
              {
                ascending: true,
              }
            )
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
            .gte(
              'fecha_entrada',
              inicioHoy
            )
            .lte(
              'fecha_entrada',
              finHoy
            )
            .order(
              'fecha_entrada',
              {
                ascending: false,
              }
            )
        ),

        consultarTabla(
          'ventas',
          supabase
            .from('ventas')
            .select('*')
            .gte(
              'fecha',
              inicioHoy
            )
            .lte(
              'fecha',
              finHoy
            )
            .order(
              'fecha',
              {
                ascending: false,
              }
            )
        ),

        consultarTabla(
          'productos',
          supabase
            .from('productos')
            .select('*')
            .order(
              'nombre',
              {
                ascending: true,
              }
            )
        ),

        esAdmin
          ? consultarTabla(
              'pagos',
              supabase
                .from('pagos')
                .select('*')
                .gte(
                  'fecha_pago',
                  rangoMes.inicioISO
                )
                .lte(
                  'fecha_pago',
                  rangoMes.finISO
                )
                .order(
                  'fecha_pago',
                  {
                    ascending: false,
                  }
                )
            )
          : Promise.resolve([]),
      ])

      setMiembros(
        dataMiembros
      )

      setMembresias(
        dataMembresias
      )

      setAsistenciasHoy(
        dataAsistencias
      )

      setVentasHoy(
        dataVentas
      )

      setProductos(
        dataProductos
      )

      setPagosMes(
        dataPagos
      )
    } catch (error) {
      setError(
        error.message
      )
    }

    setCargando(false)
  }

  const resumen = useMemo(() => {
    const rangoMes =
      obtenerRangoMesActual()

    const membresiasConEstado =
      membresias.map(
        (membresia) => ({
          ...membresia,
          estado_calculado:
            obtenerEstadoMembresia(
              membresia
            ),
        })
      )

    // ==========================================
    // SOCIOS VIGENTES REALES
    // ==========================================

    const membresiasVigentes =
      membresiasConEstado.filter(
        esMembresiaVigente
      )

    const idsSociosVigentes =
      new Set(
        membresiasVigentes.map(
          (item) =>
            item.miembro_id
        )
      )

    const sociosVigentes =
      idsSociosVigentes.size

    const miembrosHabilitados =
      miembros.filter(
        (item) =>
          item.estado === 'activo'
      ).length

    const miembrosInactivos =
      miembros.length -
      miembrosHabilitados

    // ==========================================
    // MEMBRESÍAS FUTURAS
    // ==========================================

    const membresiasFuturas =
      membresiasConEstado.filter(
        (item) =>
          item.estado_calculado
            .estado === 'futura'
      )

    const idsSociosConFutura =
      new Set(
        membresiasFuturas.map(
          (item) =>
            item.miembro_id
        )
      )

    const idsConVigenteOFutura =
      new Set([
        ...idsSociosVigentes,
        ...idsSociosConFutura,
      ])

    // ==========================================
    // ÚLTIMA MEMBRESÍA DE CADA SOCIO
    // ==========================================

    const ultimaMembresiaPorSocio =
      new Map()

    membresiasConEstado.forEach(
      (membresia) => {
        const actual =
          ultimaMembresiaPorSocio.get(
            membresia.miembro_id
          )

        if (!actual) {
          ultimaMembresiaPorSocio.set(
            membresia.miembro_id,
            membresia
          )

          return
        }

        const inicioNuevo =
          String(
            membresia.fecha_inicio ||
              ''
          )

        const inicioActual =
          String(
            actual.fecha_inicio ||
              ''
          )

        if (
          inicioNuevo >
          inicioActual
        ) {
          ultimaMembresiaPorSocio.set(
            membresia.miembro_id,
            membresia
          )

          return
        }

        if (
          inicioNuevo ===
            inicioActual &&
          String(
            membresia.fecha_fin ||
              ''
          ) >
            String(
              actual.fecha_fin ||
                ''
            )
        ) {
          ultimaMembresiaPorSocio.set(
            membresia.miembro_id,
            membresia
          )
        }
      }
    )

    // ==========================================
    // SOCIOS REALMENTE VENCIDOS
    // ==========================================

    const vencidasReales =
      Array.from(
        ultimaMembresiaPorSocio.values()
      ).filter(
        (membresia) =>
          membresia
            .estado_calculado
            .estado ===
            'vencida' &&
          !idsConVigenteOFutura.has(
            membresia.miembro_id
          )
      )

    // ==========================================
    // PENDIENTES DE RENOVAR ESTE MES
    // ==========================================

    const pendientesRenovarMes =
      vencidasReales.filter(
        (membresia) => {
          const fechaRenovacion =
            sumarDiasFecha(
              membresia.fecha_fin,
              1
            )

          return (
            fechaRenovacion &&
            fechaRenovacion.startsWith(
              rangoMes.claveMes
            )
          )
        }
      )

    // ==========================================
    // POR CADUCAR
    // ==========================================

    const porCaducar =
      membresiasConEstado.filter(
        (item) =>
          item.estado_calculado
            .estado ===
            'por_caducar' ||
          item.estado_calculado
            .estado ===
            'vence_hoy'
      )

    // ==========================================
    // ASISTENCIA
    // ==========================================

    const sociosDistintosHoy =
      new Set(
        asistenciasHoy.map(
          (item) =>
            item.miembro_id
        )
      ).size

    // ==========================================
    // VENTAS DEL DÍA
    // ==========================================

    const totalVentasHoy =
      ventasHoy.reduce(
        (total, venta) =>
          total +
          Number(
            venta.total || 0
          ),
        0
      )

    // ==========================================
    // PAGOS DE MEMBRESÍA DEL MES
    // ==========================================

    const pagosMembresiasMes =
      pagosMes.filter(
        (pago) =>
          pago.tipo_pago ===
            'membresia' ||
          pago.tipo_pago ===
            'upgrade_fidelizacion'
      )

    const ingresosMembresiasMes =
      pagosMembresiasMes.reduce(
        (total, pago) =>
          total +
          Number(
            pago.monto || 0
          ),
        0
      )

    const pagosInscripcionMes =
      pagosMes.filter(
        (pago) =>
          pago.tipo_pago ===
          'inscripcion'
      )

    const ingresosInscripcionMes =
      pagosInscripcionMes.reduce(
        (total, pago) =>
          total +
          Number(
            pago.monto || 0
          ),
        0
      )

    // ==========================================
    // INVENTARIO
    // ==========================================

    const productosBajoStock =
      productos.filter(
        (producto) => {
          const stock =
            Number(
              producto.stock || 0
            )

          const minimo =
            Number(
              producto.stock_minimo ||
                0
            )

          return stock <= minimo
        }
      )

    return {
      rangoMes,

      sociosVigentes,

      miembrosHabilitados,
      miembrosInactivos,

      membresiasFuturas,

      vencidasReales,

      pendientesRenovarMes,

      porCaducar,

      entradasHoy:
        asistenciasHoy.length,

      sociosDistintosHoy,

      totalVentasHoy,

      pagosMembresiasMes:
        pagosMembresiasMes.length,

      ingresosMembresiasMes,

      pagosInscripcionMes:
        pagosInscripcionMes.length,

      ingresosInscripcionMes,

      productosBajoStock,
    }
  }, [
    miembros,
    membresias,
    asistenciasHoy,
    ventasHoy,
    productos,
    pagosMes,
  ])

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold leading-tight text-gray-900 md:text-3xl">
            Dashboard
          </h1>

          <p className="mt-2 max-w-full break-words text-sm leading-relaxed text-gray-600 md:text-base">
            Panorama real de socios, renovaciones y operación del gimnasio.
          </p>
        </div>

        <button
          onClick={
            cargarDashboard
          }
          disabled={
            cargando
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <RefreshCw size={18} />

          {cargando
            ? 'Actualizando...'
            : 'Actualizar'}
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
              <ShieldCheck
                size={22}
                className="text-blue-700"
              />
            </div>

            <div className="min-w-0">
              <h2 className="break-words text-lg font-bold md:text-xl">
                Sesión de empleado
              </h2>

              <p className="mt-1 break-words text-sm leading-relaxed md:text-base">
                Vista operativa. La información financiera está reservada para administración.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TARJETAS ADMINISTRADOR
      ========================================== */}

      {!esEmpleado && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaResumen
            titulo="Socios vigentes"
            valor={
              cargando
                ? '-'
                : resumen.sociosVigentes
            }
            detalle={`${resumen.miembrosHabilitados} socios registrados habilitados`}
            icono={Users}
            tono="verde"
          />

          <TarjetaResumen
            titulo={`Ingresos membresías · ${formatearMes(resumen.rangoMes.inicioFecha)}`}
            valor={
              cargando
                ? '-'
                : formatearDinero(
                    resumen.ingresosMembresiasMes
                  )
            }
            detalle={`${resumen.pagosMembresiasMes} pagos registrados desde el día 1`}
            icono={TrendingUp}
            tono="verde"
          />

          <TarjetaResumen
            titulo="Pagos de membresía este mes"
            valor={
              cargando
                ? '-'
                : resumen.pagosMembresiasMes
            }
            detalle={`Corte desde ${formatearFecha(resumen.rangoMes.inicioFecha)} hasta hoy`}
            icono={CreditCard}
            tono="azul"
          />

          <TarjetaResumen
            titulo="Pendientes de renovar este mes"
            valor={
              cargando
                ? '-'
                : resumen.pendientesRenovarMes.length
            }
            detalle="Vencieron este mes y aún no renovaron"
            icono={AlertTriangle}
            tono={
              resumen.pendientesRenovarMes.length > 0
                ? 'rojo'
                : 'normal'
            }
          />
        </div>
      )}

      {/* ==========================================
          TARJETAS EMPLEADO
      ========================================== */}

      {esEmpleado && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaResumen
            titulo="Socios vigentes"
            valor={
              cargando
                ? '-'
                : resumen.sociosVigentes
            }
            detalle="Socios con membresía válida hoy"
            icono={Users}
            tono="verde"
          />

          <TarjetaResumen
            titulo="Entradas de hoy"
            valor={
              cargando
                ? '-'
                : resumen.entradasHoy
            }
            detalle={`${resumen.sociosDistintosHoy} socios distintos`}
            icono={CalendarCheck}
          />

          <TarjetaResumen
            titulo="Por caducar"
            valor={
              cargando
                ? '-'
                : resumen.porCaducar.length
            }
            detalle="Vencen hoy o en los próximos 7 días"
            icono={CreditCard}
            tono="naranja"
          />

          <TarjetaResumen
            titulo="Bajo stock"
            valor={
              cargando
                ? '-'
                : resumen.productosBajoStock.length
            }
            detalle="Productos que requieren reposición"
            icono={Package}
          />
        </div>
      )}

      {/* ==========================================
          RESUMEN OPERATIVO ADMIN
      ========================================== */}

      {!esEmpleado && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaResumen
            titulo="Entradas de hoy"
            valor={
              cargando
                ? '-'
                : resumen.entradasHoy
            }
            detalle={`${resumen.sociosDistintosHoy} socios distintos`}
            icono={CalendarCheck}
          />

          <TarjetaResumen
            titulo="Ventas de hoy"
            valor={
              cargando
                ? '-'
                : formatearDinero(
                    resumen.totalVentasHoy
                  )
            }
            detalle="Ingresos por inventario"
            icono={ShoppingCart}
            tono="verde"
          />

          <TarjetaResumen
            titulo="Por caducar"
            valor={
              cargando
                ? '-'
                : resumen.porCaducar.length
            }
            detalle="Vencen hoy o en los próximos 7 días"
            icono={CreditCard}
            tono="naranja"
          />

          <TarjetaResumen
            titulo="Bajo stock"
            valor={
              cargando
                ? '-'
                : resumen.productosBajoStock.length
            }
            detalle="Según stock mínimo de cada producto"
            icono={Package}
          />
        </div>
      )}

      {/* ==========================================
          MEMBRESÍAS POR CADUCAR + ALERTAS
      ========================================== */}

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-2">
          <div className="border-b border-gray-200 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-lg font-bold text-gray-900">
                  Membresías por caducar
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Socios que vencen hoy o en los próximos 7 días.
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
                {
                  resumen
                    .porCaducar
                    .length
                }
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
                {resumen.porCaducar
                  .slice(0, 10)
                  .map(
                    (
                      membresia
                    ) => {
                      const miembro =
                        membresia.miembros ||
                        {}

                      const estado =
                        membresia.estado_calculado

                      return (
                        <div
                          key={
                            membresia.id
                          }
                          className="p-4 md:p-5"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="break-words font-bold text-gray-900">
                                {
                                  miembro.nombre
                                }{' '}
                                {
                                  miembro.apellido
                                }
                              </p>

                              <p className="mt-1 text-sm text-gray-500">
                                Código:{' '}
                                {miembro.codigo_acceso ||
                                  '-'}{' '}
                                ·{' '}
                                {miembro.telefono ||
                                  'Sin teléfono'}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                Vence:{' '}
                                {formatearFecha(
                                  membresia.fecha_fin
                                )}
                              </p>
                            </div>

                            <span
                              className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${estado.clase}`}
                            >
                              {
                                estado.texto
                              }
                            </span>
                          </div>
                        </div>
                      )
                    }
                  )}
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

              <AlertTriangle
                size={22}
                className="shrink-0 text-orange-500"
              />
            </div>
          </div>

          <div className="space-y-3 p-4 md:p-5">
            <div className="rounded-2xl bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">
                Socios realmente vencidos
              </p>

              <p className="mt-1 text-2xl font-bold text-red-700">
                {cargando
                  ? '-'
                  : resumen
                      .vencidasReales
                      .length}
              </p>
            </div>

            <div className="rounded-2xl bg-orange-50 p-4">
              <p className="text-sm font-semibold text-orange-700">
                Por caducar
              </p>

              <p className="mt-1 text-2xl font-bold text-orange-700">
                {cargando
                  ? '-'
                  : resumen
                      .porCaducar
                      .length}
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700">
                Bajo stock
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {cargando
                  ? '-'
                  : resumen
                      .productosBajoStock
                      .length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          ÚLTIMAS ENTRADAS + INVENTARIO
      ========================================== */}

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
                {asistenciasHoy
                  .slice(0, 10)
                  .map(
                    (
                      asistencia
                    ) => (
                      <div
                        key={
                          asistencia.id
                        }
                        className="flex items-center gap-3 p-4 md:p-5"
                      >
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gray-100">
                          {asistencia
                            .miembros
                            ?.foto_url ? (
                            <img
                              src={
                                asistencia
                                  .miembros
                                  .foto_url
                              }
                              alt="Foto socio"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Users
                                size={18}
                                className="text-gray-400"
                              />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-gray-900">
                            {
                              asistencia
                                .miembros
                                ?.nombre
                            }{' '}
                            {
                              asistencia
                                .miembros
                                ?.apellido
                            }
                          </p>

                          <p className="text-sm text-gray-500">
                            Código:{' '}
                            {asistencia
                              .miembros
                              ?.codigo_acceso ||
                              '-'}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-gray-900">
                            {formatearHora(
                              asistencia.fecha_entrada
                            )}
                          </p>

                          <p className="text-xs text-gray-500">
                            Entrada
                          </p>
                        </div>
                      </div>
                    )
                  )}
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
          ) : resumen
              .productosBajoStock
              .length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No hay productos con bajo stock.
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {resumen
                  .productosBajoStock
                  .slice(0, 10)
                  .map(
                    (
                      producto
                    ) => (
                      <div
                        key={
                          producto.id
                        }
                        className="flex items-center justify-between gap-3 p-4 md:p-5"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">
                            {
                              producto.nombre
                            }
                          </p>

                          {!esEmpleado && (
                            <p className="text-sm text-gray-500">
                              Precio:{' '}
                              {formatearDinero(
                                producto.precio
                              )}
                            </p>
                          )}
                        </div>

                        <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          Stock{' '}
                          {producto.stock ||
                            0}
                          {' / '}
                          Mín.{' '}
                          {producto.stock_minimo ||
                            0}
                        </span>
                      </div>
                    )
                  )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          RESUMEN FINANCIERO ADMIN
      ========================================== */}

      {!esEmpleado && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Resumen del mes
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Corte desde el día 1 hasta hoy.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-700">
                Ingresos membresías
              </p>

              <p className="mt-2 text-xl font-bold text-green-800">
                {formatearDinero(
                  resumen.ingresosMembresiasMes
                )}
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-700">
                Pagos de membresía
              </p>

              <p className="mt-2 text-xl font-bold text-blue-800">
                {
                  resumen.pagosMembresiasMes
                }
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700">
                Inscripciones
              </p>

              <p className="mt-2 text-xl font-bold text-gray-900">
                {formatearDinero(
                  resumen.ingresosInscripcionMes
                )}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {
                  resumen.pagosInscripcionMes
                }{' '}
                pagos
              </p>
            </div>

            <div className="rounded-xl bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">
                Pendientes de renovar
              </p>

              <p className="mt-2 text-xl font-bold text-red-800">
                {
                  resumen
                    .pendientesRenovarMes
                    .length
                }
              </p>

              <p className="mt-1 text-xs text-red-600">
                Pendientes del mes actual
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}