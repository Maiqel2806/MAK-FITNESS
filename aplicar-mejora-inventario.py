from pathlib import Path
import shutil
import sys

ARCHIVO = Path('app/inventario/page.js')
RESPALDO = Path('app/inventario/page.js.antes-mejora-inventario.bak')
MARCADOR = 'MAK_INVENTARIO_CONTROL_V1'


def error(mensaje):
    print('')
    print('ERROR:', mensaje)
    print('NO se modifico app/inventario/page.js')
    sys.exit(1)


def reemplazar_una_vez(codigo, buscar, reemplazo, nombre):
    cantidad = codigo.count(buscar)
    if cantidad != 1:
        error(f'{nombre}: se esperaban 1 coincidencia y se encontraron {cantidad}.')
    return codigo.replace(buscar, reemplazo, 1)


def reemplazar_entre(codigo, inicio, fin, reemplazo, nombre):
    pos_inicio = codigo.find(inicio)
    if pos_inicio == -1:
        error(f'{nombre}: no se encontro el inicio.')
    pos_fin = codigo.find(fin, pos_inicio)
    if pos_fin == -1:
        error(f'{nombre}: no se encontro el final.')
    return codigo[:pos_inicio] + reemplazo + codigo[pos_fin:]


if not ARCHIVO.exists():
    error('No existe app/inventario/page.js')

codigo = ARCHIVO.read_text(encoding='utf-8')

for requerido in [
    "export default function InventarioPage()",
    "async function cargarDatos()",
    "async function guardarProducto(evento)",
    "async function registrarVenta(evento)",
    "Últimas ventas",
]:
    if requerido not in codigo:
        error(f'No se encontro la estructura requerida: {requerido}')

if MARCADOR in codigo:
    print('')
    print('La mejora de inventario ya esta instalada.')
    sys.exit(0)

# ============================================================
# 1. FORMULARIOS BASE
# ============================================================

venta_original = """const ventaInicial = {
  miembro_id: '',
  metodo_pago: 'efectivo',
  notas: '',
  numero_comprobante: '',
  banco_origen: '',
  tipo_tarjeta: '',
}
"""

venta_nueva = """const ventaInicial = {
  miembro_id: '',
  estado_pago: 'pagado',
  metodo_pago: 'efectivo',
  notas: '',
  numero_comprobante: '',
  banco_origen: '',
  tipo_tarjeta: '',
}

// MAK_INVENTARIO_CONTROL_V1
const ingresoInicial = {
  proveedor: 'Coca-Cola',
  numero_factura: '',
  fecha_factura: '',
  notas: '',
}

const ajusteInicial = {
  producto_id: '',
  stock_fisico: '',
  motivo: '',
}

const pagoPendienteInicial = {
  metodo_pago: 'efectivo',
  numero_comprobante: '',
  banco_origen: '',
  tipo_tarjeta: '',
}
"""

codigo = reemplazar_una_vez(
    codigo,
    venta_original,
    venta_nueva,
    'Agregar formularios de inventario',
)

# ============================================================
# 2. DETALLE DE PAGO
# ============================================================

pago_original = """function obtenerDetallePago(item) {
  if (!item) return '-'

  if (item.metodo_pago === 'transferencia') {
    return `Comprobante: ${item.numero_comprobante || '-'} · Banco: ${item.banco_origen || '-'}`
  }

  if (item.metodo_pago === 'tarjeta') {
    return `Comprobante: ${item.numero_comprobante || '-'} · Tarjeta: ${obtenerEtiquetaTarjeta(item.tipo_tarjeta)}`
  }

  return 'Pago en efectivo'
}
"""

pago_nuevo = """function obtenerDetallePago(item) {
  if (!item) return '-'

  if (item.estado_pago === 'pendiente') {
    return 'Pendiente de pago'
  }

  if (item.metodo_pago === 'transferencia') {
    return `Comprobante: ${item.numero_comprobante || '-'} · Banco: ${item.banco_origen || '-'}`
  }

  if (item.metodo_pago === 'tarjeta') {
    return `Comprobante: ${item.numero_comprobante || '-'} · Tarjeta: ${obtenerEtiquetaTarjeta(item.tipo_tarjeta)}`
  }

  return 'Pago en efectivo'
}
"""

codigo = reemplazar_una_vez(
    codigo,
    pago_original,
    pago_nuevo,
    'Actualizar detalle de pago',
)

# ============================================================
# 3. ROLES Y ESTADOS
# ============================================================

estados_original = """export default function InventarioPage() {
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
"""

estados_nuevos = """export default function InventarioPage() {
  const perfil = usePerfil()
  const esDueno = perfil?.rol === 'dueno'
  const esEmpleado = perfil?.rol === 'empleado'
  const esAdminInventario = ['dueno', 'administrador'].includes(perfil?.rol)

  const [productos, setProductos] = useState([])
  const [miembros, setMiembros] = useState([])
  const [ventas, setVentas] = useState([])
  const [ingresos, setIngresos] = useState([])

  const [formProducto, setFormProducto] = useState(productoInicial)
  const [formVenta, setFormVenta] = useState(ventaInicial)
  const [formIngreso, setFormIngreso] = useState(ingresoInicial)
  const [formAjuste, setFormAjuste] = useState(ajusteInicial)
  const [formPagoPendiente, setFormPagoPendiente] = useState(pagoPendienteInicial)

  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('')
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState('1')
  const [carrito, setCarrito] = useState([])

  const [productoIngresoId, setProductoIngresoId] = useState('')
  const [cantidadIngreso, setCantidadIngreso] = useState('1')
  const [costoIngreso, setCostoIngreso] = useState('')
  const [itemsIngreso, setItemsIngreso] = useState([])

  const [ventaPendienteSeleccionada, setVentaPendienteSeleccionada] = useState(null)

  const [busqueda, setBusqueda] = useState('')
  const [mostrarProducto, setMostrarProducto] = useState(false)
  const [mostrarVenta, setMostrarVenta] = useState(false)
  const [mostrarIngreso, setMostrarIngreso] = useState(false)
  const [mostrarAjuste, setMostrarAjuste] = useState(false)
  const [mostrarPagoPendiente, setMostrarPagoPendiente] = useState(false)
  const [editandoId, setEditandoId] = useState(null)

  const [cargando, setCargando] = useState(true)
  const [guardandoProducto, setGuardandoProducto] = useState(false)
  const [registrandoVenta, setRegistrandoVenta] = useState(false)
  const [guardandoIngreso, setGuardandoIngreso] = useState(false)
  const [guardandoAjuste, setGuardandoAjuste] = useState(false)
  const [guardandoPagoPendiente, setGuardandoPagoPendiente] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
"""

