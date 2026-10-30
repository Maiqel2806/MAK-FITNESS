'use client'

import EnviarAccesoMakButton from '@/components/EnviarAccesoMakButton'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { usePerfil } from '@/components/UserContext'
import {
  Plus,
  Search,
  Pencil,
  Save,
  X,
  UserRound,
  Camera,
  ImageIcon,
  Power,
  PowerOff,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  CreditCard,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const supabase = createClient()

const RESULTADOS_POR_PAGINA = 10

const tiposTarjeta = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'diners', label: 'Diners' },
  { value: 'discover', label: 'Discover' },
  {
    value: 'american_express',
    label: 'American Express',
  },
]

const estadoOpciones = [
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'suspendido', label: 'Suspendido' },
]

const formularioInicial = {
  codigo_acceso: '',
  nombre: '',
  apellido: '',
  cedula: '',
  email: '',
  telefono: '',
  fecha_nacimiento: '',
  direccion: '',
  contacto_emergencia: '',
  telefono_emergencia: '',
  estado: 'activo',
  notas: '',
  foto_url: '',
  foto_path: '',
}

function obtenerFechaHoy() {
  const partes =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone: 'America/Guayaquil',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }
    ).formatToParts(new Date())

  const year =
    partes.find(
      (parte) =>
        parte.type === 'year'
    )?.value

  const month =
    partes.find(
      (parte) =>
        parte.type === 'month'
    )?.value

  const day =
    partes.find(
      (parte) =>
        parte.type === 'day'
    )?.value

  return `${year}-${month}-${day}`
}

// MAK_PAGOS_SEGUROS_V1
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

