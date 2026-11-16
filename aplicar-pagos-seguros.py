from pathlib import Path
import re, shutil, os, sys, tempfile

M_PATH=Path('app/membresias/page.js')
U_PATH=Path('app/miembros/page.js')
MARKER='MAK_PAGOS_SEGUROS_V1'

def fail(msg):
    print('\nERROR:', msg)
    print('No se modificó ningún archivo.')
    sys.exit(1)

for p in (M_PATH, U_PATH):
    if not p.is_file():
        fail(f'No existe {p}. Ejecuta este script desde la raíz de gimnasio-admin.')

ORIG_M=M_PATH.read_bytes()
ORIG_U=U_PATH.read_bytes()
TEXT_M=ORIG_M.decode('utf-8')
TEXT_U=ORIG_U.decode('utf-8')

if MARKER in TEXT_M and MARKER in TEXT_U:
    print('La mejora de pagos seguros ya está instalada en Membresías y Miembros.')
    sys.exit(0)

if (MARKER in TEXT_M) != (MARKER in TEXT_U):
    fail('La mejora aparece solo en uno de los dos archivos. Revisa el estado antes de continuar.')


def read(p):
    b=p.read_bytes(); nl='\r\n' if b'\r\n' in b else '\n'; return b.decode('utf-8').replace('\r\n','\n'),nl

def write(p,s,nl):
    if nl=='\r\n': s=s.replace('\n','\r\n')
    p.write_bytes(s.encode())

def replace_once(s, old, new, name):
    n=s.count(old)
    if n!=1: raise RuntimeError(f'{name}: expected 1, got {n}')
    return s.replace(old,new,1)

def replace_between(s,start,end,new,name,include_end=False):
    a=s.find(start)
    if a<0: raise RuntimeError(f'{name}: start not found')
    b=s.find(end,a+len(start))
    if b<0: raise RuntimeError(f'{name}: end not found')
    if include_end: b+=len(end)
    return s[:a]+new+s[b:]

common_helpers = r'''// MAK_PAGOS_SEGUROS_V1
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
'''

# ---- MEMBERSHIPS ----
m,nl_m=read(M_PATH)

# insert helpers before membership initial
m=replace_once(m, "const membresiaInicial = {\n", common_helpers+"\nconst membresiaInicial = {\n", 'm helpers')

old_obj='''const membresiaInicial = {
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
'''
new_obj='''const membresiaInicial = {
  miembro_id: '',
  plan_id: '',
  fecha_inicio: obtenerFechaHoy(),
  notas: '',
  renovacion_de_membresia_id: null,
  operacion_id: '',
  pagos: [crearPagoMembresia()],
}
'''
m=replace_once(m,old_obj,new_obj,'m initial obj')

# payment detail canje
m=replace_once(m, "  if (pago.metodo_pago === 'tarjeta') {\n    return `Comprobante: ${pago.numero_comprobante || '-'} · Tarjeta: ${obtenerEtiquetaTarjeta(pago.tipo_tarjeta)}`\n  }\n\n  return 'Pago en efectivo'\n", "  if (pago.metodo_pago === 'tarjeta') {\n    return `Comprobante: ${pago.numero_comprobante || '-'} · Tarjeta: ${obtenerEtiquetaTarjeta(pago.tipo_tarjeta)}`\n  }\n\n  if (pago.metodo_pago === 'canje') {\n    return pago.notas ? `Canje · ${pago.notas}` : 'Canje'\n  }\n\n  return 'Pago en efectivo'\n", 'm canje detail')

# admin payments flag
m=replace_once(m, "  const esDueno = perfil?.rol === 'dueno'\n", "  const esDueno = perfil?.rol === 'dueno'\n  const esAdminPagos = ['dueno', 'administrador'].includes(perfil?.rol)\n", 'm admin flag')