codigo = reemplazar_una_vez(
    codigo,
    estados_original,
    estados_nuevos,
    'Agregar estados y permisos',
)

# ============================================================
# 4. CARGA DE DATOS
# ============================================================

nueva_carga = r"""  async function cargarDatos() {
    setCargando(true)
    setError('')
    setMensaje('')

    const [
      respuestaProductos,
      respuestaMiembros,
      respuestaVentas,
      respuestaIngresos,
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
        .limit(100),

      supabase
        .from('inventario_ingresos')
        .select(`
          id,
          proveedor,
          numero_factura,
          fecha_factura,
          fecha_ingreso,
          total,
          notas,
          inventario_ingresos_detalle (
            id,
            producto_id,
            cantidad,
            costo_unitario,
            subtotal,
            stock_anterior,
            stock_nuevo,
            productos (
              id,
              nombre,
              sku
            )
          )
        `)
        .order('fecha_ingreso', { ascending: false })
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

    if (respuestaIngresos.error) {
      if (esAdminInventario) {
        setError(respuestaIngresos.error.message)
      }
      setIngresos([])
    } else {
      setIngresos(respuestaIngresos.data || [])
    }

    setCargando(false)
  }

"""

codigo = reemplazar_entre(
    codigo,
    '  async function cargarDatos() {',
    '  function actualizarProducto(campo, valor) {',
    nueva_carga,
    'Actualizar carga de datos',
)

# ============================================================
# 5. ACTUALIZAR VENTA
# ============================================================

actualizar_venta = r"""  function actualizarVenta(campo, valor) {
    setFormVenta((actual) => {
      const nuevo = {
        ...actual,
        [campo]: valor,
      }

      if (
        campo === 'estado_pago' &&
        valor === 'pendiente'
      ) {
        nuevo.metodo_pago = 'efectivo'
        nuevo.numero_comprobante = ''
        nuevo.banco_origen = ''
        nuevo.tipo_tarjeta = ''
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

"""

codigo = reemplazar_entre(
    codigo,
    '  function actualizarVenta(campo, valor) {',
    '  function abrirNuevoProducto() {',
    actualizar_venta,
    'Actualizar formulario de venta',
)

# ============================================================
# 6. PERMISOS DE PRODUCTOS
# ============================================================

abrir_producto_original = """  function abrirNuevoProducto() {
    setFormProducto(productoInicial)
"""
abrir_producto_nuevo = """  function abrirNuevoProducto() {
    if (!esAdminInventario) {
      setError('Solo un administrador puede crear productos.')
      return
    }

    setMostrarVenta(false)
    setMostrarIngreso(false)
    setMostrarAjuste(false)
    setMostrarPagoPendiente(false)
    setFormProducto(productoInicial)
"""
codigo = reemplazar_una_vez(
    codigo,
    abrir_producto_original,
    abrir_producto_nuevo,
    'Proteger nuevo producto',
)

editar_producto_original = """  function editarProducto(producto) {
    setFormProducto({
"""
editar_producto_nuevo = """  function editarProducto(producto) {
    if (!esAdminInventario) {
      setError('Solo un administrador puede editar productos.')
      return
    }

    setMostrarVenta(false)
    setMostrarIngreso(false)
    setMostrarAjuste(false)
    setMostrarPagoPendiente(false)

    setFormProducto({
"""
codigo = reemplazar_una_vez(
    codigo,
    editar_producto_original,
    editar_producto_nuevo,
    'Proteger editar producto',
)

nuevo_guardar_producto = r"""  async function guardarProducto(evento) {
    evento.preventDefault()

    if (!esAdminInventario) {
      setError('Solo un administrador puede guardar productos.')
      return
    }

    setGuardandoProducto(true)
    setError('')
    setMensaje('')

    if (!formProducto.nombre.trim()) {
      setError('El nombre del producto es obligatorio.')
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
      stock_minimo: Number(formProducto.stock_minimo || 0),
      activo: Boolean(formProducto.activo),
    }

    if (!editandoId) {
      datos.stock = Number(formProducto.stock || 0)
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

    if (!editandoId && datos.stock < 0) {
      setError('El stock inicial no puede ser negativo.')
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
    setMensaje(
      editandoId
        ? 'Producto actualizado correctamente.'
        : 'Producto registrado correctamente.'
    )
    setGuardandoProducto(false)
  }

"""

codigo = reemplazar_entre(
    codigo,
    '  async function guardarProducto(evento) {',
    '  async function cambiarEstadoProducto(producto) {',
    nuevo_guardar_producto,
    'Actualizar guardar producto',
)

codigo = codigo.replace(
    "    if (!esDueno) {\n      setError('No tienes permisos para activar o desactivar productos.')",
    "    if (!esAdminInventario) {\n      setError('No tienes permisos para activar o desactivar productos.')",
    1,
)
codigo = codigo.replace(
    "    if (!esDueno) {\n      setError('No tienes permisos para eliminar productos.')",
    "    if (!esAdminInventario) {\n      setError('No tienes permisos para eliminar productos.')",
    1,
)