function crearMembresiaInicial() {
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

function formatearDinero(valor) {
  return `$${Number(
    valor || 0
  ).toFixed(2)}`
}


// MAK_DETALLE_MEMBRESIA_V2

function formatearFechaDetalle(fecha) {
  if (!fecha) return '-'

  const [year, month, day] =
    String(fecha)
      .slice(0, 10)
      .split('-')

  return `${day}/${month}/${year}`
}

function sumarDiasDetalle(fecha, dias) {
  if (!fecha) return ''

  const [year, month, day] =
    String(fecha)
      .slice(0, 10)
      .split('-')
      .map(Number)

  const date = new Date(
    Date.UTC(year, month - 1, day)
  )

  date.setUTCDate(
    date.getUTCDate() + Number(dias || 0)
  )

  return date.toISOString().slice(0, 10)
}

function normalizarTelefonoWhatsAppDetalle(telefono) {
  const numero = String(
    telefono || ''
  ).replace(/\D/g, '')

  if (
    numero.startsWith('593') &&
    numero.length === 12 &&
    numero.slice(3).startsWith('9')
  ) {
    return numero
  }

  if (
    numero.startsWith('09') &&
    numero.length === 10
  ) {
    return `593${numero.slice(1)}`
  }

  if (
    numero.startsWith('9') &&
    numero.length === 9
  ) {
    return `593${numero}`
  }

  return ''
}

function crearMensajeWhatsAppDetalle({
  nombre,
  codigo,
  plan,
  fechaInicio,
  fechaRenovacion,
}) {
  return `¡BIENVENIDO/A A *MAK FITNESS*! 

¡Hola, *${nombre}*!

Nos alegra mucho darte la bienvenida a *MAK FITNESS* y agradecemos la confianza que has depositado en nosotros.

A partir de hoy formas parte de nuestra comunidad, donde trabajamos juntos con disciplina, compromiso y constancia para alcanzar nuestros objetivos.

*DATOS DE TU MEMBRESÍA*

Código único de asistencia: *${codigo}*
Tipo de membresía: *${plan}*
Vigencia: *${formatearFechaDetalle(fechaInicio)}* al *${formatearFechaDetalle(fechaRenovacion)}*

*IMPORTANTE:* Cada vez que vengas a entrenar, es obligatorio proporcionar tu *Código Único* de asistencia al coach encargado, quien registrará tu asistencia correspondiente.

*REGLAS PRINCIPALES DE MAK FITNESS*

*1. Uso obligatorio de toalla personal*
Utiliza siempre tu toalla durante el entrenamiento para mantener los equipos limpios e higiénicos.

*2. Respeto hacia los demás miembros*
Mantengamos un ambiente agradable y de respeto para todos. Cuidemos nuestras palabras, acciones y el espacio compartido.

*3. Entrenamiento responsable*
Entrena de manera segura y responsable. Respeta tus límites, utiliza correctamente los equipos y sigue las indicaciones de nuestros entrenadores.

*4. Deja el peso en su lugar*
Después de utilizar discos, mancuernas y demás accesorios, recuerda devolverlos a su lugar correspondiente. ¡El orden es responsabilidad de todos!

*¡AHORA ES TU MOMENTO!*

La disciplina y la constancia son la clave para lograr resultados. Cada entrenamiento cuenta, cada esfuerzo suma y cada día es una nueva oportunidad para ser mejor.

¡Entrena con actitud, compromiso y disciplina!

Sigue nuestra cuenta oficial de Instagram @makfitness0 y enterate de todas nuestras novedades!

*MAK FITNESS*
“Entrenamiento real, para resultados reales”

¡Nos vemos en el entrenamiento!`
}

function abrirWhatsAppDetalle(telefono, mensaje) {
  const numero = normalizarTelefonoWhatsAppDetalle(telefono)

  if (!numero) {
    window.alert('El socio no tiene un número de WhatsApp válido.')
    return
  }

  // Usamos encodeURIComponent asegurando la codificación UTF-8 completa
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`

  window.open(url, '_blank', 'noopener,noreferrer')
}

function validarDetallePago(
  formulario
) {
  if (
    formulario.metodo_pago ===
    'transferencia'
  ) {
    if (
      !formulario.numero_comprobante.trim()
    ) {
      return 'Para transferencia debes ingresar el número de comprobante.'
    }

    if (
      !formulario.banco_origen.trim()
    ) {
      return 'Para transferencia debes ingresar el banco de origen.'
    }
  }

  if (
    formulario.metodo_pago ===
    'tarjeta'
  ) {
    if (
      !formulario.numero_comprobante.trim()
    ) {
      return 'Para pago con tarjeta debes ingresar el número de comprobante.'
    }

    if (!formulario.tipo_tarjeta) {
      return 'Para pago con tarjeta debes seleccionar el tipo de tarjeta.'
    }
  }

  return ''
}

async function comprimirFotoMiembro(
  archivo
) {
  const maxAncho = 900
  const maxAlto = 900
  const pesoMaximoBytes =
    900 * 1024
  const calidadInicial = 0.85
  const calidadMinima = 0.45

  return new Promise(
    (resolve, reject) => {
      const imagen =
        new Image()

      const urlTemporal =
        URL.createObjectURL(
          archivo
        )

      imagen.onload =
        async () => {
          URL.revokeObjectURL(
            urlTemporal
          )

          let ancho =
            imagen.width

          let alto =
            imagen.height

          if (
            ancho > alto &&
            ancho > maxAncho
          ) {
            alto = Math.round(
              (alto * maxAncho) /
                ancho
            )

            ancho = maxAncho
          } else if (
            alto > maxAlto
          ) {
            ancho = Math.round(
              (ancho * maxAlto) /
                alto
            )

            alto = maxAlto
          }

          const canvas =
            document.createElement(
              'canvas'
            )

          canvas.width = ancho
          canvas.height = alto

          const contexto =
            canvas.getContext('2d')

          if (!contexto) {
            reject(
              new Error(
                'No se pudo preparar la compresión de la foto.'
              )
            )
            return
          }

          contexto.drawImage(
            imagen,
            0,
            0,
            ancho,
            alto
          )

          async function convertirConCalidad(
            calidad
          ) {
            return new Promise(
              (
                resolverBlob
              ) => {
                canvas.toBlob(
                  (blob) =>
                    resolverBlob(
                      blob
                    ),
                  'image/jpeg',
                  calidad
                )
              }
            )
          }

          let calidad =
            calidadInicial

          let blob =
            await convertirConCalidad(
              calidad
            )

          while (
            blob &&
            blob.size >
              pesoMaximoBytes &&
            calidad >
              calidadMinima
          ) {
            calidad = Number(
              (
                calidad - 0.1
              ).toFixed(2)
            )

            blob =
              await convertirConCalidad(
                calidad
              )
          }

          if (!blob) {
            reject(
              new Error(
                'No se pudo comprimir la foto.'
              )
            )
            return
          }

          const nombreBase =
            archivo.name
              ? archivo.name.replace(
                  /\.[^/.]+$/,
                  ''
                )
              : 'foto-miembro'

          resolve(
            new File(
              [blob],
              `${nombreBase}.jpg`,
              {
                type: 'image/jpeg',
                lastModified:
                  Date.now(),
              }
            )
          )
        }

      imagen.onerror = () => {
        URL.revokeObjectURL(
          urlTemporal
        )

        reject(
          new Error(
            'No se pudo procesar la imagen seleccionada.'
          )
        )
      }

      imagen.src = urlTemporal
    }
  )
}

export default function MiembrosPage() {
  const perfil = usePerfil()

  return (
    <MiembrosContenido
      key={perfil?.rol || 'sin-rol'}
      perfil={perfil}
    />
  )
}

function MiembrosContenido({ perfil }) {
  const esEmpleado = perfil?.rol === 'empleado'

  // MAK_COMUNICADOS_WHATSAPP_V1
  const puedeAdministrarComunicado =
    ['dueno', 'administrador'].includes(
      perfil?.rol
    )
  const esAdminPagos = ['dueno', 'administrador'].includes(perfil?.rol)

  // MAK_ACCESO_SOCIOS_ADMIN_V1
  const puedeGestionarAccesoSocios =
    perfil?.rol === 'dueno'

  // MAK_PERMISOS_EMPLEADOS_ESTABLE_V3
  const [
    miembros,
    setMiembros,
  ] = useState([])

  const [
    planes,
    setPlanes,
  ] = useState([])

  const [
    formulario,
    setFormulario,
  ] = useState(
    formularioInicial
  )

  const [
    formMembresia,
    setFormMembresia,
  ] = useState(
    crearMembresiaInicial()
  )

  const [
    archivoFoto,
    setArchivoFoto,
  ] = useState(null)

  const [
    previewFoto,
    setPreviewFoto,
  ] = useState('')

  const [
    busqueda,
    setBusqueda,
  ] = useState('')

  const [
    paginaActual,
    setPaginaActual,
  ] = useState(1)

  const [
    editandoId,
    setEditandoId,
  ] = useState(null)

  const [
    nuevoMiembroPendienteId,
    setNuevoMiembroPendienteId,
  ] = useState(null)

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false)

  const [
    cargando,
    setCargando,
  ] = useState(true)

  const [
    guardando,
    setGuardando,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    mensaje,
    setMensaje,
  ] = useState('')

  const [
    detalleMiembro,
    setDetalleMiembro,
  ] = useState(null)

  const [
    detalleMembresia,
    setDetalleMembresia,
  ] = useState(null)

  const [
    cargandoDetalle,
    setCargandoDetalle,
  ] = useState(false)

  const [
    errorDetalle,
    setErrorDetalle,
  ] = useState('')

  const [
    accesoSocios,
    setAccesoSocios,
  ] = useState(null)

  const [
    cargandoAccesoSocios,
    setCargandoAccesoSocios,
  ] = useState(false)

  const [
    errorAccesoSocios,
    setErrorAccesoSocios,
  ] = useState('')

  const [
    mostrarComunicado,
    setMostrarComunicado,
  ] = useState(false)

  const [
    formComunicado,
    setFormComunicado,
  ] = useState({
    titulo: '',
    mensaje: '',
  })

  const [
    cargandoComunicado,
    setCargandoComunicado,
  ] = useState(false)

  const [
    guardandoComunicado,
    setGuardandoComunicado,
  ] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    setPaginaActual(1)
  }, [busqueda])

  async function cargarDatos() {
    setCargando(true)
    setError('')

    const [
      respuestaMiembros,
      respuestaPlanes,
    ] = await Promise.all([
      supabase
        .from('miembros')
        .select('*')
        .order(
          'created_at',
          {
            ascending: false,
          }
        ),

      supabase
        .from('planes')
        .select(`
          id,
          nombre,
          precio,
          duracion_dias,
          duracion_meses,
          activo,
          es_upgrade,
          codigo,
          cobra_inscripcion,
          es_promocion,
          modalidad_vigencia,
          vigencia_desde,
          vigencia_hasta
        `)
        .eq('activo', true)
        .order(
          'nombre',
          {
            ascending: true,
          }
        ),
    ])

    if (
      respuestaMiembros.error
    ) {
      setError(
        respuestaMiembros
          .error.message
      )

      setMiembros([])
    } else {
      setMiembros(
        respuestaMiembros.data ||
          []
      )
    }

    if (
      respuestaPlanes.error
    ) {
      setError(
        (actual) =>
          actual
            ? `${actual} · ${respuestaPlanes.error.message}`
            : respuestaPlanes
                .error.message
      )

      setPlanes([])
    } else {
      setPlanes(
        respuestaPlanes.data ||
          []
      )
    }

    setCargando(false)
  }

  function actualizarCampo(
    campo,
    valor
  ) {
    setFormulario(
      (actual) => ({
        ...actual,
        [campo]: valor,
      })
    )
  }

  function actualizarMembresia(
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

  function limpiarFormulario() {
    setFormulario(
      formularioInicial
    )

    setFormMembresia(
      crearMembresiaInicial()
    )

    setArchivoFoto(null)
    setPreviewFoto('')
    setEditandoId(null)

    setNuevoMiembroPendienteId(
      null
    )

    setMostrarFormulario(
      false
    )

    setError('')
  }

  function abrirNuevoMiembro() {
    setFormulario(
      formularioInicial
    )

    setFormMembresia(
      crearMembresiaInicial()
    )

    setArchivoFoto(null)
    setPreviewFoto('')
    setEditandoId(null)

    setNuevoMiembroPendienteId(
      null
    )

    setMostrarFormulario(
      true
    )

    setError('')
    setMensaje('')
  }

  function editarMiembro(
    miembro
  ) {
    setFormulario({
      codigo_acceso:
        miembro.codigo_acceso ||
        '',

      nombre:
        miembro.nombre || '',

      apellido:
        miembro.apellido || '',

      cedula:
        miembro.cedula || '',

      email:
        miembro.email || '',

      telefono:
        miembro.telefono || '',

      fecha_nacimiento:
        miembro.fecha_nacimiento ||
        '',

      direccion:
        miembro.direccion || '',

      contacto_emergencia:
        miembro.contacto_emergencia ||
        '',

      telefono_emergencia:
        miembro.telefono_emergencia ||
        '',

      estado:
        miembro.estado ||
        'activo',

      notas:
        miembro.notas || '',

      foto_url:
        miembro.foto_url || '',

      foto_path:
        miembro.foto_path || '',
    })

    setFormMembresia(
      crearMembresiaInicial()
    )

    setArchivoFoto(null)

    setPreviewFoto(
      miembro.foto_url || ''
    )

    setEditandoId(
      miembro.id
    )

    setNuevoMiembroPendienteId(
      null
    )

    setMostrarFormulario(
      true
    )

    setError('')
    setMensaje('')

    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    }, 100)
  }

  async function seleccionarFoto(
    evento
  ) {
    const archivo =
      evento.target.files?.[0]

    if (!archivo) return

    if (
      !archivo.type.startsWith(
        'image/'
      )
    ) {
      setError(
        'El archivo debe ser una imagen.'
      )
      return
    }

    if (
      archivo.size >
      12 * 1024 * 1024
    ) {
      setError(
        'La foto original no debe superar los 12 MB.'
      )
      return
    }

    try {
      setError('')

      setMensaje(
        'Comprimiendo foto...'
      )

      const fotoComprimida =
        await comprimirFotoMiembro(
          archivo
        )

      if (
        fotoComprimida.size >
        1024 * 1024
      ) {
        setError(
          'La foto no pudo comprimirse por debajo de 1 MB. Intenta tomarla nuevamente con mejor iluminación.'
        )

        setMensaje('')
        return
      }

      setArchivoFoto(
        fotoComprimida
      )

      setPreviewFoto(
        URL.createObjectURL(
          fotoComprimida
        )
      )

      setMensaje(
        `Foto lista para guardar. Peso final: ${(
          fotoComprimida.size /
          1024
        ).toFixed(0)} KB.`
      )
    } catch (error) {
      setError(
        error.message
      )

      setMensaje('')
    }
  }

  async function subirFoto() {
    if (!archivoFoto) {
      return {
        foto_url:
          formulario.foto_url ||
          null,

        foto_path:
          formulario.foto_path ||
          null,
      }
    }

    if (
      archivoFoto.size >
      1024 * 1024
    ) {
      throw new Error(
        'La foto supera 1 MB. Selecciona o toma otra foto.'
      )
    }

    const nombreArchivo =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.jpg`

    const rutaArchivo =
      `miembros/${nombreArchivo}`

    const {
      error,
    } = await supabase.storage
      .from(
        'miembros-fotos'
      )
      .upload(
        rutaArchivo,
        archivoFoto,
        {
          cacheControl:
            '3600',

          upsert: false,

          contentType:
            'image/jpeg',
        }
      )

    if (error) {
      throw new Error(
        error.message
      )
    }

    const {
      data,
    } = supabase.storage
      .from(
        'miembros-fotos'
      )
      .getPublicUrl(
        rutaArchivo
      )

    return {
      foto_url:
        data.publicUrl,

      foto_path:
        rutaArchivo,
    }
  }

  async function registrarMembresiaInicial(
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

  async function guardarMiembro(
    evento
  ) {
    evento.preventDefault()

    setGuardando(true)
    setError('')
    setMensaje('')

    const datosBase = {
      nombre:
        formulario.nombre.trim(),

      apellido:
        formulario.apellido.trim(),

      cedula:
        formulario.cedula.trim() ||
        null,

      email:
        formulario.email.trim() ||
        null,

      telefono:
        formulario.telefono.trim() ||
        null,

      fecha_nacimiento:
        formulario.fecha_nacimiento ||
        null,

      direccion:
        formulario.direccion.trim() ||
        null,

      contacto_emergencia:
        formulario.contacto_emergencia.trim() ||
        null,

      telefono_emergencia:
        formulario.telefono_emergencia.trim() ||
        null,

      estado:
        formulario.estado,

      notas:
        formulario.notas.trim() ||
        null,
    }

    if (
      !datosBase.nombre ||
      !datosBase.apellido
    ) {
      setError(
        'El nombre y apellido son obligatorios.'
      )

      setGuardando(false)
      return
    }

    if (
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

    try {
      // =========================
      // EDITAR SOCIO EXISTENTE
      // =========================

      if (editandoId) {
        const datosFoto =
          await subirFoto()

        const {
          error,
        } = await supabase
          .from('miembros')
          .update({
            ...datosBase,

            foto_url:
              datosFoto.foto_url,

            foto_path:
              datosFoto.foto_path,
          })
          .eq(
            'id',
            editandoId
          )

        if (error) {
          throw new Error(
            error.message
          )
        }

        await cargarDatos()

        limpiarFormulario()

        setMensaje(
          'Miembro actualizado correctamente.'
        )

        setGuardando(false)
        return
      }

      // =========================
      // CREAR NUEVO SOCIO
      // =========================

      let miembroId =
        nuevoMiembroPendienteId

      let codigoGenerado =
        formulario.codigo_acceso ||
        ''

      if (!miembroId) {
        const datosFoto =
          await subirFoto()

        const {
          data:
            nuevoMiembro,

          error:
            errorMiembro,
        } = await supabase
          .from('miembros')
          .insert({
            ...datosBase,

            foto_url:
              datosFoto.foto_url,

            foto_path:
              datosFoto.foto_path,
          })
          .select(
            'id, codigo_acceso'
          )
          .single()

        if (errorMiembro) {
          throw new Error(
            errorMiembro.message
          )
        }

        miembroId =
          nuevoMiembro.id

        codigoGenerado =
          nuevoMiembro.codigo_acceso ||
          ''

        setNuevoMiembroPendienteId(
          miembroId
        )

        setFormulario(
          (actual) => ({
            ...actual,

            codigo_acceso:
              codigoGenerado,
          })
        )
      }

      // =========================
      // ASIGNAR MEMBRESÍA
      // =========================

      try {
        await registrarMembresiaInicial(
          miembroId
        )
      } catch (
        errorMembresia
      ) {
        await cargarDatos()

        setError(
          `El socio fue creado, pero no se pudo asignar la membresía. Corrige los datos de pago y vuelve a guardar. Detalle: ${errorMembresia.message}`
        )

        setMensaje(
          codigoGenerado
            ? `Socio guardado con código ${codigoGenerado}. Falta completar la membresía.`
            : 'Socio guardado. Falta completar la membresía.'
        )

        setGuardando(false)
        return
      }

      // MAK_AUTO_ACCESO_V1: habilitar la app solo tras registrar la membresia.
      let errorAccesoMak = ''
      try {
        const { data: datosSesion, error: errorSesion } =
          await supabase.auth.getSession()
        const tokenMak = datosSesion?.session?.access_token
        if (errorSesion || !tokenMak) {
          throw new Error('Sesion administrativa no disponible.')
        }
        const respMak = await fetch('/api/admin/provisionar-socio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenMak}`
          },
          body: JSON.stringify({ miembro_id: miembroId })
        })
        const accesoMak = await respMak.json().catch(() => ({}))
        if (!respMak.ok || !accesoMak.ok) {
          throw new Error(accesoMak.error || 'Error al habilitar MAK Clientes.')
        }
      } catch (errorAcceso) {
        errorAccesoMak = errorAcceso?.message || 'Error desconocido.'
        console.error('MAK CLIENTES NUEVO SOCIO:', errorAccesoMak)
      }

      await cargarDatos()
      limpiarFormulario()
      setMensaje(errorAccesoMak
        ? 'Socio y membresia registrados. Acceso MAK Clientes pendiente.'
        : 'Miembro creado exitosamente. Acceso MAK Clientes habilitado.'
      )
      if (errorAccesoMak) {
        setError(`La membresia esta guardada. Falta habilitar MAK Clientes: ${errorAccesoMak}`)
      }

      setGuardando(false)
    } catch (error) {
      setError(
        error.message
      )

      setGuardando(false)
    }
  }

  async function cambiarEstadoMiembro(
    miembro
  ) {
    const nuevoEstado =
      miembro.estado ===
      'activo'
        ? 'inactivo'
        : 'activo'

    const confirmar =
      window.confirm(
        `¿Seguro que deseas cambiar el estado de ${miembro.nombre} ${miembro.apellido} a "${nuevoEstado}"?`
      )

    if (!confirmar) return

    setError('')
    setMensaje('')

    const {
      error,
    } = await supabase
      .from('miembros')
      .update({
        estado:
          nuevoEstado,
      })
      .eq(
        'id',
        miembro.id
      )

    if (error) {
      setError(
        error.message
      )
      return
    }

    await cargarDatos()

    setMensaje(
      nuevoEstado ===
        'activo'
        ? 'Miembro activado correctamente.'
        : 'Miembro inactivado correctamente.'
    )
  }

  async function abrirFormularioComunicado() {
    if (!puedeAdministrarComunicado) {
      window.alert(
        'No tienes permisos para administrar comunicados.'
      )
      return
    }

    setCargandoComunicado(true)
    setError('')
    setMensaje('')

    try {
      const {
        data,
        error: errorComunicado,
      } = await supabase.rpc(
        'obtener_comunicado_actual'
      )

      if (errorComunicado) {
        throw new Error(
          errorComunicado.message
        )
      }

      const comunicado =
        Array.isArray(data)
          ? data[0]
          : data

      setFormComunicado({
        titulo:
          comunicado?.titulo ||
          '',

        mensaje:
          comunicado?.mensaje ||
          '',
      })

      setMostrarComunicado(true)

    } catch (errorComunicado) {

      setError(
        errorComunicado.message
      )

    } finally {

      setCargandoComunicado(false)
    }
  }

  function cerrarFormularioComunicado() {
    setMostrarComunicado(false)

    setFormComunicado({
      titulo: '',
      mensaje: '',
    })
  }

  async function guardarComunicado(
    evento
  ) {
    evento.preventDefault()

    if (!puedeAdministrarComunicado) {
      return
    }

    const titulo =
      formComunicado.titulo.trim()

    const cuerpo =
      formComunicado.mensaje.trim()

    if (!titulo) {
      setError(
        'El título del comunicado es obligatorio.'
      )
      return
    }

    if (!cuerpo) {
      setError(
        'El cuerpo del comunicado es obligatorio.'
      )
      return
    }

    setGuardandoComunicado(true)
    setError('')
    setMensaje('')

    try {
      const {
        error: errorGuardar,
      } = await supabase.rpc(
        'guardar_comunicado_actual',
        {
          p_titulo:
            titulo,

          p_mensaje:
            cuerpo,
        }
      )

      if (errorGuardar) {
        throw new Error(
          errorGuardar.message
        )
      }

      cerrarFormularioComunicado()

      setMensaje(
        'Comunicado guardado y habilitado para envío.'
      )

    } catch (errorGuardar) {

      setError(
        errorGuardar.message
      )

    } finally {

      setGuardandoComunicado(false)
    }
  }

  async function desactivarComunicado() {
    if (!puedeAdministrarComunicado) {
      return
    }

    const confirmar =
      window.confirm(
        '¿Deseas desactivar el comunicado actual? El botón de envío dejará de tener un mensaje disponible.'
      )

    if (!confirmar) {
      return
    }

    setGuardandoComunicado(true)
    setError('')
    setMensaje('')

    try {
      const {
        error: errorDesactivar,
      } = await supabase.rpc(
        'desactivar_comunicado_actual'
      )

      if (errorDesactivar) {
        throw new Error(
          errorDesactivar.message
        )
      }

      cerrarFormularioComunicado()

      setMensaje(
        'Comunicado desactivado correctamente.'
      )

    } catch (errorDesactivar) {

      setError(
        errorDesactivar.message
      )

    } finally {

      setGuardandoComunicado(false)
    }
  }

  async function enviarComunicadoWhatsApp() {
    if (!detalleMiembro) {
      return
    }

    const telefono =
      normalizarTelefonoWhatsAppDetalle(
        detalleMiembro.telefono
      )

    if (!telefono) {
      window.alert(
        'El socio no tiene un número de WhatsApp válido.'
      )
      return
    }

    try {
      const {
        data,
        error: errorComunicado,
      } = await supabase.rpc(
        'obtener_comunicado_actual'
      )

      if (errorComunicado) {
        throw new Error(
          errorComunicado.message
        )
      }

      const comunicado =
        Array.isArray(data)
          ? data[0]
          : data

      if (
        !comunicado?.titulo ||
        !comunicado?.mensaje
      ) {
        window.alert(
          'No existe un comunicado activo. Crea o habilita un comunicado antes de enviarlo.'
        )
        return
      }

      const mensajeComunicado =
        `*${comunicado.titulo.trim()}*\n\n` +
        `${comunicado.mensaje.trim()}\n\n` +
        'No te olvides de seguir nuestra página oficial en Instagram @makfitness0'

      abrirWhatsAppDetalle(
        detalleMiembro.telefono,
        mensajeComunicado
      )

    } catch (errorComunicado) {

      window.alert(
        errorComunicado.message
      )
    }
  }

  async function cargarAccesoSocios(miembroId) {
    setCargandoAccesoSocios(true)
    setErrorAccesoSocios('')
    setAccesoSocios(null)

    try {
      const {
        data: sesionData,
      } =
        await supabase.auth.getSession()

      const token =
        sesionData?.session?.access_token ||
        ''

      if (!token) {
        throw new Error(
          'Sesión administrativa no válida.'
        )
      }

      const respuesta =
        await fetch(
          `/api/admin/socios-app?miembro_id=${encodeURIComponent(
            miembroId
          )}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        )

      const data =
        await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(
          data.error ||
            'No se pudo consultar el acceso MAK Socios.'
        )
      }

      setAccesoSocios(data)

    } catch (errorConsulta) {
      setAccesoSocios(null)

      setErrorAccesoSocios(
        errorConsulta?.message ||
          'No se pudo consultar el acceso MAK Socios.'
      )

    } finally {
      setCargandoAccesoSocios(false)
    }
  }


  async function abrirDetalleMiembro(miembro) {
    setDetalleMiembro(miembro)
    setDetalleMembresia(null)
    setErrorDetalle('')
    setCargandoDetalle(true)

    setAccesoSocios(null)
    setErrorAccesoSocios('')

    if (puedeGestionarAccesoSocios) {
      void cargarAccesoSocios(
        miembro.id
      )
    }

    const { data, error } = await supabase
      .from('membresias')
      .select(`
        id,
        fecha_inicio,
        fecha_fin,
        estado,
        plan_nombre_snapshot,
        plan_precio_snapshot,
        plan_modalidad_vigencia_snapshot,
        plan_vigencia_desde_snapshot,
        plan_vigencia_hasta_snapshot,
        created_at
      `)
      .eq('miembro_id', miembro.id)
      .order('fecha_inicio', {
        ascending: false,
      })
      .order('created_at', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

    if (error) {
      setErrorDetalle(error.message)
      setCargandoDetalle(false)
      return
    }

    if (!data) {
      setErrorDetalle(
        'Este socio no tiene una membresia registrada.'
      )
      setCargandoDetalle(false)
      return
    }

    setDetalleMembresia(data)
    setCargandoDetalle(false)
  }

  function cerrarDetalleMiembro() {
    setDetalleMiembro(null)
    setDetalleMembresia(null)
    setErrorDetalle('')
    setCargandoDetalle(false)

    setAccesoSocios(null)
    setCargandoAccesoSocios(false)
    setErrorAccesoSocios('')
  }

  // MAK_DETALLE_PROMO_FECHA_FIJA_V1
  function esPromoFechaFijaDetalle(
    membresia
  ) {
    return (
      membresia
        ?.plan_modalidad_vigencia_snapshot ===
      'fecha_fija'
    )
  }

  function enviarDetallePorWhatsApp() {
    if (!detalleMiembro || !detalleMembresia) {
      return
    }

    const fechaRenovacion =
      esPromoFechaFijaDetalle(
        detalleMembresia
      )
        ? detalleMembresia.fecha_fin
        : sumarDiasDetalle(
            detalleMembresia.fecha_fin,
            1
          )

    const mensajeWhatsApp =
      crearMensajeWhatsAppDetalle({
        nombre:
          detalleMiembro.nombre || 'Socio',
        codigo:
          detalleMiembro.codigo_acceso || '-',
        plan:
          detalleMembresia.plan_nombre_snapshot ||
          'Membresia MAK FITNESS',
        fechaInicio:
          detalleMembresia.fecha_inicio,
        fechaRenovacion,
      })

    abrirWhatsAppDetalle(
      detalleMiembro.telefono,
      mensajeWhatsApp
    )
  }

  // MAK_PROMOS_FECHA_FIJA_MIEMBROS_V1
  function obtenerFechaHoyGuayaquilMiembros() {
    const partes =
      new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone:
            'America/Guayaquil',

          year:
            'numeric',

          month:
            '2-digit',

          day:
            '2-digit',
        }
      ).formatToParts(
        new Date()
      )

    const valores =
      Object.fromEntries(
        partes.map(
          (parte) => [
            parte.type,
            parte.value,
          ]
        )
      )

    return `${valores.year}-${valores.month}-${valores.day}`
  }

  function esPlanFechaFijaMiembros(
    plan
  ) {
    return (
      Boolean(
        plan?.es_promocion
      ) &&
      plan?.modalidad_vigencia ===
        'fecha_fija'
    )
  }

  function planDisponibleParaVentaMiembros(
    plan
  ) {
    if (!plan?.activo) {
      return false
    }

    if (
      !esPlanFechaFijaMiembros(
        plan
      )
    ) {
      return true
    }

    if (
      !plan.vigencia_desde ||
      !plan.vigencia_hasta
    ) {
      return false
    }

    const hoy =
      obtenerFechaHoyGuayaquilMiembros()

    return (
      hoy >=
        plan.vigencia_desde &&
      hoy <=
        plan.vigencia_hasta
    )
  }

  function formatearFechaPlanMiembros(
    fecha
  ) {
    if (!fecha) {
      return '-'
    }

    const partes =
      String(fecha)
        .slice(0, 10)
        .split('-')

    if (partes.length !== 3) {
      return fecha
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }

  const planesDisponibles =
    useMemo(() => {
      return planes.filter(
        (plan) => {
          return (
            plan.activo &&
            !plan.es_upgrade &&
            plan.codigo !==
              'MENSUAL_FIDELIZACION' &&
            planDisponibleParaVentaMiembros(
              plan
            )
          )
        }
      )
    }, [planes])

  const planSeleccionado =
    useMemo(() => {
      return (
        planesDisponibles.find(
          (plan) =>
            plan.id ===
            formMembresia.plan_id
        ) || null
      )
    }, [
      planesDisponibles,
      formMembresia.plan_id,
    ])

  const miembrosFiltrados =
    useMemo(() => {
      const texto = busqueda.toLowerCase().trim()

      if (esEmpleado) {
        if (texto.length < 2) return []

        return miembros
          .filter((miembro) => {
            if (miembro.estado !== 'activo') return false

            const valores = [
              miembro.nombre,
              miembro.apellido,
              miembro.cedula,
              miembro.telefono,
            ]

            return valores.some((valor) =>
              String(valor || '').toLowerCase().includes(texto)
            )
          })
          .slice(0, 20)
      }

      if (!texto) return miembros

      return miembros.filter((miembro) => {
        const valores = [
          miembro.codigo_acceso,
          miembro.nombre,
          miembro.apellido,
          miembro.cedula,
          miembro.email,
          miembro.telefono,
          miembro.estado,
        ]

        return valores.some((valor) =>
          String(valor || '').toLowerCase().includes(texto)
        )
      })
    }, [miembros, busqueda, esEmpleado])

  const totalPaginas =
    Math.max(
      1,
      Math.ceil(
        miembrosFiltrados.length /
          RESULTADOS_POR_PAGINA
      )
    )

  useEffect(() => {
    if (
      paginaActual >
      totalPaginas
    ) {
      setPaginaActual(
        totalPaginas
      )
    }
  }, [
    paginaActual,
    totalPaginas,
  ])

  const miembrosPaginados =
    useMemo(() => {
      const inicio =
        (paginaActual - 1) *
        RESULTADOS_POR_PAGINA

      const fin =
        inicio +
        RESULTADOS_POR_PAGINA

      return miembrosFiltrados.slice(
        inicio,
        fin
      )
    }, [
      miembrosFiltrados,
      paginaActual,
    ])

  const primerResultado =
    miembrosFiltrados.length ===
    0
      ? 0
      : (paginaActual - 1) *
          RESULTADOS_POR_PAGINA +
        1

  const ultimoResultado =
    Math.min(
      paginaActual *
        RESULTADOS_POR_PAGINA,

      miembrosFiltrados.length
    )

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Miembros
          </h1>

          <p className="mt-2 text-sm text-gray-600 md:text-base">
            Registra al socio, toma su foto y asigna su primera membresía en un solo proceso.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">

          {puedeAdministrarComunicado && (
            <button
              type="button"
              onClick={
                abrirFormularioComunicado
              }
              disabled={
                cargandoComunicado
              }
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargandoComunicado
                ? 'Cargando...'
                : 'Crear comunicado'}
            </button>
          )}

          <button
            onClick={
              abrirNuevoMiembro
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <Plus size={18} />

            Nuevo miembro
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

      {mostrarComunicado &&
        puedeAdministrarComunicado && (

        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={
            cerrarFormularioComunicado
          }
        >

          <div
            className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="flex items-start justify-between gap-4">

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Crear comunicado
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Este será el único comunicado activo para enviar a los socios.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  cerrarFormularioComunicado
                }
                className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100"
              >
                <X size={20} />
              </button>

            </div>

            <form
              onSubmit={
                guardarComunicado
              }
              className="mt-5 space-y-4"
            >

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Título del comunicado
                </label>

                <input
                  type="text"
                  value={
                    formComunicado.titulo
                  }
                  onChange={(e) =>
                    setFormComunicado(
                      (actual) => ({
                        ...actual,
                        titulo:
                          e.target.value,
                      })
                    )
                  }
                  maxLength={150}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Ej: Horario especial por feriado"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Cuerpo del mensaje
                </label>

                <textarea
                  value={
                    formComunicado.mensaje
                  }
                  onChange={(e) =>
                    setFormComunicado(
                      (actual) => ({
                        ...actual,
                        mensaje:
                          e.target.value,
                      })
                    )
                  }
                  rows={8}
                  className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Escribe aquí la información que recibirán todos los socios..."
                />
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Pie automático
                </p>

                <p className="mt-2 text-sm text-gray-700">
                  No te olvides de seguir nuestra página oficial en Instagram @makfitness0
                </p>

              </div>

              {(formComunicado.titulo ||
                formComunicado.mensaje) && (

                <div className="rounded-xl border border-green-200 bg-green-50 p-4">

                  <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                    Vista previa
                  </p>

                  <div className="mt-3 whitespace-pre-wrap text-sm text-gray-800">

                    {formComunicado.titulo && (
                      <p className="font-bold">
                        {formComunicado.titulo}
                      </p>
                    )}

                    {formComunicado.mensaje && (
                      <p className="mt-3">
                        {formComunicado.mensaje}
                      </p>
                    )}

                    <p className="mt-3">
                      No te olvides de seguir nuestra página oficial en Instagram @makfitness0
                    </p>

                  </div>

                </div>

              )}

              <div className="flex flex-col gap-2 sm:flex-row">

                <button
                  type="submit"
                  disabled={
                    guardandoComunicado
                  }
                  className="flex-1 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardandoComunicado
                    ? 'Guardando...'
                    : 'Guardar y habilitar'}
                </button>

                <button
                  type="button"
                  onClick={
                    desactivarComunicado
                  }
                  disabled={
                    guardandoComunicado
                  }
                  className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Desactivar
                </button>

                <button
                  type="button"
                  onClick={
                    cerrarFormularioComunicado
                  }
                  disabled={
                    guardandoComunicado
                  }
                  className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {detalleMiembro && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={cerrarDetalleMiembro}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Detalle de membresía
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {detalleMiembro.nombre}{' '}
                  {detalleMiembro.apellido}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarDetalleMiembro}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-500 hover:bg-gray-100"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm">
              <div className="flex justify-between gap-4 py-1.5">
                <span className="text-gray-500">Código</span>
                <span className="font-semibold text-gray-900">
                  {detalleMiembro.codigo_acceso || '-'}
                </span>
              </div>

              <div className="flex justify-between gap-4 py-1.5">
                <span className="text-gray-500">WhatsApp</span>
                <span className="text-right font-semibold text-gray-900">
                  {detalleMiembro.telefono || 'Sin número'}
                </span>
              </div>
            </div>

            {puedeGestionarAccesoSocios && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Acceso MAK Socios
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      Cuenta para la aplicación de socios.
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      cargandoAccesoSocios
                        ? 'bg-gray-100 text-gray-600'
                        : errorAccesoSocios
                          ? 'bg-red-50 text-red-700'
                          : accesoSocios?.tiene_cuenta
                            ? accesoSocios?.cuenta?.activo
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {cargandoAccesoSocios
                      ? 'Consultando...'
                      : errorAccesoSocios
                        ? 'No disponible'
                        : accesoSocios?.tiene_cuenta
                          ? accesoSocios?.cuenta?.activo
                            ? 'Acceso activo'
                            : 'Cuenta inactiva'
                          : 'Sin acceso'}
                  </span>

                </div>

                {errorAccesoSocios && (
                  <p className="mt-3 text-xs text-red-600">
                    {errorAccesoSocios}
                  </p>
                )}
              </div>
            )}

            {cargandoDetalle ? (
              <div className="py-8 text-center text-sm text-gray-500">
                Cargando membresía...
              </div>
            ) : errorDetalle ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {errorDetalle}
              </div>
            ) : detalleMembresia ? (
              <div className="mt-4 space-y-3 rounded-xl border border-gray-200 p-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Plan
                  </p>
                  <p className="mt-1 font-bold text-gray-900">
                    {detalleMembresia.plan_nombre_snapshot || 'Membresía'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Inicio</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {formatearFechaDetalle(
                        detalleMembresia.fecha_inicio
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      {esPromoFechaFijaDetalle(
                        detalleMembresia
                      )
                        ? 'Fin de vigencia'
                        : 'Próxima renovación'}
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">

                      {formatearFechaDetalle(
                        esPromoFechaFijaDetalle(
                          detalleMembresia
                        )
                          ? detalleMembresia.fecha_fin
                          : sumarDiasDetalle(
                              detalleMembresia.fecha_fin,
                              1
                            )
                      )}

                    </p>
                  </div>
                </div>

                <div className="flex justify-between gap-4 border-t border-gray-100 pt-3">
                  <span className="text-gray-500">Estado</span>
                  <span className="font-semibold capitalize text-gray-900">
                    {detalleMembresia.estado || '-'}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">

              <button
                type="button"
                onClick={
                  enviarDetallePorWhatsApp
                }
                disabled={
                  cargandoDetalle ||
                  !detalleMembresia ||
                  !normalizarTelefonoWhatsAppDetalle(
                    detalleMiembro.telefono
                  )
                }
                className="rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Enviar detalles por WhatsApp
              </button>

              <EnviarAccesoMakButton
                miembroId={detalleMiembro.id}
                nombre={[
                  detalleMiembro.nombre,
                  detalleMiembro.apellido
                ].filter(Boolean).join(' ')}
                codigo={detalleMiembro.codigo_acceso}
                telefono={detalleMiembro.telefono}
                disabled={
                  !detalleMiembro.codigo_acceso ||
                  !normalizarTelefonoWhatsAppDetalle(
                    detalleMiembro.telefono
                  )
                }
                onEnviar={(mensaje) =>
                  abrirWhatsAppDetalle(
                    detalleMiembro.telefono,
                    mensaje
                  )
                }
              />

              <button
                type="button"
                onClick={
                  enviarComunicadoWhatsApp
                }
                disabled={
                  cargandoDetalle ||
                  !normalizarTelefonoWhatsAppDetalle(
                    detalleMiembro.telefono
                  )
                }
                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Enviar comunicado
              </button>

              <button
                type="button"
                onClick={
                  cerrarDetalleMiembro
                }
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:col-span-2"
              >
                Cerrar
              </button>

            </div>
          </div>
        </div>
      )}

      {mostrarFormulario && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editandoId
                  ? 'Editar miembro'
                  : 'Registrar nuevo miembro'}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {editandoId
                  ? 'Actualiza los datos personales y la foto del socio.'
                  : 'Completa los datos del socio y asigna su membresía inicial.'}
              </p>
            </div>

            <button
              type="button"
              onClick={
                limpiarFormulario
              }
              className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <form
            onSubmit={
              guardarMiembro
            }
            className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]"
          >
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mx-auto flex aspect-square w-full max-w-[260px] items-center justify-center overflow-hidden rounded-2xl bg-white">
                {previewFoto ? (
                  <img
                    src={
                      previewFoto
                    }
                    alt="Foto del socio"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <ImageIcon
                      size={44}
                    />

                    <span className="mt-2 text-sm">
                      Sin foto
                    </span>
                  </div>
                )}
              </div>

              <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800">
                <Camera
                  size={18}
                />

                Tomar / seleccionar foto

                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={
                    seleccionarFoto
                  }
                  className="hidden"
                />
              </label>

              <p className="mt-3 text-xs text-gray-500">
                Desde celular se abrirá la cámara. La foto se comprime automáticamente.
              </p>

              <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Código del socio
                </p>

                <p className="mt-2 text-2xl font-black tracking-widest text-gray-900">
                  {formulario.codigo_acceso ||
                    'Automático'}
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  Se genera automáticamente y se utiliza para registrar asistencia.
                </p>
              </div>
            </div>

            <div className="min-w-0">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Nombre
                  </label>

                  <input
                    value={
                      formulario.nombre
                    }
                    onChange={(
                      e
                    ) =>
                      actualizarCampo(
                        'nombre',
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Ej: Juan"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Apellido
                  </label>

                  <input
                    value={
                      formulario.apellido
                    }
                    onChange={(
                      e
                    ) =>
                      actualizarCampo(
                        'apellido',
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Ej: Pérez"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Cédula
                  </label>

                  <input
                    value={
                      formulario.cedula
                    }
                    onChange={(
                      e
                    ) =>
                      actualizarCampo(
                        'cedula',
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Ej: 1720000000"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Teléfono
                  </label>

                  <input
                    value={
                      formulario.telefono
                    }
                    onChange={(
                      e
                    ) =>
                      actualizarCampo(
                        'telefono',
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Ej: 0999999999"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Correo
                  </label>

                  <input
                    type="email"
                    value={
                      formulario.email
                    }
                    onChange={(
                      e
                    ) =>
                      actualizarCampo(
                        'email',
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Ej: cliente@email.com"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Fecha de nacimiento
                  </label>

                  <input
                    type="date"
                    value={
                      formulario.fecha_nacimiento
                    }
                    onChange={(
                      e
                    ) =>
                      actualizarCampo(
                        'fecha_nacimiento',
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Dirección
                  </label>

                  <input
                    value={
                      formulario.direccion
                    }
                    onChange={(
                      e
                    ) =>
                      actualizarCampo(
                        'direccion',
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Dirección"
                  />
                </div>

                {editandoId && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Estado
                    </label>

                    <select
                      value={
                        formulario.estado
                      }
                      onChange={(
                        e
                      ) =>
                        actualizarCampo(
                          'estado',
                          e.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    >
                      {estadoOpciones.map(
                        (
                          estado
                        ) => (
                          <option
                            key={
                              estado.value
                            }
                            value={
                              estado.value
                            }
                          >
                            {
                              estado.label
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Contacto de emergencia
                  </label>

                  <input
                    value={
                      formulario.contacto_emergencia
                    }
                    onChange={(
                      e
                    ) =>
                      actualizarCampo(
                        'contacto_emergencia',
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Nombre del contacto"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Teléfono de emergencia
                  </label>

                  <input
                    value={
                      formulario.telefono_emergencia
                    }
                    onChange={(
                      e
                    ) =>
                      actualizarCampo(
                        'telefono_emergencia',
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Teléfono del contacto"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Notas
                  </label>

                  <textarea
                    value={
                      formulario.notas
                    }
                    onChange={(
                      e
                    ) =>
                      actualizarCampo(
                        'notas',
                        e.target
                          .value
                      )
                    }
                    className="min-h-24 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Observaciones relevantes del socio"
                  />
                </div>
              </div>

              {!editandoId && (
                <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 md:p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
                      <CreditCard
                        size={19}
                      />
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-900">
                        Membresía inicial
                      </h3>

                      <p className="text-sm text-gray-500">
                        Selecciona el plan y registra el pago del nuevo socio.
                      </p>
                    </div>
                  </div>

                  {nuevoMiembroPendienteId && (
                    <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                      El socio ya fue creado. Al guardar nuevamente se intentará completar únicamente su membresía.
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Plan vigente
                      </label>

                      <select
                        value={
                          formMembresia.plan_id
                        }
                        onChange={(
                          e
                        ) =>
                          actualizarMembresia(
                            'plan_id',
                            e.target
                              .value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                      >
                        <option value="">
                          Seleccionar plan
                        </option>

                        {planesDisponibles.map(
                          (
                            plan
                          ) => (
                            <option
                              key={
                                plan.id
                              }
                              value={
                                plan.id
                              }
                            >
                              {
                                plan.nombre
                              }{' '}
                              ·{' '}
                              {formatearDinero(
                                plan.precio
                              )}

                              {esPlanFechaFijaMiembros(
                                plan
                              ) && (
                                <>
                                  {' · hasta '}
                                  {formatearFechaPlanMiembros(
                                    plan.vigencia_hasta
                                  )}
                                </>
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Fecha de inicio
                      </label>

                      <div className="relative">
                        <CalendarDays
                          size={
                            18
                          }
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          type="date"
                          value={
                            formMembresia.fecha_inicio
                          }

                          min={
                            esPlanFechaFijaMiembros(
                              planSeleccionado
                            )
                              ? planSeleccionado
                                  .vigencia_desde
                              : undefined
                          }

                          max={
                            esPlanFechaFijaMiembros(
                              planSeleccionado
                            )
                              ? planSeleccionado
                                  .vigencia_hasta
                              : undefined
                          }

                          onChange={(
                            e
                          ) =>
                            actualizarMembresia(
                              'fecha_inicio',
                              e
                                .target
                                .value
                            )
                          }

                          className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-black"
                        />

                        {esPlanFechaFijaMiembros(
                          planSeleccionado
                        ) && (

                          <p className="mt-1 text-xs font-semibold text-purple-700">
                            Esta promoción finaliza el{' '}
                            {formatearFechaPlanMiembros(
                              planSeleccionado
                                .vigencia_hasta
                            )}.
                          </p>

                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2">
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

                  {planSeleccionado && (
                    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">
                        {
                          planSeleccionado.nombre
                        }
                      </span>

                      {' · '}

                      {
                        planSeleccionado.duracion_dias
                      }{' '}
                      día(s)

                      {' · '}

                      {formatearDinero(
                        planSeleccionado.precio
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={
                    guardando
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save
                    size={18}
                  />

                  {guardando
                    ? 'Guardando...'
                    : editandoId
                      ? 'Guardar cambios'
                      : nuevoMiembroPendienteId
                        ? 'Completar membresía'
                        : 'Registrar miembro y membresía'}
                </button>

                <button
                  type="button"
                  onClick={
                    limpiarFormulario
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
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
            <h2 className="text-lg font-bold text-gray-900">
              {esEmpleado ? 'Buscar miembro' : 'Listado de miembros'}
            </h2>

            <p className="text-sm text-gray-500">
              {esEmpleado
                ? 'Busca por nombre, apellido, cédula o celular.'
                : <>Total registrados: {miembros.length}</>}
            </p>
          </div>

          <div className="relative w-full md:w-96">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={
                busqueda
              }
              onChange={(
                e
              ) =>
                setBusqueda(
                  e.target
                    .value
                )
              }
              className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-black"
              placeholder={
                esEmpleado
                  ? 'Nombre, apellido, cédula o celular'
                  : 'Buscar por código, nombre, cédula o teléfono'
              }
            />
          </div>
        </div>

        {cargando ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Cargando miembros...
          </div>
        ) : miembrosFiltrados.length ===
          0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <UserRound
                size={24}
                className="text-gray-500"
              />
            </div>

            <p className="font-semibold text-gray-900">
              {esEmpleado
                ? busqueda.trim().length < 2
                  ? 'Escribe al menos 2 caracteres para buscar un miembro.'
                  : 'No se encontraron miembros activos con esa búsqueda.'
                : 'No hay miembros registrados'}
            </p>
          </div>
        ) : (
          <>
            {/* MÓVIL */}

            <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
              {miembrosPaginados.map(
                (
                  miembro
                ) => (
                  <div
                    key={
                      miembro.id
                    }
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex gap-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                        {miembro.foto_url ? (
                          <img
                            src={
                              miembro.foto_url
                            }
                            alt="Foto del socio"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <UserRound
                              size={
                                28
                              }
                              className="text-gray-400"
                            />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-bold text-gray-900">
                            {
                              miembro.nombre
                            }{' '}
                            {
                              miembro.apellido
                            }
                          </h3>

                          <button
                            type="button"
                            onClick={() =>
                              abrirDetalleMiembro(
                                miembro
                              )
                            }
                            className="shrink-0 rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Ver
                          </button>
                        </div>

                        <span className="mt-2 inline-flex rounded-full bg-black px-3 py-1 text-sm font-bold tracking-widest text-white">
                          {miembro.codigo_acceso ||
                            '-'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <ShieldCheck
                          size={
                            16
                          }
                        />

                        Cédula:{' '}
                        {miembro.cedula ||
                          '-'}
                      </div>

                      <div className="flex items-center gap-2">
                        <Phone
                          size={
                            16
                          }
                        />

                        {miembro.telefono ||
                          'Sin teléfono'}
                      </div>

                      <div className="flex items-center gap-2">
                        <Mail
                          size={
                            16
                          }
                        />

                        {miembro.email ||
                          'Sin correo'}
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin
                          size={
                            16
                          }
                        />

                        {miembro.direccion ||
                          'Sin dirección'}
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => editarMiembro(miembro)}
                        className="rounded-lg border border-gray-200 p-2"
                        title="Editar miembro"
                      >
                        <Pencil size={17} />
                      </button>

                      {!esEmpleado && (
                        <button
                          type="button"
                          onClick={() => cambiarEstadoMiembro(miembro)}
                          className="rounded-lg border border-gray-200 p-2"
                        >
                          {miembro.estado === 'activo' ? (
                            <PowerOff size={17} />
                          ) : (
                            <Power size={17} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* ESCRITORIO */}

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">
                      Socio
                    </th>

                    <th className="px-5 py-3">
                      Código
                    </th>

                    <th className="px-5 py-3">
                      Cédula
                    </th>

                    <th className="px-5 py-3">
                      Teléfono
                    </th>

                    <th className="px-5 py-3">
                      Correo
                    </th>

                    <th className="px-5 py-3">
                      Foto
                    </th>

                    <th className="px-5 py-3">
                      Estado
                    </th>

                    <th className="px-5 py-3 text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {miembrosPaginados.map(
                    (
                      miembro
                    ) => (
                      <tr
                        key={
                          miembro.id
                        }
                        className="hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 overflow-hidden rounded-full bg-gray-100">
                              {miembro.foto_url ? (
                                <img
                                  src={
                                    miembro.foto_url
                                  }
                                  alt="Foto del socio"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <UserRound
                                    size={
                                      20
                                    }
                                  />
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <div className="font-semibold text-gray-900">
                                  {
                                    miembro.nombre
                                  }{' '}
                                  {
                                    miembro.apellido
                                  }
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    abrirDetalleMiembro(
                                      miembro
                                    )
                                  }
                                  className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                                >
                                  Ver
                                </button>
                              </div>

                              <div className="text-xs text-gray-500">
                                {miembro.direccion ||
                                  'Sin dirección'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-black px-3 py-1 text-sm font-bold tracking-widest text-white">
                            {miembro.codigo_acceso ||
                              '-'}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {miembro.cedula ||
                            '-'}
                        </td>

                        <td className="px-5 py-4">
                          {miembro.telefono ||
                            '-'}
                        </td>

                        <td className="px-5 py-4">
                          {miembro.email ||
                            '-'}
                        </td>

                        <td className="px-5 py-4">
                          {miembro.foto_url ? (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                              Registrada
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                              Pendiente
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              miembro.estado ===
                              'activo'
                                ? 'bg-green-50 text-green-700'
                                : miembro.estado ===
                                    'suspendido'
                                  ? 'bg-yellow-50 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {
                              miembro.estado
                            }
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                editarMiembro(
                                  miembro
                                )
                              }
                              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                            >
                              <Pencil
                                size={
                                  17
                                }
                              />
                            </button>
{!esEmpleado && (

                            <button
                              type="button"
                              onClick={() =>
                                cambiarEstadoMiembro(
                                  miembro
                                )
                              }
                              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                            >
                              {miembro.estado ===
                              'activo' ? (
                                <PowerOff
                                  size={
                                    17
                                  }
                                />
                              ) : (
                                <Power
                                  size={
                                    17
                                  }
                                />
                              )}
                            </button>
)}
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINACIÓN */}

            <div className="flex flex-col gap-3 border-t border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
              <p className="text-sm text-gray-500">
                Mostrando{' '}
                {primerResultado}{' '}
                -{' '}
                {ultimoResultado}{' '}
                de{' '}
                {
                  miembrosFiltrados.length
                }{' '}
                resultado(s)
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPaginaActual(
                      (
                        pagina
                      ) =>
                        Math.max(
                          1,
                          pagina -
                            1
                        )
                    )
                  }
                  disabled={
                    paginaActual ===
                    1
                  }
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft
                    size={
                      17
                    }
                  />

                  Anterior
                </button>

                <span className="min-w-[110px] text-center text-sm font-semibold text-gray-700">
                  Página{' '}
                  {
                    paginaActual
                  }{' '}
                  de{' '}
                  {
                    totalPaginas
                  }
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPaginaActual(
                      (
                        pagina
                      ) =>
                        Math.min(
                          totalPaginas,
                          pagina +
                            1
                        )
                    )
                  }
                  disabled={
                    paginaActual ===
                    totalPaginas
                  }
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente

                  <ChevronRight
                    size={
                      17
                    }
                  />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}