# initial state form
m=replace_once(m, "  const [formMembresia, setFormMembresia] = useState({\n    ...membresiaInicial,\n    fecha_inicio: obtenerFechaHoy(),\n  })\n", "  const [formMembresia, setFormMembresia] = useState(() => ({\n    ...membresiaInicial,\n    fecha_inicio: obtenerFechaHoy(),\n    operacion_id: crearIdOperacion(),\n    pagos: [crearPagoMembresia()],\n  }))\n", 'm form initial state')

# extra states after detalleVencida
m=replace_once(m, "  const [detalleVencida, setDetalleVencida] = useState(null)\n", "  const [detalleVencida, setDetalleVencida] = useState(null)\n\n  const [detallePagos, setDetallePagos] = useState(null)\n  const [historialPagos, setHistorialPagos] = useState([])\n  const [cargandoHistorialPagos, setCargandoHistorialPagos] = useState(false)\n  const [pagoCorreccion, setPagoCorreccion] = useState(null)\n  const [guardandoCorreccionPago, setGuardandoCorreccionPago] = useState(false)\n  const [formCorreccionPago, setFormCorreccionPago] = useState({\n    metodo_pago: 'efectivo',\n    notas: '',\n    numero_comprobante: '',\n    banco_origen: '',\n    tipo_tarjeta: '',\n    motivo: '',\n  })\n", 'm history states')

# update membership function block
start="  function actualizarMembresia(campo, valor) {\n"
end="  function actualizarInscripcion(campo, valor) {\n"
new='''  function actualizarMembresia(campo, valor) {
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

'''
m=replace_between(m,start,end,new,'m update membership')

# open/renew/clean block
start="  function abrirNuevaMembresia() {\n"
end="  function abrirInscripcion() {\n"
new='''  function abrirNuevaMembresia() {
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

  function renovarMembresia(membresia) {
    const planId = membresia.plan_id
    const plan = planes.find((item) => item.id === planId)
    const fechaInicio = calcularFechaInicioInteligente(membresia.miembro_id)
    const montoPlan = plan ? String(plan.precio) : String(membresia.plan_precio_snapshot || '')

    setFormMembresia({
      miembro_id: membresia.miembro_id,
      plan_id: planId || '',
      fecha_inicio: fechaInicio,
      notas: `Renovación de membresía programada para ${formatearFecha(obtenerFechaRenovacionMembresia(membresia))}.`,
      renovacion_de_membresia_id: membresia.id,
      operacion_id: crearIdOperacion(),
      pagos: [crearPagoMembresia(montoPlan)],
    })

    cerrarFormularios()
    setMostrarMembresia(true)
    setError('')
    setMensaje('La nueva membresía iniciará en la fecha de renovación correspondiente, sin perder días de vigencia.')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
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

'''
m=replace_between(m,start,end,new,'m open renew clean')

# guardar membresia
start="  async function guardarMembresia(evento) {\n"
end="  async function guardarInscripcion(evento) {\n"
new='''  async function guardarMembresia(evento) {
    evento.preventDefault()

    if (guardandoMembresia) return

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

    const errorPagos = validarPagosMembresia(
      formMembresia.pagos,
      plan.precio,
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

    const { error } = await supabase.rpc('registrar_membresia_con_pagos', {
      p_miembro_id: formMembresia.miembro_id,
      p_plan_id: formMembresia.plan_id,
      p_pagos: pagosOperacion,
      p_fecha_inicio_manual: formMembresia.fecha_inicio,
      p_renovacion_de_membresia_id: formMembresia.renovacion_de_membresia_id || null,
      p_notas: formMembresia.notas || null,
      p_operacion_id: operacionId,
    })

    if (error) {
      setError(error.message)
      setGuardandoMembresia(false)
      return
    }

    await cargarDatos()
    limpiarMembresia()
    setFiltroEstado('activa')
    setMensaje('Membresía y pagos registrados correctamente.')
    setGuardandoMembresia(false)
  }

'''
m=replace_between(m,start,end,new,'m guardar')