# ============================================================
# 7. FUNCIONES DE INGRESO, AJUSTE Y COBRO PENDIENTE
# ============================================================

marca_venta = '  function abrirNuevaVenta() {'
if marca_venta not in codigo:
    error('No se encontro abrirNuevaVenta().')

funciones_inventario = r"""  function abrirIngresoMercaderia() {
    if (!esAdminInventario) {
      setError('Solo un administrador puede ingresar mercadería.')
      return
    }

    setMostrarProducto(false)
    setMostrarVenta(false)
    setMostrarAjuste(false)
    setMostrarPagoPendiente(false)

    setFormIngreso({
      ...ingresoInicial,
      fecha_factura: obtenerFechaHoy(),
    })
    setProductoIngresoId('')
    setCantidadIngreso('1')
    setCostoIngreso('')
    setItemsIngreso([])
    setMostrarIngreso(true)
    setError('')
    setMensaje('')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function limpiarIngreso() {
    setFormIngreso(ingresoInicial)
    setProductoIngresoId('')
    setCantidadIngreso('1')
    setCostoIngreso('')
    setItemsIngreso([])
    setMostrarIngreso(false)
    setError('')
  }

  function seleccionarProductoIngreso(productoId) {
    setProductoIngresoId(productoId)

    const producto = productos.find(
      (item) => item.id === productoId
    )

    setCostoIngreso(
      producto
        ? String(producto.costo || '')
        : ''
    )
  }

  function agregarProductoIngreso() {
    setError('')
    setMensaje('')

    const producto = productos.find(
      (item) => item.id === productoIngresoId
    )

    const cantidad = Number(cantidadIngreso)
    const costoUnitario = Number(costoIngreso || 0)

    if (!producto) {
      setError('Selecciona un producto recibido.')
      return
    }

    if (!cantidad || cantidad <= 0) {
      setError('La cantidad recibida debe ser mayor a 0.')
      return
    }

    if (costoUnitario < 0) {
      setError('El costo unitario no puede ser negativo.')
      return
    }

    setItemsIngreso((actual) => {
      const existe = actual.find(
        (item) => item.producto_id === producto.id
      )

      if (existe) {
        return actual.map((item) => {
          if (item.producto_id !== producto.id) {
            return item
          }

          const nuevaCantidad =
            Number(item.cantidad) + cantidad

          return {
            ...item,
            cantidad: nuevaCantidad,
            costo_unitario: costoUnitario,
            subtotal: nuevaCantidad * costoUnitario,
          }
        })
      }

      return [
        ...actual,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          cantidad,
          costo_unitario: costoUnitario,
          subtotal: cantidad * costoUnitario,
          stock_actual: Number(producto.stock || 0),
        },
      ]
    })

    setProductoIngresoId('')
    setCantidadIngreso('1')
    setCostoIngreso('')
  }

  function quitarProductoIngreso(productoId) {
    setItemsIngreso((actual) =>
      actual.filter(
        (item) => item.producto_id !== productoId
      )
    )
  }

  async function registrarIngresoMercaderia(evento) {
    evento.preventDefault()

    if (!esAdminInventario) {
      setError('Solo un administrador puede ingresar mercadería.')
      return
    }

    setGuardandoIngreso(true)
    setError('')
    setMensaje('')

    if (!formIngreso.proveedor.trim()) {
      setError('Debes indicar el proveedor.')
      setGuardandoIngreso(false)
      return
    }

    if (!formIngreso.numero_factura.trim()) {
      setError('Debes ingresar el número de factura.')
      setGuardandoIngreso(false)
      return
    }

    if (itemsIngreso.length === 0) {
      setError('Agrega al menos un producto recibido.')
      setGuardandoIngreso(false)
      return
    }

    const items = itemsIngreso.map((item) => ({
      producto_id: item.producto_id,
      cantidad: Number(item.cantidad),
      costo_unitario: Number(item.costo_unitario || 0),
    }))

    const { error } = await supabase.rpc(
      'registrar_ingreso_inventario',
      {
        p_proveedor: formIngreso.proveedor.trim(),
        p_numero_factura: formIngreso.numero_factura.trim(),
        p_fecha_factura: formIngreso.fecha_factura || null,
        p_notas: formIngreso.notas || null,
        p_items: items,
      }
    )

    if (error) {
      setError(error.message)
      setGuardandoIngreso(false)
      return
    }

    await cargarDatos()
    limpiarIngreso()
    setMensaje('Mercadería ingresada correctamente y stock actualizado.')
    setGuardandoIngreso(false)
  }

  function abrirAjusteStock(producto = null) {
    if (!esAdminInventario) {
      setError('Solo un administrador puede ajustar el inventario.')
      return
    }

    setMostrarProducto(false)
    setMostrarVenta(false)
    setMostrarIngreso(false)
    setMostrarPagoPendiente(false)

    setFormAjuste({
      producto_id: producto?.id || '',
      stock_fisico:
        producto?.stock !== undefined
          ? String(producto.stock)
          : '',
      motivo: '',
    })

    setMostrarAjuste(true)
    setError('')
    setMensaje('')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function limpiarAjuste() {
    setFormAjuste(ajusteInicial)
    setMostrarAjuste(false)
    setError('')
  }

  async function registrarAjusteStock(evento) {
    evento.preventDefault()

    if (!esAdminInventario) {
      setError('Solo un administrador puede ajustar el inventario.')
      return
    }

    setGuardandoAjuste(true)
    setError('')
    setMensaje('')

    if (!formAjuste.producto_id) {
      setError('Selecciona un producto.')
      setGuardandoAjuste(false)
      return
    }

    const stockFisico = Number(formAjuste.stock_fisico)

    if (
      formAjuste.stock_fisico === '' ||
      stockFisico < 0
    ) {
      setError('Ingresa un stock físico válido.')
      setGuardandoAjuste(false)
      return
    }

    if (formAjuste.motivo.trim().length < 3) {
      setError('Debes indicar el motivo del ajuste.')
      setGuardandoAjuste(false)
      return
    }

    const { error } = await supabase.rpc(
      'ajustar_stock_inventario',
      {
        p_producto_id: formAjuste.producto_id,
        p_stock_fisico: stockFisico,
        p_motivo: formAjuste.motivo.trim(),
      }
    )

    if (error) {
      setError(error.message)
      setGuardandoAjuste(false)
      return
    }

    await cargarDatos()
    limpiarAjuste()
    setMensaje('Stock ajustado correctamente.')
    setGuardandoAjuste(false)
  }

  function abrirPagoPendiente(venta) {
    setMostrarProducto(false)
    setMostrarVenta(false)
    setMostrarIngreso(false)
    setMostrarAjuste(false)

    setVentaPendienteSeleccionada(venta)
    setFormPagoPendiente(pagoPendienteInicial)
    setMostrarPagoPendiente(true)
    setError('')
    setMensaje('')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function limpiarPagoPendiente() {
    setVentaPendienteSeleccionada(null)
    setFormPagoPendiente(pagoPendienteInicial)
    setMostrarPagoPendiente(false)
    setError('')
  }

  function actualizarPagoPendiente(campo, valor) {
    setFormPagoPendiente((actual) => {
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

  async function registrarPagoPendiente(evento) {
    evento.preventDefault()

    if (!ventaPendienteSeleccionada) return

    setGuardandoPagoPendiente(true)
    setError('')
    setMensaje('')

    if (formPagoPendiente.metodo_pago === 'transferencia') {
      if (!formPagoPendiente.numero_comprobante.trim()) {
        setError('Ingresa el número de comprobante.')
        setGuardandoPagoPendiente(false)
        return
      }

      if (!formPagoPendiente.banco_origen.trim()) {
        setError('Ingresa el banco de origen.')
        setGuardandoPagoPendiente(false)
        return
      }
    }

    if (formPagoPendiente.metodo_pago === 'tarjeta') {
      if (!formPagoPendiente.numero_comprobante.trim()) {
        setError('Ingresa el número de comprobante.')
        setGuardandoPagoPendiente(false)
        return
      }

      if (!formPagoPendiente.tipo_tarjeta) {
        setError('Selecciona el tipo de tarjeta.')
        setGuardandoPagoPendiente(false)
        return
      }
    }

    const { error } = await supabase.rpc(
      'marcar_venta_pagada',
      {
        p_venta_id: ventaPendienteSeleccionada.id,
        p_metodo_pago: formPagoPendiente.metodo_pago,
        p_numero_comprobante:
          formPagoPendiente.numero_comprobante || null,
        p_banco_origen:
          formPagoPendiente.banco_origen || null,
        p_tipo_tarjeta:
          formPagoPendiente.tipo_tarjeta || null,
      }
    )

    if (error) {
      setError(error.message)
      setGuardandoPagoPendiente(false)
      return
    }

    await cargarDatos()
    limpiarPagoPendiente()
    setMensaje('Pago registrado correctamente.')
    setGuardandoPagoPendiente(false)
  }

"""

