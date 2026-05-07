'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { usePerfil } from '@/components/UserContext'
import {
  Plus,
  Search,
  Save,
  X,
  Pencil,
  Trash2,
  Package,
  AlertTriangle,
  ShoppingCart,
  Minus,
  ToggleLeft,
  ToggleRight,
  Receipt,
} from 'lucide-react'

const supabase = createClient()

const tiposTarjeta = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'diners', label: 'Diners' },
  { value: 'discover', label: 'Discover' },
  { value: 'american_express', label: 'American Express' },
]

const productoInicial = {
  nombre: '',
  categoria: '',
  descripcion: '',
  sku: '',
  precio: '',
  costo: '',
  stock: '',
  stock_minimo: '5',
  activo: true,
}

const ventaInicial = {
  miembro_id: '',
  metodo_pago: 'efectivo',
  notas: '',
  numero_comprobante: '',
  banco_origen: '',
  tipo_tarjeta: '',
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

function obtenerFechaHoy() {
  const hoy = new Date()
  const year = hoy.getFullYear()
  const month = String(hoy.getMonth() + 1).padStart(2, '0')
  const day = String(hoy.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function obtenerEtiquetaTarjeta(tipo) {
  return tiposTarjeta.find((item) => item.value === tipo)?.label || '-'
}

function obtenerDetallePago(item) {
  if (!item) return '-'

  if (item.metodo_pago === 'transferencia') {
    return `Comprobante: ${item.numero_comprobante || '-'} · Banco: ${item.banco_origen || '-'}`
  }

  if (item.metodo_pago === 'tarjeta') {
    return `Comprobante: ${item.numero_comprobante || '-'} · Tarjeta: ${obtenerEtiquetaTarjeta(item.tipo_tarjeta)}`
  }

  return 'Pago en efectivo'
}

export default function InventarioPage() {
  const perfil = usePerfil()
  const esDueno = perfil?.rol === 'dueno'
  const esEmpleado = perfil?.rol === 'empleado'

  const [productos, setProductos] = useState([])
  const [miembros, setMiembros] = useState([])
  const [ventas, setVentas] = useState([])

  const [formProducto, setFormProducto] = useState(productoInicial)
  const [formVenta, setFormVenta] = useState(ventaInicial)

  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('')
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState('1')
  const [carrito, setCarrito] = useState([])

  const [busqueda, setBusqueda] = useState('')
  const [mostrarProducto, setMostrarProducto] = useState(false)
  const [mostrarVenta, setMostrarVenta] = useState(false)
  const [editandoId, setEditandoId] = useState(null)

  const [cargando, setCargando] = useState(true)
  const [guardandoProducto, setGuardandoProducto] = useState(false)
  const [registrandoVenta, setRegistrandoVenta] = useState(false)
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
      respuestaProductos,
      respuestaMiembros,
      respuestaVentas,
    ] = await Promise.all([
      supabase
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true }),

      supabase
        .from('miembros')
        .select('id, nombre, apellido, cedula, codigo_acceso, estado')
        .order('nombre', { ascending: true }),

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
        .order('fecha', { ascending: false })
        .limit(20),
    ])

    if (respuestaProductos.error) {
      setError(respuestaProductos.error.message)
      setProductos([])
    } else {
      setProductos(respuestaProductos.data || [])
    }

    if (respuestaMiembros.error) {
      setError(respuestaMiembros.error.message)
      setMiembros([])
    } else {
      setMiembros(respuestaMiembros.data || [])
    }

    if (respuestaVentas.error) {
      setError(respuestaVentas.error.message)
      setVentas([])
    } else {
      setVentas(respuestaVentas.data || [])
    }

    setCargando(false)
  }

  function actualizarProducto(campo, valor) {
    setFormProducto((actual) => ({
      ...actual,
      [campo]: valor,
    }))
  }

  function actualizarVenta(campo, valor) {
    setFormVenta((actual) => {
      const nuevo = {
        ...actual,
        [campo]: valor,
      }

      if (campo === 'metodo_pago') {
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
      }

      return nuevo
    })
  }

  function abrirNuevoProducto() {
    setFormProducto(productoInicial)
    setEditandoId(null)
    setMostrarProducto(true)
    setError('')
    setMensaje('')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function limpiarProducto() {
    setFormProducto(productoInicial)
    setEditandoId(null)
    setMostrarProducto(false)
    setError('')
  }

  function editarProducto(producto) {
    setFormProducto({
      nombre: producto.nombre || '',
      categoria: producto.categoria || '',
      descripcion: producto.descripcion || '',
      sku: producto.sku || '',
      precio: String(producto.precio || ''),
      costo: String(producto.costo || ''),
      stock: String(producto.stock || 0),
      stock_minimo: String(producto.stock_minimo || 5),
      activo: Boolean(producto.activo),
    })

    setEditandoId(producto.id)
    setMostrarProducto(true)
    setError('')
    setMensaje('')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  async function guardarProducto(evento) {
    evento.preventDefault()
    setGuardandoProducto(true)
    setError('')
    setMensaje('')

    if (!formProducto.nombre.trim()) {
      setError('El nombre del producto es obligatorio.')
      setGuardandoProducto(false)
      return
    }

    if (editandoId && esEmpleado) {
      const respuesta = await supabase
        .from('productos')
        .update({
          nombre: formProducto.nombre.trim(),
        })
        .eq('id', editandoId)

      if (respuesta.error) {
        setError(respuesta.error.message)
        setGuardandoProducto(false)
        return
      }

      await cargarDatos()
      limpiarProducto()
      setMensaje('Nombre del producto actualizado correctamente.')
      setGuardandoProducto(false)
      return
    }

    const datos = {
      nombre: formProducto.nombre.trim(),
      categoria: formProducto.categoria.trim() || null,
      descripcion: formProducto.descripcion.trim() || null,
      sku: formProducto.sku.trim() || null,
      precio: Number(formProducto.precio || 0),
      costo: Number(formProducto.costo || 0),
      stock: Number(formProducto.stock || 0),
      stock_minimo: Number(formProducto.stock_minimo || 0),
      activo: Boolean(formProducto.activo),
    }

    if (datos.precio < 0) {
      setError('El precio no puede ser negativo.')
      setGuardandoProducto(false)
      return
    }

    if (datos.costo < 0) {
      setError('El costo no puede ser negativo.')
      setGuardandoProducto(false)
      return
    }

    if (datos.stock < 0) {
      setError('El stock no puede ser negativo.')
      setGuardandoProducto(false)
      return
    }

    if (datos.stock_minimo < 0) {
      setError('El stock mínimo no puede ser negativo.')
      setGuardandoProducto(false)
      return
    }

    let respuesta

    if (editandoId) {
      respuesta = await supabase
        .from('productos')
        .update(datos)
        .eq('id', editandoId)
    } else {
      respuesta = await supabase
        .from('productos')
        .insert(datos)
    }

    if (respuesta.error) {
      setError(respuesta.error.message)
      setGuardandoProducto(false)
      return
    }

    await cargarDatos()
    limpiarProducto()
    setMensaje(editandoId ? 'Producto actualizado correctamente.' : 'Producto registrado correctamente.')
    setGuardandoProducto(false)
  }

  async function cambiarEstadoProducto(producto) {
    if (!esDueno) {
      setError('No tienes permisos para activar o desactivar productos.')
      return
    }

    setError('')
    setMensaje('')

    const { error } = await supabase
      .from('productos')
      .update({
        activo: !producto.activo,
      })
      .eq('id', producto.id)

    if (error) {
      setError(error.message)
      return
    }

    await cargarDatos()
  }

  async function eliminarProducto(producto) {
    if (!esDueno) {
      setError('No tienes permisos para eliminar productos.')
      return
    }

    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar el producto "${producto.nombre}"?`
    )

    if (!confirmar) return

    setError('')
    setMensaje('')

    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', producto.id)

    if (error) {
      setError('No se pudo eliminar. Si el producto ya tiene ventas registradas, mejor desactívalo.')
      return
    }

    await cargarDatos()
    setMensaje('Producto eliminado correctamente.')
  }

  function abrirNuevaVenta() {
    setFormVenta(ventaInicial)
    setProductoSeleccionadoId('')
    setCantidadSeleccionada('1')
    setCarrito([])
    setMostrarVenta(true)
    setError('')
    setMensaje('')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function limpiarVenta() {
    setFormVenta(ventaInicial)
    setProductoSeleccionadoId('')
    setCantidadSeleccionada('1')
    setCarrito([])
    setMostrarVenta(false)
    setError('')
  }

  function agregarProductoAlCarrito() {
    setError('')
    setMensaje('')

    const producto = productos.find((item) => item.id === productoSeleccionadoId)
    const cantidad = Number(cantidadSeleccionada)

    if (!producto) {
      setError('Selecciona un producto.')
      return
    }

    if (!producto.activo) {
      setError('Este producto está inactivo.')
      return
    }

    if (!cantidad || cantidad <= 0) {
      setError('La cantidad debe ser mayor a 0.')
      return
    }

    const cantidadActualEnCarrito = carrito
      .filter((item) => item.producto_id === producto.id)
      .reduce((total, item) => total + Number(item.cantidad || 0), 0)

    if (cantidadActualEnCarrito + cantidad > producto.stock) {
      setError('No hay stock suficiente para agregar esa cantidad.')
      return
    }

    setCarrito((actual) => {
      const existe = actual.find((item) => item.producto_id === producto.id)

      if (existe) {
        return actual.map((item) => {
          if (item.producto_id === producto.id) {
            return {
              ...item,
              cantidad: item.cantidad + cantidad,
              subtotal: (item.cantidad + cantidad) * item.precio_unitario,
            }
          }

          return item
        })
      }

      return [
        ...actual,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          categoria: producto.categoria,
          cantidad,
          precio_unitario: Number(producto.precio),
          subtotal: cantidad * Number(producto.precio),
          stock_disponible: Number(producto.stock),
        },
      ]
    })

    setProductoSeleccionadoId('')
    setCantidadSeleccionada('1')
  }

  function quitarProductoCarrito(productoId) {
    setCarrito((actual) =>
      actual.filter((item) => item.producto_id !== productoId)
    )
  }

  async function registrarVenta(evento) {
    evento.preventDefault()
    setRegistrandoVenta(true)
    setError('')
    setMensaje('')

    if (carrito.length === 0) {
      setError('Agrega al menos un producto a la venta.')
      setRegistrandoVenta(false)
      return
    }

    if (formVenta.metodo_pago === 'transferencia') {
      if (!formVenta.numero_comprobante.trim()) {
        setError('Para transferencia debes ingresar el número de comprobante.')
        setRegistrandoVenta(false)
        return
      }

      if (!formVenta.banco_origen.trim()) {
        setError('Para transferencia debes ingresar el banco de origen.')
        setRegistrandoVenta(false)
        return
      }
    }

    if (formVenta.metodo_pago === 'tarjeta') {
      if (!formVenta.numero_comprobante.trim()) {
        setError('Para pago con tarjeta debes ingresar el número de comprobante.')
        setRegistrandoVenta(false)
        return
      }

      if (!formVenta.tipo_tarjeta) {
        setError('Para pago con tarjeta debes seleccionar el tipo de tarjeta.')
        setRegistrandoVenta(false)
        return
      }
    }

    const items = carrito.map((item) => ({
      producto_id: item.producto_id,
      cantidad: Number(item.cantidad),
      precio_unitario: Number(item.precio_unitario),
    }))

    const { error } = await supabase.rpc('registrar_venta_inventario', {
      p_miembro_id: formVenta.miembro_id || null,
      p_metodo_pago: formVenta.metodo_pago,
      p_notas: formVenta.notas || null,
      p_items: items,
      p_numero_comprobante: formVenta.numero_comprobante || null,
      p_banco_origen: formVenta.banco_origen || null,
      p_tipo_tarjeta: formVenta.tipo_tarjeta || null,
    })

    if (error) {
      setError(error.message)
      setRegistrandoVenta(false)
      return
    }

    await cargarDatos()
    limpiarVenta()
    setMensaje('Venta registrada correctamente y stock actualizado.')
    setRegistrandoVenta(false)
  }

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()

    if (!texto) return productos

    return productos.filter((producto) => {
      const valores = [
        producto.nombre,
        producto.categoria,
        producto.descripcion,
        producto.sku,
      ]

      return valores.some((valor) =>
        String(valor || '').toLowerCase().includes(texto)
      )
    })
  }, [productos, busqueda])

  const productosActivos = productos.filter((producto) => producto.activo)

  const resumen = useMemo(() => {
    const activos = productos.filter((producto) => producto.activo)
    const bajoStock = activos.filter((producto) => {
      return Number(producto.stock || 0) <= Number(producto.stock_minimo || 0)
    })

    const valorInventario = activos.reduce((total, producto) => {
      return total + Number(producto.precio || 0) * Number(producto.stock || 0)
    }, 0)

    const hoy = obtenerFechaHoy()

    const ventasHoy = ventas.filter((venta) => {
      const fechaVenta = String(venta.fecha || '').slice(0, 10)
      return fechaVenta === hoy
    })

    const totalVentasHoy = ventasHoy.reduce((total, venta) => {
      return total + Number(venta.total || 0)
    }, 0)

    return {
      totalProductos: productos.length,
      productosActivos: activos.length,
      bajoStock: bajoStock.length,
      valorInventario,
      ventasHoy: ventasHoy.length,
      totalVentasHoy,
    }
  }, [productos, ventas])

  const totalCarrito = carrito.reduce((total, item) => total + Number(item.subtotal || 0), 0)
  const campoBloqueadoEmpleado = Boolean(editandoId && esEmpleado)

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Inventario y ventas
          </h1>
          <p className="mt-2 text-sm text-gray-600 md:text-base">
            Controla productos, stock, alertas y ventas del gimnasio.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={abrirNuevoProducto}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            <Plus size={18} />
            Nuevo producto
          </button>

          <button
            onClick={abrirNuevaVenta}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <ShoppingCart size={18} />
            Registrar venta
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

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs text-gray-500 md:text-sm">Productos</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">
            {cargando ? '-' : resumen.totalProductos}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs text-gray-500 md:text-sm">Activos</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">
            {cargando ? '-' : resumen.productosActivos}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs text-gray-500 md:text-sm">Bajo stock</p>
          <h2 className="mt-2 text-2xl font-bold text-red-700 md:text-3xl">
            {cargando ? '-' : resumen.bajoStock}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs text-gray-500 md:text-sm">Valor inventario</p>
          <h2 className="mt-2 text-xl font-bold text-gray-900 md:text-2xl">
            {cargando ? '-' : formatearDinero(resumen.valorInventario)}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs text-gray-500 md:text-sm">Ventas hoy</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">
            {cargando ? '-' : resumen.ventasHoy}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs text-gray-500 md:text-sm">Total hoy</p>
          <h2 className="mt-2 text-xl font-bold text-green-700 md:text-2xl">
            {cargando ? '-' : formatearDinero(resumen.totalVentasHoy)}
          </h2>
        </div>
      </div>

      {mostrarProducto && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editandoId ? 'Editar producto' : 'Registrar nuevo producto'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {campoBloqueadoEmpleado
                  ? 'Como empleado solo puedes editar el nombre del producto.'
                  : 'Define precio, costo, stock y stock mínimo.'}
              </p>
            </div>

            <button
              onClick={limpiarProducto}
              className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={guardarProducto} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nombre
              </label>
              <input
                value={formProducto.nombre}
                onChange={(e) => actualizarProducto('nombre', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: Agua 600ml"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Categoría
              </label>
              <input
                value={formProducto.categoria}
                onChange={(e) => actualizarProducto('categoria', e.target.value)}
                disabled={campoBloqueadoEmpleado}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Ej: Bebidas"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                SKU / Código interno
              </label>
              <input
                value={formProducto.sku}
                onChange={(e) => actualizarProducto('sku', e.target.value)}
                disabled={campoBloqueadoEmpleado}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Opcional"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Estado
              </label>
              <select
                value={formProducto.activo ? 'activo' : 'inactivo'}
                onChange={(e) => actualizarProducto('activo', e.target.value === 'activo')}
                disabled={campoBloqueadoEmpleado}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Precio venta
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formProducto.precio}
                onChange={(e) => actualizarProducto('precio', e.target.value)}
                disabled={campoBloqueadoEmpleado}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Ej: 1.00"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Costo
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formProducto.costo}
                onChange={(e) => actualizarProducto('costo', e.target.value)}
                disabled={campoBloqueadoEmpleado}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Ej: 0.50"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Stock actual
              </label>
              <input
                type="number"
                min="0"
                value={formProducto.stock}
                onChange={(e) => actualizarProducto('stock', e.target.value)}
                disabled={campoBloqueadoEmpleado}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Ej: 24"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Stock mínimo
              </label>
              <input
                type="number"
                min="0"
                value={formProducto.stock_minimo}
                onChange={(e) => actualizarProducto('stock_minimo', e.target.value)}
                disabled={campoBloqueadoEmpleado}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Ej: 5"
              />
            </div>

            <div className="md:col-span-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                value={formProducto.descripcion}
                onChange={(e) => actualizarProducto('descripcion', e.target.value)}
                disabled={campoBloqueadoEmpleado}
                className="min-h-24 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Detalle del producto"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:col-span-4">
              <button
                type="submit"
                disabled={guardandoProducto}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {guardandoProducto ? 'Guardando...' : 'Guardar producto'}
              </button>

              <button
                type="button"
                onClick={limpiarProducto}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {mostrarVenta && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Registrar venta</h2>
              <p className="mt-1 text-sm text-gray-500">
                Selecciona productos, cantidades, método de pago y respaldo si aplica.
              </p>
            </div>

            <button
              onClick={limpiarVenta}
              className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={registrarVenta}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Cliente / miembro
                </label>
                <select
                  value={formVenta.miembro_id}
                  onChange={(e) => actualizarVenta('miembro_id', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="">Venta sin miembro asociado</option>
                  {miembros
                    .filter((miembro) => miembro.estado === 'activo')
                    .map((miembro) => (
                      <option key={miembro.id} value={miembro.id}>
                        {miembro.nombre} {miembro.apellido} - Código {miembro.codigo_acceso || '-'}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Método de pago
                </label>
                <select
                  value={formVenta.metodo_pago}
                  onChange={(e) => actualizarVenta('metodo_pago', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notas
                </label>
                <input
                  value={formVenta.notas}
                  onChange={(e) => actualizarVenta('notas', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Opcional"
                />
              </div>

              {formVenta.metodo_pago === 'transferencia' && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Número de comprobante / voucher
                    </label>
                    <input
                      value={formVenta.numero_comprobante}
                      onChange={(e) => actualizarVenta('numero_comprobante', e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      placeholder="Ej: TRX-001234"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Banco de origen
                    </label>
                    <input
                      value={formVenta.banco_origen}
                      onChange={(e) => actualizarVenta('banco_origen', e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      placeholder="Ej: Banco Pichincha"
                    />
                  </div>
                </>
              )}

              {formVenta.metodo_pago === 'tarjeta' && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Tipo de tarjeta
                    </label>
                    <select
                      value={formVenta.tipo_tarjeta}
                      onChange={(e) => actualizarVenta('tipo_tarjeta', e.target.value)}
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
                      value={formVenta.numero_comprobante}
                      onChange={(e) => actualizarVenta('numero_comprobante', e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      placeholder="Ej: POS-001234"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-4 font-bold text-gray-900">Agregar productos</h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_140px_auto]">
                <select
                  value={productoSeleccionadoId}
                  onChange={(e) => setProductoSeleccionadoId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="">Seleccionar producto</option>
                  {productosActivos.map((producto) => (
                    <option key={producto.id} value={producto.id}>
                      {producto.nombre} - {formatearDinero(producto.precio)} - Stock: {producto.stock}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  value={cantidadSeleccionada}
                  onChange={(e) => setCantidadSeleccionada(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Cantidad"
                />

                <button
                  type="button"
                  onClick={agregarProductoAlCarrito}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  <Plus size={18} />
                  Agregar
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-gray-200">
              <div className="border-b border-gray-200 p-4">
                <h3 className="font-bold text-gray-900">Detalle de venta</h3>
              </div>

              {carrito.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  No hay productos agregados.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
                    {carrito.map((item) => (
                      <div
                        key={item.producto_id}
                        className="rounded-2xl border border-gray-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-gray-900">{item.nombre}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {item.categoria || 'Sin categoría'}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => quitarProductoCarrito(item.producto_id)}
                            className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                          >
                            <Minus size={16} />
                          </button>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-gray-500">Cant.</p>
                            <p className="font-bold text-gray-900">{item.cantidad}</p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-gray-500">Precio</p>
                            <p className="font-bold text-gray-900">
                              {formatearDinero(item.precio_unitario)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-gray-500">Subtotal</p>
                            <p className="font-bold text-gray-900">
                              {formatearDinero(item.subtotal)}
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
                          <th className="px-4 py-3">Producto</th>
                          <th className="px-4 py-3">Cantidad</th>
                          <th className="px-4 py-3">Precio</th>
                          <th className="px-4 py-3">Subtotal</th>
                          <th className="px-4 py-3 text-right">Acción</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {carrito.map((item) => (
                          <tr key={item.producto_id}>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900">
                                {item.nombre}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.categoria || 'Sin categoría'}
                              </div>
                            </td>

                            <td className="px-4 py-3 text-gray-700">
                              {item.cantidad}
                            </td>

                            <td className="px-4 py-3 text-gray-700">
                              {formatearDinero(item.precio_unitario)}
                            </td>

                            <td className="px-4 py-3 font-semibold text-gray-900">
                              {formatearDinero(item.subtotal)}
                            </td>

                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => quitarProductoCarrito(item.producto_id)}
                                className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700"
                              >
                                <Minus size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de venta</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatearDinero(totalCarrito)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {formVenta.metodo_pago === 'efectivo'
                    ? 'Pago en efectivo'
                    : formVenta.metodo_pago === 'transferencia'
                      ? 'Pago por transferencia con respaldo obligatorio'
                      : 'Pago con tarjeta con respaldo obligatorio'}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={registrandoVenta || carrito.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Receipt size={18} />
                  {registrandoVenta ? 'Registrando...' : 'Confirmar venta'}
                </button>

                <button
                  type="button"
                  onClick={limpiarVenta}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-white"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Productos</h2>
            <p className="text-sm text-gray-500">
              Total registrados: {productos.length}
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
              placeholder="Buscar producto, categoría o SKU"
            />
          </div>
        </div>

        {cargando ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Cargando inventario...
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Package size={24} className="text-gray-500" />
            </div>
            <p className="font-semibold text-gray-900">No hay productos registrados</p>
            <p className="mt-1 text-sm text-gray-500">
              Agrega productos para empezar a vender.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
              {productosFiltrados.map((producto) => {
                const bajoStock = Number(producto.stock || 0) <= Number(producto.stock_minimo || 0)

                return (
                  <div
                    key={producto.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{producto.nombre}</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {producto.categoria || 'Sin categoría'}
                        </p>
                        {producto.sku && (
                          <p className="mt-1 text-xs text-gray-500">
                            SKU: {producto.sku}
                          </p>
                        )}
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                          producto.activo
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {producto.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-gray-50 p-4 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-gray-500">Precio</p>
                        <p className="font-bold text-gray-900">
                          {formatearDinero(producto.precio)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-500">Stock</p>
                        <p className={`font-bold ${bajoStock ? 'text-red-700' : 'text-gray-900'}`}>
                          {producto.stock || 0}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-500">Mínimo</p>
                        <p className="font-bold text-gray-900">
                          {producto.stock_minimo || 0}
                        </p>
                      </div>
                    </div>

                    {bajoStock && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                        <AlertTriangle size={16} />
                        Bajo stock
                      </div>
                    )}

                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={() => editarProducto(producto)}
                        className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                        title="Editar"
                      >
                        <Pencil size={17} />
                      </button>

                      {esDueno && (
                        <>
                          <button
                            onClick={() => cambiarEstadoProducto(producto)}
                            className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                            title={producto.activo ? 'Desactivar' : 'Activar'}
                          >
                            {producto.activo ? (
                              <ToggleRight size={18} />
                            ) : (
                              <ToggleLeft size={18} />
                            )}
                          </button>

                          <button
                            onClick={() => eliminarProducto(producto)}
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
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Producto</th>
                    <th className="px-5 py-3">SKU</th>
                    <th className="px-5 py-3">Precio</th>
                    <th className="px-5 py-3">Costo</th>
                    <th className="px-5 py-3">Stock</th>
                    <th className="px-5 py-3">Mínimo</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {productosFiltrados.map((producto) => {
                    const bajoStock = Number(producto.stock || 0) <= Number(producto.stock_minimo || 0)

                    return (
                      <tr key={producto.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">
                            {producto.nombre}
                          </div>
                          <div className="text-xs text-gray-500">
                            {producto.categoria || 'Sin categoría'}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          {producto.sku || '-'}
                        </td>

                        <td className="px-5 py-4 font-semibold text-gray-900">
                          {formatearDinero(producto.precio)}
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          {formatearDinero(producto.costo)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                              bajoStock
                                ? 'bg-red-50 text-red-700'
                                : 'bg-green-50 text-green-700'
                            }`}
                          >
                            {bajoStock && <AlertTriangle size={13} />}
                            {producto.stock || 0}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          {producto.stock_minimo || 0}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              producto.activo
                                ? 'bg-green-50 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {producto.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => editarProducto(producto)}
                              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                              title="Editar"
                            >
                              <Pencil size={17} />
                            </button>

                            {esDueno && (
                              <>
                                <button
                                  onClick={() => cambiarEstadoProducto(producto)}
                                  className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                                  title={producto.activo ? 'Desactivar' : 'Activar'}
                                >
                                  {producto.activo ? (
                                    <ToggleRight size={18} />
                                  ) : (
                                    <ToggleLeft size={18} />
                                  )}
                                </button>

                                <button
                                  onClick={() => eliminarProducto(producto)}
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

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4 md:p-5">
          <h2 className="text-lg font-bold text-gray-900">Últimas ventas</h2>
          <p className="text-sm text-gray-500">
            Ventas recientes registradas en el sistema.
          </p>
        </div>

        {ventas.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No hay ventas registradas.
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            <div className="divide-y divide-gray-100">
              {ventas.map((venta) => (
                <div
                  key={venta.id}
                  className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:p-5"
                >
                  <div>
                    <p className="font-bold text-gray-900">
                      {venta.miembros
                        ? `${venta.miembros.nombre} ${venta.miembros.apellido}`
                        : 'Venta sin miembro asociado'}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {venta.miembros?.codigo_acceso
                        ? `Código: ${venta.miembros.codigo_acceso}`
                        : 'Sin código asociado'}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {formatearFechaHora(venta.fecha)}
                    </p>

                    {venta.ventas_detalle?.length > 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        {venta.ventas_detalle
                          .map((item) => `${item.productos?.nombre || 'Producto'} x${item.cantidad}`)
                          .join(', ')}
                      </p>
                    )}

                    <p className="mt-1 text-xs text-gray-500">
                      {obtenerDetallePago(venta)}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {formatearDinero(venta.total)}
                    </p>

                    <p className="text-sm capitalize text-gray-500">
                      {venta.metodo_pago || '-'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}