# history functions before memberships memo
anchor="  const membresiasConEstadoReal = useMemo(() => {\n"
history_funcs=r'''  async function cargarHistorialPagosMembresia(membresiaId) {
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

  async function abrirHistorialPagos(membresia) {
    if (!esAdminPagos) {
      setError('Solo dueño o administrador puede consultar el historial de pagos.')
      return
    }

    setDetallePagos(membresia)
    setHistorialPagos([])
    setPagoCorreccion(null)
    setCargandoHistorialPagos(true)
    setError('')

    try {
      await cargarHistorialPagosMembresia(membresia.id)
    } catch (errorHistorial) {
      setError(errorHistorial.message)
    } finally {
      setCargandoHistorialPagos(false)
    }
  }

  function cerrarHistorialPagos() {
    setDetallePagos(null)
    setHistorialPagos([])
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

'''
m=replace_once(m,anchor,history_funcs+anchor,'m history functions')

# membership form payment region
start='''            <div>\n              <label className="mb-1 block text-sm font-medium text-gray-700">\n                Monto pagado\n'''
# actual string with literal newlines
start=start.replace('\\n','\n')
end='''            <div className="flex flex-col gap-3 sm:flex-row md:col-span-3">\n'''.replace('\\n','\n')
a=m.find(start)
if a<0: raise RuntimeError('m form payment start')
b=m.find(end,a)
if b<0: raise RuntimeError('m form payment end')
replacement='''            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Próxima renovación
              </label>
              <div className="flex min-h-[46px] items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                {formMembresia.plan_id
                  ? formatearFecha(
                      calcularFechaRenovacionPlan(
                        formMembresia.fecha_inicio,
                        planes.find(
                          (plan) =>
                            plan.id ===
                            formMembresia.plan_id
                        )
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
                  planes.find((plan) => plan.id === formMembresia.plan_id)?.precio || 0
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

'''
m=m[:a]+replacement+m[b:]

# modal insert before summary comment
modal_anchor="      {/* MAK_RESUMEN_MEMBRESIAS_SOLO_ADMIN */}\n"
modal=r'''      {detallePagos && esAdminPagos && (
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
                  Historial de pagos
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

'''
m=replace_once(m,modal_anchor,modal+modal_anchor,'m modal')

# insert history buttons before renew both occurrences
needle='''                      <button
                        onClick={() => renovarMembresia(membresia)}
'''
insert='''                      {esAdminPagos && (
                        <button
                          type="button"
                          onClick={() => abrirHistorialPagos(membresia)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                          title="Historial de pagos"
                        >
                          <BadgeDollarSign size={17} />
                          Pagos
                        </button>
                      )}

                      <button
                        onClick={() => renovarMembresia(membresia)}
'''
if m.count(needle)!=1: print('mobile needle count',m.count(needle))
m=replace_once(m,needle,insert,'m mobile history button')
needle2='''                            <button
                              onClick={() => renovarMembresia(membresia)}
'''
insert2='''                            {esAdminPagos && (
                              <button
                                type="button"
                                onClick={() => abrirHistorialPagos(membresia)}
                                className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                                title="Historial de pagos"
                              >
                                <BadgeDollarSign size={17} />
                              </button>
                            )}

                            <button
                              onClick={() => renovarMembresia(membresia)}
'''
m=replace_once(m,needle2,insert2,'m desktop history button')

# clean duplicate onClick if present
m=m.replace("                          <button\n                            onClick={() => eliminarMembresia(membresia)}\n                            onClick={() => eliminarMembresia(membresia)}\n", "                          <button\n                            onClick={() => eliminarMembresia(membresia)}\n")