codigo = codigo.replace(
    marca_venta,
    funciones_inventario + marca_venta,
    1,
)

# ============================================================
# 8. ABRIR VENTA
# ============================================================

abrir_venta_original = """  function abrirNuevaVenta() {
    setFormVenta(ventaInicial)
"""
abrir_venta_nuevo = """  function abrirNuevaVenta() {
    setMostrarProducto(false)
    setMostrarIngreso(false)
    setMostrarAjuste(false)
    setMostrarPagoPendiente(false)
    setFormVenta(ventaInicial)
"""
codigo = reemplazar_una_vez(
    codigo,
    abrir_venta_original,
    abrir_venta_nuevo,
    'Actualizar apertura de venta',
)

# ============================================================
# 9. REGISTRAR VENTA CON ESTADO DE PAGO
# ============================================================

nueva_registrar_venta = r"""  async function registrarVenta(evento) {
    evento.preventDefault()
    setRegistrandoVenta(true)
    setError('')
    setMensaje('')

    if (carrito.length === 0) {
      setError('Agrega al menos un producto a la venta.')
      setRegistrandoVenta(false)
      return
    }

    if (
      formVenta.estado_pago === 'pendiente' &&
      !formVenta.miembro_id
    ) {
      setError('Para una venta pendiente debes seleccionar el miembro responsable.')
      setRegistrandoVenta(false)
      return
    }

    if (
      formVenta.estado_pago === 'pagado' &&
      formVenta.metodo_pago === 'transferencia'
    ) {
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

    if (
      formVenta.estado_pago === 'pagado' &&
      formVenta.metodo_pago === 'tarjeta'
    ) {
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

    const esPagado = formVenta.estado_pago === 'pagado'

    const { error } = await supabase.rpc(
      'registrar_venta_inventario_controlado',
      {
        p_miembro_id: formVenta.miembro_id || null,
        p_estado_pago: formVenta.estado_pago,
        p_metodo_pago: esPagado ? formVenta.metodo_pago : null,
        p_notas: formVenta.notas || null,
        p_items: items,
        p_numero_comprobante:
          esPagado
            ? formVenta.numero_comprobante || null
            : null,
        p_banco_origen:
          esPagado
            ? formVenta.banco_origen || null
            : null,
        p_tipo_tarjeta:
          esPagado
            ? formVenta.tipo_tarjeta || null
            : null,
      }
    )

    if (error) {
      setError(error.message)
      setRegistrandoVenta(false)
      return
    }

    await cargarDatos()
    limpiarVenta()

    setMensaje(
      formVenta.estado_pago === 'pendiente'
        ? 'Venta registrada como pendiente de pago y stock actualizado.'
        : 'Venta registrada como pagada y stock actualizado.'
    )

    setRegistrandoVenta(false)
  }

"""

