'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  RefreshCw,
  Plus,
  Save,
  X,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ShoppingCart,
  ReceiptText,
  Search,
  Download,
} from 'lucide-react'

const supabase = createClient()

const tiposTarjeta = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'diners', label: 'Diners' },
  { value: 'discover', label: 'Discover' },
  { value: 'american_express', label: 'American Express' },
]

const gastoInicial = {
  concepto: '',
  categoria: '',
  monto: '',
  metodo_pago: 'efectivo',
  fecha: obtenerFechaHoy(),
  notas: '',
}

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

function formatearDinero(valor) {
  return `$${Number(valor || 0).toFixed(2)}`
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

function obtenerUsuarioMovimiento(item) {
  return item.created_by_nombre || item.created_by_usuario || 'Sin usuario registrado'
}

function obtenerEtiquetaTarjeta(tipo) {
  return tiposTarjeta.find((item) => item.value === tipo)?.label || ''
}

function obtenerDetallePago(item) {
  if (!item) return ''

  if (item.metodo_pago === 'transferencia') {
    return `Comprobante: ${item.numero_comprobante || '-'} · Banco: ${item.banco_origen || '-'}`
  }

  if (item.metodo_pago === 'tarjeta') {
    return `Comprobante: ${item.numero_comprobante || '-'} · Tarjeta: ${obtenerEtiquetaTarjeta(item.tipo_tarjeta) || '-'}`
  }

  if (item.metodo_pago === 'efectivo') {
    return 'Pago en efectivo'
  }

  return ''
}

function TarjetaResumen({ titulo, valor, icono: Icon, tono = 'normal' }) {
  const color =
    tono === 'verde'
      ? 'text-green-700'
      : tono === 'rojo'
        ? 'text-red-700'
        : 'text-gray-900'

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500 md:text-sm">{titulo}</p>
        <Icon size={22} className="shrink-0 text-gray-400" />
      </div>

      <h2 className={`mt-2 break-words text-2xl font-bold md:text-3xl ${color}`}>
        {valor}
      </h2>
    </div>
  )
}