# ---- MEMBERS ----
u,nl_u=read(U_PATH)
# common helpers before crearMembresiaInicial
u=replace_once(u, "function crearMembresiaInicial() {\n", common_helpers+"\nfunction crearMembresiaInicial() {\n", 'u helpers')
# function initial replace
old='''function crearMembresiaInicial() {
  return {
    plan_id: '',
    fecha_inicio:
      obtenerFechaHoy(),
    metodo_pago: 'efectivo',
    monto: '',
    notas: '',
    numero_comprobante: '',
    banco_origen: '',
    tipo_tarjeta: '',
  }
}
'''
new='''function crearMembresiaInicial() {
  return {
    plan_id: '',
    fecha_inicio:
      obtenerFechaHoy(),
    notas: '',
    operacion_id:
      crearIdOperacion(),
    pagos: [
      crearPagoMembresia(),
    ],
  }
}
'''
u=replace_once(u,old,new,'u initial')
# admin flag
u=replace_once(u, "function MiembrosContenido({ perfil }) {\n  const esEmpleado = perfil?.rol === 'empleado'\n", "function MiembrosContenido({ perfil }) {\n  const esEmpleado = perfil?.rol === 'empleado'\n  const esAdminPagos = ['dueno', 'administrador'].includes(perfil?.rol)\n", 'u admin flag')
# update function
start="  function actualizarMembresia(\n    campo,\n    valor\n  ) {\n"
end="  function limpiarFormulario() {\n"
new='''  function actualizarMembresia(
    campo,
    valor
  ) {
    setFormMembresia(
      (actual) => {
        const nuevo = {
          ...actual,
          [campo]: valor,
        }

        if (
          campo === 'plan_id'
        ) {
          const plan =
            planes.find(
              (item) =>
                item.id ===
                valor
            )

          const pagosActuales =
            Array.isArray(
              actual.pagos
            ) &&
            actual.pagos.length > 0
              ? actual.pagos.map(
                  (pago) => ({
                    ...pago,
                  })
                )
              : [
                  crearPagoMembresia(),
                ]

          if (
            pagosActuales.length === 1
          ) {
            pagosActuales[0].monto =
              plan
                ? String(
                    plan.precio
                  )
                : ''
          }

          nuevo.pagos =
            pagosActuales
        }

        return nuevo
      }
    )
  }

  function actualizarPagoMembresia(
    indice,
    campo,
    valor
  ) {
    setFormMembresia(
      (actual) => ({
        ...actual,
        pagos:
          actual.pagos.map(
            (
              pago,
              posicion
            ) =>
              posicion === indice
                ? ajustarPagoMembresiaPorMetodo(
                    pago,
                    campo,
                    valor
                  )
                : pago
          ),
      })
    )
  }

  function agregarPagoMembresia() {
    setFormMembresia(
      (actual) => {
        if (
          actual.pagos.length >= 5
        ) {
          return actual
        }

        return {
          ...actual,
          pagos: [
            ...actual.pagos,
            crearPagoMembresia(),
          ],
        }
      }
    )
  }

  function eliminarPagoMembresia(
    indice
  ) {
    setFormMembresia(
      (actual) => {
        if (
          actual.pagos.length <= 1
        ) {
          return actual
        }

        return {
          ...actual,
          pagos:
            actual.pagos.filter(
              (_, posicion) =>
                posicion !== indice
            ),
        }
      }
    )
  }

'''
u=replace_between(u,start,end,new,'u update membership')
# registrar function
start="  async function registrarMembresiaInicial(\n    miembroId\n  ) {\n"
end="  async function guardarMiembro(\n    evento\n  ) {\n"
new='''  async function registrarMembresiaInicial(
    miembroId
  ) {
    const plan =
      planes.find(
        (item) =>
          item.id ===
          formMembresia.plan_id
      )

    if (!plan) {
      throw new Error(
        'Debes seleccionar un plan vigente.'
      )
    }

    if (
      !formMembresia.fecha_inicio
    ) {
      throw new Error(
        'La fecha de inicio de la membresía es obligatoria.'
      )
    }

    const errorPagos =
      validarPagosMembresia(
        formMembresia.pagos,
        plan.precio,
        esAdminPagos
      )

    if (errorPagos) {
      throw new Error(
        errorPagos
      )
    }

    const operacionId =
      formMembresia.operacion_id ||
      crearIdOperacion()

    if (
      !formMembresia.operacion_id
    ) {
      setFormMembresia(
        (actual) => ({
          ...actual,
          operacion_id:
            operacionId,
        })
      )
    }

    const pagosOperacion =
      formMembresia.pagos.map(
        (pago) => ({
          metodo_pago:
            pago.metodo_pago,

          monto:
            Number(
              pago.monto
            ),

          notas:
            String(
              pago.notas || ''
            ).trim() || null,

          numero_comprobante:
            String(
              pago.numero_comprobante || ''
            ).trim() || null,

          banco_origen:
            String(
              pago.banco_origen || ''
            ).trim() || null,

          tipo_tarjeta:
            pago.tipo_tarjeta ||
            null,
        })
      )

    const {
      error,
    } = await supabase.rpc(
      'registrar_membresia_con_pagos',
      {
        p_miembro_id:
          miembroId,

        p_plan_id:
          formMembresia.plan_id,

        p_pagos:
          pagosOperacion,

        p_fecha_inicio_manual:
          formMembresia.fecha_inicio,

        p_renovacion_de_membresia_id:
          null,

        p_notas:
          formMembresia.notas.trim() ||
          null,

        p_operacion_id:
          operacionId,
      }
    )

    if (error) {
      throw new Error(
        error.message
      )
    }
  }

'''
u=replace_between(u,start,end,new,'u registrar')