codigo = reemplazar_entre(
    codigo,
    '  async function registrarVenta(evento) {',
    '  const productosFiltrados = useMemo(() => {',
    nueva_registrar_venta,
    'Actualizar registro de venta',
)

# ============================================================
# 10. RESUMEN
# ============================================================

nuevo_resumen = r"""  const resumen = useMemo(() => {
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

    const ventasPagadasHoy = ventasHoy.filter(
      (venta) => venta.estado_pago !== 'pendiente'
    )

    const totalCobradoHoy = ventasPagadasHoy.reduce((total, venta) => {
      return total + Number(venta.total || 0)
    }, 0)

    const ventasPendientes = ventas.filter(
      (venta) => venta.estado_pago === 'pendiente'
    )

    const totalPendiente = ventasPendientes.reduce((total, venta) => {
      return total + Number(venta.total || 0)
    }, 0)

    return {
      totalProductos: productos.length,
      productosActivos: activos.length,
      bajoStock: bajoStock.length,
      valorInventario,
      ventasHoy: ventasHoy.length,
      totalCobradoHoy,
      ventasPendientes: ventasPendientes.length,
      totalPendiente,
    }
  }, [productos, ventas])

  const totalCarrito = carrito.reduce((total, item) => total + Number(item.subtotal || 0), 0)
  const totalIngreso = itemsIngreso.reduce((total, item) => total + Number(item.subtotal || 0), 0)
  const campoBloqueadoEmpleado = Boolean(editandoId && esEmpleado)

"""

codigo = reemplazar_entre(
    codigo,
    '  const resumen = useMemo(() => {',
    '  return (',
    nuevo_resumen,
    'Actualizar resumen',
)

# ============================================================
# 11. BOTONES SUPERIORES
# ============================================================

botones_original = """        <div className=\"flex flex-col gap-3 sm:flex-row\">
          <button
            onClick={abrirNuevoProducto}
            className=\"inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50\"
          >
            <Plus size={18} />
            Nuevo producto
          </button>

          <button
            onClick={abrirNuevaVenta}
            className=\"inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800\"
          >
            <ShoppingCart size={18} />
            Registrar venta
          </button>
        </div>
"""

botones_nuevos = """        <div className=\"flex flex-col gap-3 sm:flex-row sm:flex-wrap\">
          {esAdminInventario && (
            <>
              <button
                onClick={abrirNuevoProducto}
                className=\"inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50\"
              >
                <Plus size={18} />
                Nuevo producto
              </button>

              <button
                onClick={abrirIngresoMercaderia}
                className=\"inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50\"
              >
                <Package size={18} />
                Ingreso mercadería
              </button>

              <button
                onClick={() => abrirAjusteStock()}
                className=\"inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50\"
              >
                <Pencil size={18} />
                Ajustar inventario
              </button>
            </>
          )}

          <button
            onClick={abrirNuevaVenta}
            className=\"inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800\"
          >
            <ShoppingCart size={18} />
            Registrar venta
          </button>
        </div>
"""

codigo = reemplazar_una_vez(
    codigo,
    botones_original,
    botones_nuevos,
    'Actualizar botones superiores',
)

# ============================================================
# 12. TARJETAS DE RESUMEN
# ============================================================

inicio_tarjetas = '      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">'
fin_tarjetas = '      {mostrarProducto && ('

nuevas_tarjetas = r"""      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs text-gray-500 md:text-sm">Productos</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">
            {cargando ? '-' : resumen.totalProductos}
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
          <p className="text-xs text-gray-500 md:text-sm">Cobrado hoy</p>
          <h2 className="mt-2 text-xl font-bold text-green-700 md:text-2xl">
            {cargando ? '-' : formatearDinero(resumen.totalCobradoHoy)}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs text-gray-500 md:text-sm">Pendiente de cobro</p>
          <h2 className="mt-2 text-xl font-bold text-orange-700 md:text-2xl">
            {cargando ? '-' : formatearDinero(resumen.totalPendiente)}
          </h2>
          {!cargando && resumen.ventasPendientes > 0 && (
            <p className="mt-1 text-xs text-orange-700">
              {resumen.ventasPendientes} venta{resumen.ventasPendientes === 1 ? '' : 's'}
            </p>
          )}
        </div>
      </div>

"""

codigo = reemplazar_entre(
    codigo,
    inicio_tarjetas,
    fin_tarjetas,
    nuevas_tarjetas,
    'Actualizar tarjetas de resumen',
)

# ============================================================
# 13. FORMULARIO DE PRODUCTO: STOCK CONTROLADO
# ============================================================

codigo = codigo.replace(
    """              <p className=\"mt-1 text-sm text-gray-500\">\n                {campoBloqueadoEmpleado\n                  ? 'Como empleado solo puedes editar el nombre del producto.'\n                  : 'Define precio, costo, stock y stock mínimo.'}\n              </p>\n""",
    """              <p className=\"mt-1 text-sm text-gray-500\">\n                Define los datos comerciales del producto. Para productos existentes, el stock se modifica desde Ingreso de mercadería o Ajustar inventario.\n              </p>\n""",
    1,
)

stock_original = """            <div>
              <label className=\"mb-1 block text-sm font-medium text-gray-700\">
                Stock actual
              </label>
              <input
                type=\"number\"
                min=\"0\"
                value={formProducto.stock}
                onChange={(e) => actualizarProducto('stock', e.target.value)}
                disabled={campoBloqueadoEmpleado}
                className=\"w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-500\"
                placeholder=\"Ej: 24\"
              />
            </div>
"""