export default function CajaPage() {
  const [fechaDesde, setFechaDesde] = useState(obtenerInicioMes())
  const [fechaHasta, setFechaHasta] = useState(obtenerFechaHoy())

  const [pagos, setPagos] = useState([])
  const [ventas, setVentas] = useState([])
  const [gastos, setGastos] = useState([])

  const [formGasto, setFormGasto] = useState(gastoInicial)
  const [mostrarGasto, setMostrarGasto] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const [cargando, setCargando] = useState(true)
  const [guardandoGasto, setGuardandoGasto] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarCaja()
  }, [])

  async function cargarCaja() {
    setCargando(true)
    setError('')
    setMensaje('')

    const inicioISO = crearInicioDiaISO(fechaDesde)
    const finISO = crearFinDiaISO(fechaHasta)

    const [
      respuestaPagos,
      respuestaVentas,
      respuestaGastos,
    ] = await Promise.all([
      supabase
        .from('pagos')
        .select(`
          *,
          miembros (
            id,
            nombre,
            apellido,
            cedula,
            codigo_acceso
          )
        `)
        .gte('fecha_pago', inicioISO)
        .lte('fecha_pago', finISO)
        .order('fecha_pago', { ascending: false }),

      supabase
        .from('ventas')
        .select(`
          *,
          miembros (
            id,
            nombre,
            apellido,
            cedula,
            codigo_acceso
          )
        `)
        .gte('fecha', inicioISO)
        .lte('fecha', finISO)
        .order('fecha', { ascending: false }),

      supabase
        .from('gastos')
        .select('*')
        .gte('fecha', inicioISO)
        .lte('fecha', finISO)
        .order('fecha', { ascending: false }),
    ])

    const errores = [
      respuestaPagos.error,
      respuestaVentas.error,
      respuestaGastos.error,
    ].filter(Boolean)

    if (errores.length > 0) {
      setError(errores[0].message)
    }

    setPagos(respuestaPagos.data || [])
    setVentas(respuestaVentas.data || [])
    setGastos(respuestaGastos.data || [])

    setCargando(false)
  }

  function abrirNuevoGasto() {
    setFormGasto({
      ...gastoInicial,
      fecha: obtenerFechaHoy(),
    })

    setMostrarGasto(true)
    setError('')
    setMensaje('')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function limpiarGasto() {
    setFormGasto({
      ...gastoInicial,
      fecha: obtenerFechaHoy(),
    })

    setMostrarGasto(false)
    setError('')
  }

  function actualizarGasto(campo, valor) {
    setFormGasto((actual) => ({
      ...actual,
      [campo]: valor,
    }))
  }

  async function guardarGasto(evento) {
    evento.preventDefault()
    setGuardandoGasto(true)
    setError('')
    setMensaje('')

    const datos = {
      concepto: formGasto.concepto.trim(),
      categoria: formGasto.categoria.trim() || null,
      monto: Number(formGasto.monto),
      metodo_pago: formGasto.metodo_pago,
      fecha: new Date(`${formGasto.fecha}T12:00:00`).toISOString(),
      notas: formGasto.notas.trim() || null,
    }

    if (!datos.concepto) {
      setError('El concepto del gasto es obligatorio.')
      setGuardandoGasto(false)
      return
    }

    if (!datos.monto || datos.monto <= 0) {
      setError('El monto del gasto debe ser mayor a 0.')
      setGuardandoGasto(false)
      return
    }

    const { error } = await supabase
      .from('gastos')
      .insert(datos)

    if (error) {
      setError(error.message)
      setGuardandoGasto(false)
      return
    }

    await cargarCaja()
    limpiarGasto()
    setMensaje('Gasto registrado correctamente.')
    setGuardandoGasto(false)
  }

  const movimientos = useMemo(() => {
    const movimientosPagos = pagos.map((pago) => ({
      id: `pago-${pago.id}`,
      tipo: 'Membresía',
      categoria: 'Ingreso',
      fecha: pago.fecha_pago,
      concepto: `Pago de membresía${pago.miembros ? ` - ${pago.miembros.nombre} ${pago.miembros.apellido}` : ''}`,
      metodo_pago: pago.metodo_pago,
      monto: Number(pago.monto || 0),
      usuario: obtenerUsuarioMovimiento(pago),
      signo: 'ingreso',
      codigo: pago.miembros?.codigo_acceso || '',
      numero_comprobante: pago.numero_comprobante || '',
      banco_origen: pago.banco_origen || '',
      tipo_tarjeta: pago.tipo_tarjeta || '',
      detalle_pago: obtenerDetallePago(pago),
    }))

    const movimientosVentas = ventas.map((venta) => ({
      id: `venta-${venta.id}`,
      tipo: 'Venta',
      categoria: 'Ingreso',
      fecha: venta.fecha,
      concepto: venta.miembros
        ? `Venta a ${venta.miembros.nombre} ${venta.miembros.apellido}`
        : 'Venta sin miembro asociado',
      metodo_pago: venta.metodo_pago,
      monto: Number(venta.total || 0),
      usuario: obtenerUsuarioMovimiento(venta),
      signo: 'ingreso',
      codigo: venta.miembros?.codigo_acceso || '',
      numero_comprobante: venta.numero_comprobante || '',
      banco_origen: venta.banco_origen || '',
      tipo_tarjeta: venta.tipo_tarjeta || '',
      detalle_pago: obtenerDetallePago(venta),
    }))

    const movimientosGastos = gastos.map((gasto) => ({
      id: `gasto-${gasto.id}`,
      tipo: 'Gasto',
      categoria: gasto.categoria || 'Egreso',
      fecha: gasto.fecha,
      concepto: gasto.concepto,
      metodo_pago: gasto.metodo_pago,
      monto: Number(gasto.monto || 0),
      usuario: obtenerUsuarioMovimiento(gasto),
      signo: 'egreso',
      codigo: '',
      numero_comprobante: '',
      banco_origen: '',
      tipo_tarjeta: '',
      detalle_pago: 'Gasto registrado',
    }))

    return [
      ...movimientosPagos,
      ...movimientosVentas,
      ...movimientosGastos,
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  }, [pagos, ventas, gastos])

  const movimientosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()

    if (!texto) return movimientos

    return movimientos.filter((movimiento) => {
      const valores = [
        movimiento.tipo,
        movimiento.categoria,
        movimiento.concepto,
        movimiento.metodo_pago,
        movimiento.usuario,
        movimiento.codigo,
        movimiento.numero_comprobante,
        movimiento.banco_origen,
        movimiento.tipo_tarjeta,
        movimiento.detalle_pago,
      ]

      return valores.some((valor) =>
        String(valor || '').toLowerCase().includes(texto)
      )
    })
  }, [movimientos, busqueda])

  const resumen = useMemo(() => {
    const ingresosMembresias = pagos.reduce((total, pago) => total + Number(pago.monto || 0), 0)
    const ingresosVentas = ventas.reduce((total, venta) => total + Number(venta.total || 0), 0)
    const egresos = gastos.reduce((total, gasto) => total + Number(gasto.monto || 0), 0)

    const metodos = ['efectivo', 'transferencia', 'tarjeta']

    const porMetodo = metodos.map((metodo) => {
      const ingresos = [
        ...pagos.map((pago) => ({
          metodo_pago: pago.metodo_pago,
          monto: Number(pago.monto || 0),
        })),
        ...ventas.map((venta) => ({
          metodo_pago: venta.metodo_pago,
          monto: Number(venta.total || 0),
        })),
      ]
        .filter((item) => item.metodo_pago === metodo)
        .reduce((total, item) => total + item.monto, 0)

      const gastosMetodo = gastos
        .filter((gasto) => gasto.metodo_pago === metodo)
        .reduce((total, gasto) => total + Number(gasto.monto || 0), 0)

      return {
        metodo,
        ingresos,
        egresos: gastosMetodo,
        balance: ingresos - gastosMetodo,
      }
    })

    return {
      ingresosMembresias,
      ingresosVentas,
      ingresosTotales: ingresosMembresias + ingresosVentas,
      egresos,
      balance: ingresosMembresias + ingresosVentas - egresos,
      porMetodo,
    }
  }, [pagos, ventas, gastos])

  function exportarMovimientos() {
    descargarCSV(
      `caja_${fechaDesde}_${fechaHasta}.csv`,
      movimientosFiltrados.map((movimiento) => ({
        fecha: formatearFechaHora(movimiento.fecha),
        tipo: movimiento.tipo,
        categoria: movimiento.categoria,
        concepto: movimiento.concepto,
        metodo_pago: movimiento.metodo_pago,
        numero_comprobante: movimiento.numero_comprobante,
        banco_origen: movimiento.banco_origen,
        tipo_tarjeta: obtenerEtiquetaTarjeta(movimiento.tipo_tarjeta),
        detalle_pago: movimiento.detalle_pago,
        monto: movimiento.signo === 'egreso' ? -movimiento.monto : movimiento.monto,
        usuario: movimiento.usuario,
      }))
    )
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Caja
          </h1>
          <p className="mt-2 text-sm text-gray-600 md:text-base">
            Controla ingresos, egresos, respaldos de pago y balance del gimnasio.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            onClick={cargarCaja}
            disabled={cargando}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 md:self-end"
          >
            <RefreshCw size={18} />
            {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>

          <button
            onClick={abrirNuevoGasto}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 md:self-end"
          >
            <Plus size={18} />
            Nuevo gasto
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

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <TarjetaResumen
          titulo="Ingresos"
          valor={cargando ? '-' : formatearDinero(resumen.ingresosTotales)}
          icono={TrendingUp}
          tono="verde"
        />

        <TarjetaResumen
          titulo="Membresías"
          valor={cargando ? '-' : formatearDinero(resumen.ingresosMembresias)}
          icono={CreditCard}
        />

        <TarjetaResumen
          titulo="Ventas"
          valor={cargando ? '-' : formatearDinero(resumen.ingresosVentas)}
          icono={ShoppingCart}
        />

        <TarjetaResumen
          titulo="Gastos"
          valor={cargando ? '-' : formatearDinero(resumen.egresos)}
          icono={TrendingDown}
          tono="rojo"
        />

        <div className="col-span-2 xl:col-span-1">
          <TarjetaResumen
            titulo="Balance"
            valor={cargando ? '-' : formatearDinero(resumen.balance)}
            icono={DollarSign}
            tono={resumen.balance >= 0 ? 'verde' : 'rojo'}
          />
        </div>
      </div>

      {mostrarGasto && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Registrar gasto</h2>
              <p className="mt-1 text-sm text-gray-500">
                Registra egresos como servicios, mantenimiento, limpieza o compras internas.
              </p>
            </div>

            <button
              onClick={limpiarGasto}
              className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={guardarGasto} className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Concepto
              </label>
              <input
                value={formGasto.concepto}
                onChange={(e) => actualizarGasto('concepto', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: Pago de luz"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Categoría
              </label>
              <input
                value={formGasto.categoria}
                onChange={(e) => actualizarGasto('categoria', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: Servicios"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Monto
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formGasto.monto}
                onChange={(e) => actualizarGasto('monto', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: 35"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Método de pago
              </label>
              <select
                value={formGasto.metodo_pago}
                onChange={(e) => actualizarGasto('metodo_pago', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Fecha
              </label>
              <input
                type="date"
                value={formGasto.fecha}
                onChange={(e) => actualizarGasto('fecha', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notas
              </label>
              <textarea
                value={formGasto.notas}
                onChange={(e) => actualizarGasto('notas', e.target.value)}
                className="min-h-24 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Detalle adicional del gasto"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:col-span-3">
              <button
                type="submit"
                disabled={guardandoGasto}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {guardandoGasto ? 'Guardando...' : 'Guardar gasto'}
              </button>

              <button
                type="button"
                onClick={limpiarGasto}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4 md:p-5">
          <h2 className="text-lg font-bold text-gray-900">Resumen por método de pago</h2>
          <p className="text-sm text-gray-500">
            Ingresos, gastos y balance separados por efectivo, transferencia y tarjeta.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
          {resumen.porMetodo.map((item) => (
            <div
              key={item.metodo}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold capitalize text-gray-900">
                  {item.metodo}
                </p>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    item.balance >= 0
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {formatearDinero(item.balance)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-gray-500">Ingresos</p>
                  <p className="font-bold text-green-700">
                    {formatearDinero(item.ingresos)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500">Gastos</p>
                  <p className="font-bold text-red-700">
                    {formatearDinero(item.egresos)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3">Método</th>
                <th className="px-5 py-3">Ingresos</th>
                <th className="px-5 py-3">Gastos</th>
                <th className="px-5 py-3">Balance</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {resumen.porMetodo.map((item) => (
                <tr key={item.metodo}>
                  <td className="px-5 py-4 font-semibold capitalize text-gray-900">
                    {item.metodo}
                  </td>

                  <td className="px-5 py-4 text-gray-700">
                    {formatearDinero(item.ingresos)}
                  </td>

                  <td className="px-5 py-4 text-red-700">
                    {formatearDinero(item.egresos)}
                  </td>

                  <td
                    className={`px-5 py-4 font-bold ${
                      item.balance >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {formatearDinero(item.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Movimientos de caja</h2>
            <p className="text-sm text-gray-500">
              Ingresos y egresos dentro del rango seleccionado.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative w-full md:w-96">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-black"
                placeholder="Buscar por concepto, comprobante, banco o usuario"
              />
            </div>

            <button
              onClick={exportarMovimientos}
              disabled={movimientosFiltrados.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={18} />
              Exportar
            </button>
          </div>
        </div>

        {cargando ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Cargando caja...
          </div>
        ) : movimientosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No hay movimientos en este rango.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
              {movimientosFiltrados.map((movimiento) => (
                <div
                  key={movimiento.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">
                        {movimiento.concepto}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {formatearFechaHora(movimiento.fecha)}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        movimiento.signo === 'ingreso'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {movimiento.tipo}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-gray-500">Categoría</p>
                      <p className="font-semibold text-gray-900">
                        {movimiento.categoria}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500">Método</p>
                      <p className="font-semibold capitalize text-gray-900">
                        {movimiento.metodo_pago}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500">Usuario</p>
                      <p className="font-semibold text-gray-900">
                        {movimiento.usuario}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500">Monto</p>
                      <p
                        className={`font-bold ${
                          movimiento.signo === 'ingreso'
                            ? 'text-green-700'
                            : 'text-red-700'
                        }`}
                      >
                        {movimiento.signo === 'ingreso' ? '+' : '-'}
                        {formatearDinero(movimiento.monto)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-500">
                      Detalle de pago
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {movimiento.detalle_pago || '-'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1250px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Concepto</th>
                    <th className="px-5 py-3">Método</th>
                    <th className="px-5 py-3">Detalle pago</th>
                    <th className="px-5 py-3">Usuario</th>
                    <th className="px-5 py-3 text-right">Monto</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {movimientosFiltrados.map((movimiento) => (
                    <tr key={movimiento.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 text-gray-700">
                        {formatearFechaHora(movimiento.fecha)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                            movimiento.signo === 'ingreso'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {movimiento.signo === 'ingreso' ? (
                            <ReceiptText size={13} />
                          ) : (
                            <TrendingDown size={13} />
                          )}
                          {movimiento.tipo}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">
                          {movimiento.concepto}
                        </div>
                        <div className="text-xs text-gray-500">
                          {movimiento.categoria}
                        </div>
                      </td>

                      <td className="px-5 py-4 capitalize text-gray-700">
                        {movimiento.metodo_pago}
                      </td>

                      <td className="px-5 py-4">
                        <div className="max-w-[320px] text-xs text-gray-600">
                          {movimiento.detalle_pago || '-'}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {movimiento.usuario}
                      </td>

                      <td
                        className={`px-5 py-4 text-right font-bold ${
                          movimiento.signo === 'ingreso'
                            ? 'text-green-700'
                            : 'text-red-700'
                        }`}
                      >
                        {movimiento.signo === 'ingreso' ? '+' : '-'}
                        {formatearDinero(movimiento.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}