# prevalidation block within guardar: replace `if (!editandoId && !nuevo...)` through before try
start="    if (\n      !editandoId &&\n      !nuevoMiembroPendienteId\n    ) {\n"
end="    try {\n      // =========================\n      // EDITAR SOCIO EXISTENTE\n"
a=u.find(start)
if a<0: raise RuntimeError('u prevalidation start')
b=u.find(end,a)
if b<0: raise RuntimeError('u prevalidation end')
new='''    if (
      !editandoId
    ) {
      const plan =
        planes.find(
          (item) =>
            item.id ===
            formMembresia.plan_id
        )

      if (!plan) {
        setError(
          'Debes seleccionar una membresía para el nuevo socio.'
        )
        setGuardando(false)
        return
      }

      if (
        !formMembresia.fecha_inicio
      ) {
        setError(
          'La fecha de inicio de la membresía es obligatoria.'
        )
        setGuardando(false)
        return
      }

      const errorPagos =
        validarPagosMembresia(
          formMembresia.pagos,
          plan.precio,
          esAdminPagos
        )

      if (errorPagos) {
        setError(errorPagos)
        setGuardando(false)
        return
      }
    }

'''
u=u[:a]+new+u[b:]

# UI payment block start Monto through end general notes; preserve plan info after
start='''                    <div>\n                      <label className="mb-1 block text-sm font-medium text-gray-700">\n                        Monto\n'''.replace('\\n','\n')
end='''                  {planSeleccionado && (\n'''.replace('\\n','\n')
a=u.find(start)
if a<0: raise RuntimeError('u payment ui start')
b=u.find(end,a)
if b<0: raise RuntimeError('u payment ui end')
replacement='''                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-bold text-gray-900">
                        Formas de pago
                      </label>

                      <PagosMembresiaEditor
                        pagos={formMembresia.pagos}
                        actualizarPago={actualizarPagoMembresia}
                        agregarPago={agregarPagoMembresia}
                        eliminarPago={eliminarPagoMembresia}
                        permitirCanje={esAdminPagos}
                        precioPlan={planSeleccionado?.precio || 0}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Nota general de la membresía
                      </label>

                      <textarea
                        value={formMembresia.notas}
                        onChange={(e) =>
                          actualizarMembresia(
                            'notas',
                            e.target.value
                          )
                        }
                        className="min-h-20 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

'''
u=u[:a]+replacement+u[b:]