stock_nuevo = """            <div>
              <label className=\"mb-1 block text-sm font-medium text-gray-700\">
                {editandoId ? 'Stock actual' : 'Stock inicial'}
              </label>
              <input
                type=\"number\"
                min=\"0\"
                value={formProducto.stock}
                onChange={(e) => actualizarProducto('stock', e.target.value)}
                disabled={Boolean(editandoId)}
                className=\"w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-500\"
                placeholder=\"Ej: 24\"
              />
              {editandoId && (
                <p className=\"mt-1 text-xs text-gray-500\">
                  Usa Ingreso de mercadería o Ajustar inventario para modificar existencias.
                </p>
              )}
            </div>
"""

codigo = reemplazar_una_vez(
    codigo,
    stock_original,
    stock_nuevo,
    'Bloquear stock en edición de producto',
)

# ============================================================
# 14. INSERTAR FORMULARIOS DE INGRESO Y AJUSTE ANTES DE VENTA
# ============================================================

marca_mostrar_venta = '      {mostrarVenta && ('

paneles_admin = r"""      {mostrarIngreso && esAdminInventario && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Ingreso de mercadería
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Registra la factura del proveedor y suma automáticamente las unidades recibidas al stock existente.
              </p>
            </div>

            <button
              type="button"
              onClick={limpiarIngreso}
              className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={registrarIngresoMercaderia}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Proveedor
                </label>
                <input
                  value={formIngreso.proveedor}
                  onChange={(e) =>
                    setFormIngreso((actual) => ({
                      ...actual,
                      proveedor: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Ej: Coca-Cola"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Número de factura
                </label>
                <input
                  value={formIngreso.numero_factura}
                  onChange={(e) =>
                    setFormIngreso((actual) => ({
                      ...actual,
                      numero_factura: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Ej: 001-001-000123456"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Fecha de factura
                </label>
                <input
                  type="date"
                  value={formIngreso.fecha_factura}
                  onChange={(e) =>
                    setFormIngreso((actual) => ({
                      ...actual,
                      fecha_factura: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notas
                </label>
                <input
                  value={formIngreso.notas}
                  onChange={(e) =>
                    setFormIngreso((actual) => ({
                      ...actual,
                      notas: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="font-bold text-gray-900">
                Productos recibidos
              </h3>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_150px_auto]">
                <select
                  value={productoIngresoId}
                  onChange={(e) => seleccionarProductoIngreso(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="">Seleccionar producto</option>
                  {productos.map((producto) => (
                    <option key={producto.id} value={producto.id}>
                      {producto.nombre} - Stock actual: {producto.stock || 0}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  value={cantidadIngreso}
                  onChange={(e) => setCantidadIngreso(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Cantidad"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costoIngreso}
                  onChange={(e) => setCostoIngreso(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Costo unitario"
                />

                <button
                  type="button"
                  onClick={agregarProductoIngreso}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  <Plus size={18} />
                  Agregar
                </button>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200">
              {itemsIngreso.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  No hay productos agregados a la factura.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Producto</th>
                        <th className="px-4 py-3">Stock anterior</th>
                        <th className="px-4 py-3">Recibido</th>
                        <th className="px-4 py-3">Nuevo stock</th>
                        <th className="px-4 py-3">Costo unit.</th>
                        <th className="px-4 py-3">Subtotal</th>
                        <th className="px-4 py-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {itemsIngreso.map((item) => (
                        <tr key={item.producto_id}>
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {item.nombre}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {item.stock_actual}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            +{item.cantidad}
                          </td>
                          <td className="px-4 py-3 font-semibold text-green-700">
                            {Number(item.stock_actual) + Number(item.cantidad)}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {formatearDinero(item.costo_unitario)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {formatearDinero(item.subtotal)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => quitarProductoIngreso(item.producto_id)}
                              className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                            >
                              <Minus size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-gray-500">Total factura registrada</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatearDinero(totalIngreso)}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={guardandoIngreso || itemsIngreso.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={18} />
                  {guardandoIngreso ? 'Guardando...' : 'Registrar ingreso'}
                </button>

                <button
                  type="button"
                  onClick={limpiarIngreso}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-white"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {mostrarAjuste && esAdminInventario && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Ajustar inventario
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Úsalo únicamente cuando el conteo físico sea distinto al stock del sistema. El motivo quedará registrado.
              </p>
            </div>

            <button
              type="button"
              onClick={limpiarAjuste}
              className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={registrarAjusteStock} className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Producto
              </label>
              <select
                value={formAjuste.producto_id}
                onChange={(e) => {
                  const producto = productos.find(
                    (item) => item.id === e.target.value
                  )

                  setFormAjuste((actual) => ({
                    ...actual,
                    producto_id: e.target.value,
                    stock_fisico:
                      producto
                        ? String(producto.stock || 0)
                        : '',
                  }))
                }}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="">Seleccionar producto</option>
                {productos.map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre} - Sistema: {producto.stock || 0}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Stock físico contado
              </label>
              <input
                type="number"
                min="0"
                value={formAjuste.stock_fisico}
                onChange={(e) =>
                  setFormAjuste((actual) => ({
                    ...actual,
                    stock_fisico: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: 18"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Motivo del ajuste
              </label>
              <input
                value={formAjuste.motivo}
                onChange={(e) =>
                  setFormAjuste((actual) => ({
                    ...actual,
                    motivo: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: Conteo físico de cierre"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:col-span-3">
              <button
                type="submit"
                disabled={guardandoAjuste}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {guardandoAjuste ? 'Guardando...' : 'Guardar ajuste'}
              </button>

              <button
                type="button"
                onClick={limpiarAjuste}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

"""

if marca_mostrar_venta not in codigo:
    error('No se encontro el formulario de venta.')
codigo = codigo.replace(
    marca_mostrar_venta,
    paneles_admin + marca_mostrar_venta,
    1,
)

# ============================================================
# 15. CAMPOS DE ESTADO DE PAGO EN VENTA
# ============================================================

bloque_campos_venta = r"""            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
"""

bloque_campos_venta_nuevo = r"""            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                  Estado del cobro
                </label>
                <select
                  value={formVenta.estado_pago}
                  onChange={(e) => actualizarVenta('estado_pago', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold outline-none focus:border-black"
                >
                  <option value="pagado">Pagado</option>
                  <option value="pendiente">Pendiente de pago</option>
                </select>
              </div>

              {formVenta.estado_pago === 'pagado' && (
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
              )}

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

              {formVenta.estado_pago === 'pagado' && formVenta.metodo_pago === 'transferencia' && (
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

              {formVenta.estado_pago === 'pagado' && formVenta.metodo_pago === 'tarjeta' && (
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

            {formVenta.estado_pago === 'pendiente' && (
              <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                La venta descontará el stock inmediatamente. El método de pago se registrará cuando el cliente cancele.
              </div>
            )}
"""

codigo = reemplazar_una_vez(
    codigo,
    bloque_campos_venta,
    bloque_campos_venta_nuevo,
    'Agregar estado de cobro a venta',
)

# Texto inferior de venta
texto_pago_original = """                <p className=\"mt-1 text-xs text-gray-500\">
                  {formVenta.metodo_pago === 'efectivo'
                    ? 'Pago en efectivo'
                    : formVenta.metodo_pago === 'transferencia'
                      ? 'Pago por transferencia con respaldo obligatorio'
                      : 'Pago con tarjeta con respaldo obligatorio'}
                </p>
"""

texto_pago_nuevo = """                <p className=\"mt-1 text-xs text-gray-500\">
                  {formVenta.estado_pago === 'pendiente'
                    ? 'La venta quedará pendiente de cobro.'
                    : formVenta.metodo_pago === 'efectivo'
                      ? 'Pago en efectivo'
                      : formVenta.metodo_pago === 'transferencia'
                        ? 'Pago por transferencia con respaldo obligatorio'
                        : 'Pago con tarjeta con respaldo obligatorio'}
                </p>
"""

codigo = reemplazar_una_vez(
    codigo,
    texto_pago_original,
    texto_pago_nuevo,
    'Actualizar resumen de pago de venta',
)

# ============================================================
# 16. PANEL PARA COBRAR VENTA PENDIENTE
# ============================================================

marca_productos = '      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">\n        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-5">\n          <div>\n            <h2 className="text-lg font-bold text-gray-900">Productos</h2>'

panel_pago = r"""      {mostrarPagoPendiente && ventaPendienteSeleccionada && (
        <div className="mt-6 rounded-2xl border border-orange-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Registrar pago pendiente
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {ventaPendienteSeleccionada.miembros
                  ? `${ventaPendienteSeleccionada.miembros.nombre} ${ventaPendienteSeleccionada.miembros.apellido}`
                  : 'Venta sin miembro asociado'} · {formatearDinero(ventaPendienteSeleccionada.total)}
              </p>
            </div>

            <button
              type="button"
              onClick={limpiarPagoPendiente}
              className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={registrarPagoPendiente} className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Método de pago
              </label>
              <select
                value={formPagoPendiente.metodo_pago}
                onChange={(e) => actualizarPagoPendiente('metodo_pago', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </div>

            {formPagoPendiente.metodo_pago === 'transferencia' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Número de comprobante
                  </label>
                  <input
                    value={formPagoPendiente.numero_comprobante}
                    onChange={(e) => actualizarPagoPendiente('numero_comprobante', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Ej: TRX-001234"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Banco de origen
                  </label>
                  <input
                    value={formPagoPendiente.banco_origen}
                    onChange={(e) => actualizarPagoPendiente('banco_origen', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Ej: Banco Pichincha"
                  />
                </div>
              </>
            )}

            {formPagoPendiente.metodo_pago === 'tarjeta' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tipo de tarjeta
                  </label>
                  <select
                    value={formPagoPendiente.tipo_tarjeta}
                    onChange={(e) => actualizarPagoPendiente('tipo_tarjeta', e.target.value)}
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
                    Número de comprobante
                  </label>
                  <input
                    value={formPagoPendiente.numero_comprobante}
                    onChange={(e) => actualizarPagoPendiente('numero_comprobante', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Ej: POS-001234"
                  />
                </div>
              </>
            )}

            <div className="flex flex-col gap-3 sm:flex-row md:col-span-3">
              <button
                type="submit"
                disabled={guardandoPagoPendiente}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Receipt size={18} />
                {guardandoPagoPendiente ? 'Registrando...' : 'Marcar como pagado'}
              </button>

              <button
                type="button"
                onClick={limpiarPagoPendiente}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

"""

if marca_productos not in codigo:
    error('No se encontro la seccion Productos.')

codigo = codigo.replace(
    marca_productos,
    panel_pago + marca_productos,
    1,
)

# ============================================================
# 17. OCULTAR ACCIONES DE PRODUCTOS PARA EMPLEADO
# ============================================================

# Vista móvil: envolver todo el bloque de acciones.
mobile_acciones_original = r"""                    <div className="mt-4 flex justify-end gap-2">
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
"""

mobile_acciones_nuevo = r"""                    {esAdminInventario && (
                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          onClick={() => editarProducto(producto)}
                          className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                          title="Editar"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          onClick={() => abrirAjusteStock(producto)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                          title="Ajustar stock"
                        >
                          Stock
                        </button>

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
                      </div>
                    )}
"""

codigo = reemplazar_una_vez(
    codigo,
    mobile_acciones_original,
    mobile_acciones_nuevo,
    'Actualizar acciones móviles de producto',
)

# Vista escritorio: reemplazar celda de acciones.
desktop_acciones_original = r"""                        <td className="px-5 py-4">
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
"""

desktop_acciones_nuevo = r"""                        <td className="px-5 py-4">
                          {esAdminInventario ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => editarProducto(producto)}
                                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                                title="Editar"
                              >
                                <Pencil size={17} />
                              </button>

                              <button
                                onClick={() => abrirAjusteStock(producto)}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                                title="Ajustar stock"
                              >
                                Stock
                              </button>

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
                            </div>
                          ) : (
                            <div className="text-right text-xs text-gray-400">
                              Solo lectura
                            </div>
                          )}
                        </td>
"""