# ============================================================
# VALIDACIONES FINALES ANTES DE ESCRIBIR
# ============================================================
for nombre, codigo in [('Membresías', m), ('Miembros', u)]:
    if MARKER not in codigo:
        fail(f'{nombre}: falta el marcador de la mejora.')
    if "registrar_membresia_inteligente" in codigo:
        fail(f'{nombre}: todavía usa registrar_membresia_inteligente para membresías.')
    if codigo.count("registrar_membresia_con_pagos") != 1:
        fail(f'{nombre}: cantidad inesperada de llamadas a registrar_membresia_con_pagos.')
    if "formMembresia.monto" in codigo or "formMembresia.metodo_pago" in codigo:
        fail(f'{nombre}: quedaron referencias al formulario antiguo de un solo pago.')

if 'MAK_RESUMEN_MEMBRESIAS_SOLO_ADMIN' not in m:
    fail('Membresías: se perdió la restricción del resumen para empleados.')
if 'paginaMembresias' not in m or 'membresiasPaginadas' not in m:
    fail('Membresías: se perdió la paginación actual.')
if 'pagos_historial' not in m or 'corregir_pago_mak' not in m:
    fail('Membresías: falta el historial/corrección de pagos.')
if 'MAK_PERMISOS_EMPLEADOS_ESTABLE_V3' not in u:
    fail('Miembros: se perdió la configuración estable de permisos de empleados.')
if 'RESULTADOS_POR_PAGINA = 10' not in u:
    fail('Miembros: se perdió la paginación de 10 resultados.')

# ============================================================
# RESPALDOS + ESCRITURA ATÓMICA
# ============================================================
backup_m = M_PATH.with_name(M_PATH.name + '.antes-pagos-seguros.bak')
backup_u = U_PATH.with_name(U_PATH.name + '.antes-pagos-seguros.bak')

if not backup_m.exists():
    backup_m.write_bytes(ORIG_M)
if not backup_u.exists():
    backup_u.write_bytes(ORIG_U)

def preparar_bytes(codigo, nl):
    if nl == '\r\n':
        codigo = codigo.replace('\n', '\r\n')
    return codigo.encode('utf-8')

def temporal_para(ruta, datos):
    fd, nombre = tempfile.mkstemp(
        prefix=ruta.name + '.',
        suffix='.tmp',
        dir=str(ruta.parent),
    )
    try:
        with os.fdopen(fd, 'wb') as archivo:
            archivo.write(datos)
        return Path(nombre)
    except Exception:
        Path(nombre).unlink(missing_ok=True)
        raise

nuevo_m = preparar_bytes(m, nl_m)
nuevo_u = preparar_bytes(u, nl_u)

tmp_m = temporal_para(M_PATH, nuevo_m)
tmp_u = temporal_para(U_PATH, nuevo_u)

try:
    os.replace(tmp_m, M_PATH)
    os.replace(tmp_u, U_PATH)
except Exception as exc:
    M_PATH.write_bytes(ORIG_M)
    U_PATH.write_bytes(ORIG_U)
    tmp_m.unlink(missing_ok=True)
    tmp_u.unlink(missing_ok=True)
    fail(f'No se pudieron escribir ambos archivos: {exc}')
finally:
    tmp_m.unlink(missing_ok=True)
    tmp_u.unlink(missing_ok=True)

print('')
print('PAGOS SEGUROS APLICADOS CORRECTAMENTE')
print('')
print('Se modificaron únicamente:')
print(' - app/membresias/page.js')
print(' - app/miembros/page.js')
print('')
print('Mejoras instaladas:')
print(' - Una membresía puede registrar varios métodos de pago.')
print(' - Canje visible solo para dueño/administrador.')
print(' - Cada operación usa un UUID idempotente para evitar duplicados.')
print(' - Membresías usa registrar_membresia_con_pagos.')
print(' - Historial visual y corrección del método de pago para administración.')
print(' - Miembros usa el mismo registro seguro para la membresía inicial.')
print(' - Se conservan permisos de empleados y paginación existentes.')