codigo = reemplazar_una_vez(
    codigo,
    desktop_acciones_original,
    desktop_acciones_nuevo,
    'Actualizar acciones de escritorio',
)

# ============================================================
# 18. ÚLTIMAS VENTAS + HISTORIAL DE INGRESOS
# ============================================================

inicio_ultimas = codigo.find(
    '      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">\n'
    '        <div className="border-b border-gray-200 p-4 md:p-5">\n'
    '          <h2 className="text-lg font-bold text-gray-900">Últimas ventas</h2>'
)

if inicio_ultimas == -1:
    error('No se encontro la seccion Últimas ventas.')

fin_componente = codigo.rfind('    </div>\n  )\n}')
if fin_componente == -1 or fin_componente <= inicio_ultimas:
    error('No se encontro el cierre del componente.')

secciones_finales = r"""      {esAdminInventario && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-4 md:p-5">
            <h2 className="text-lg font-bold text-gray-900">
              Últimos ingresos de mercadería
            </h2>
            <p className="text-sm text-gray-500">
              Historial de facturas recibidas y stock incorporado.
            </p>
          </div>

          {ingresos.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Todavía no hay ingresos de mercadería registrados.
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
              {ingresos.map((ingreso) => (
                <div key={ingreso.id} className="p-4 md:p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-bold text-gray-900">
                        {ingreso.proveedor || 'Proveedor'}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        Factura: {ingreso.numero_factura || '-'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Ingreso: {formatearFechaHora(ingreso.fecha_ingreso)}
                      </p>
                      {ingreso.fecha_factura && (
                        <p className="mt-1 text-xs text-gray-500">
                          Fecha factura: {String(ingreso.fecha_factura).split('-').reverse().join('/')}
                        </p>
                      )}
                    </div>

                    <p className="text-xl font-bold text-gray-900">
                      {formatearDinero(ingreso.total)}
                    </p>
                  </div>

                  {ingreso.inventario_ingresos_detalle?.length > 0 && (
                    <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                      {ingreso.inventario_ingresos_detalle
                        .map((item) =>
                          `${item.productos?.nombre || 'Producto'} +${item.cantidad} (${item.stock_anterior} → ${item.stock_nuevo})`
                        )
                        .join(' · ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4 md:p-5">
          <h2 className="text-lg font-bold text-gray-900">Últimas ventas</h2>
          <p className="text-sm text-gray-500">
            Ventas recientes y estado de cobro.
          </p>
        </div>

        {ventas.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No hay ventas registradas.
          </div>
        ) : (
          <div className="max-h-[520px] overflow-y-auto">
            <div className="divide-y divide-gray-100">
              {ventas.map((venta) => (
                <div
                  key={venta.id}
                  className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:p-5"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-gray-900">
                        {venta.miembros
                          ? `${venta.miembros.nombre} ${venta.miembros.apellido}`
                          : 'Venta sin miembro asociado'}
                      </p>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          venta.estado_pago === 'pendiente'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {venta.estado_pago === 'pendiente'
                          ? 'Pendiente'
                          : 'Pagado'}
                      </span>
                    </div>

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

                    <p className={`mt-1 text-xs font-semibold ${
                      venta.estado_pago === 'pendiente'
                        ? 'text-orange-700'
                        : 'text-gray-500'
                    }`}>
                      {obtenerDetallePago(venta)}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <p className="text-xl font-bold text-gray-900">
                      {formatearDinero(venta.total)}
                    </p>

                    {venta.estado_pago === 'pendiente' ? (
                      <button
                        type="button"
                        onClick={() => abrirPagoPendiente(venta)}
                        className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800"
                      >
                        Registrar pago
                      </button>
                    ) : (
                      <p className="text-sm capitalize text-gray-500">
                        {venta.metodo_pago || '-'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
"""

codigo = (
    codigo[:inicio_ultimas]
    + secciones_finales
    + codigo[fin_componente:]
)

# ============================================================
# 19. VALIDACIONES FINALES
# ============================================================

validaciones = [
    MARCADOR,
    "const esAdminInventario",
    "registrar_ingreso_inventario",
    "ajustar_stock_inventario",
    "registrar_venta_inventario_controlado",
    "marcar_venta_pagada",
    "Ingreso de mercadería",
    "Pendiente de pago",
    "Registrar pago",
    "Últimos ingresos de mercadería",
    "export default function InventarioPage()",
]

for texto in validaciones:
    if texto not in codigo:
        error(f'Fallo validacion final: {texto}')

if codigo.count('export default function InventarioPage()') != 1:
    error('InventarioPage quedo duplicado o inconsistente.')

if codigo.count('async function registrarVenta(evento)') != 1:
    error('registrarVenta quedo duplicada o inconsistente.')

# ============================================================
# 20. RESPALDO Y GUARDADO
# ============================================================

if not RESPALDO.exists():
    shutil.copy2(ARCHIVO, RESPALDO)

ARCHIVO.write_text(codigo, encoding='utf-8')

print('')
print('==============================================')
print(' MEJORA DE INVENTARIO INSTALADA CORRECTAMENTE')
print('==============================================')
print('')
print('Se implemento:')
print('- Admin: crear y editar productos.')
print('- Admin: ingreso de mercaderia por factura.')
print('- Admin: ajuste controlado de stock.')
print('- Empleado: productos en modo solo lectura.')
print('- Todos los staff: registrar ventas.')
print('- Venta pagada o pendiente de pago.')
print('- Cobro posterior de ventas pendientes.')
print('- Historial de ingresos de mercaderia.')
print('')
print('Respaldo:')
print(RESPALDO)
print('')
print('Ahora ejecuta:')
print('npm run dev')
print('')
