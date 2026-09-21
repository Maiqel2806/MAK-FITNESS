'use client'

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

function crearMembresiaInicial() {
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
          activo,
          es_upgrade,
          codigo,
          cobra_inscripcion,
          es_promocion
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

          nuevo.monto = plan
            ? String(
                plan.precio
              )
            : ''
        }

        if (
          campo ===
          'metodo_pago'
        ) {
          if (
            valor ===
            'efectivo'
          ) {
            nuevo.numero_comprobante =
              ''

            nuevo.banco_origen =
              ''

            nuevo.tipo_tarjeta =
              ''
          }

          if (
            valor ===
            'transferencia'
          ) {
            nuevo.tipo_tarjeta =
              ''
          }

          if (
            valor ===
            'tarjeta'
          ) {
            nuevo.banco_origen =
              ''
          }
        }

        return nuevo
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

    const monto =
      Number(
        formMembresia.monto
      )

    if (
      !monto ||
      monto <= 0
    ) {
      throw new Error(
        'El monto del pago debe ser mayor a 0.'
      )
    }

    const errorPago =
      validarDetallePago(
        formMembresia
      )

    if (errorPago) {
      throw new Error(
        errorPago
      )
    }

    const {
      error,
    } = await supabase.rpc(
      'registrar_membresia_inteligente',
      {
        p_miembro_id:
          miembroId,

        p_plan_id:
          formMembresia.plan_id,

        p_metodo_pago:
          formMembresia.metodo_pago,

        p_monto:
          monto,

        p_notas:
          formMembresia.notas.trim() ||
          null,

        p_fecha_inicio_manual:
          formMembresia.fecha_inicio,

        p_renovacion_de_membresia_id:
          null,

        p_numero_comprobante:
          formMembresia.numero_comprobante.trim() ||
          null,

        p_banco_origen:
          formMembresia.banco_origen.trim() ||
          null,

        p_tipo_tarjeta:
          formMembresia.tipo_tarjeta ||
          null,
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
      !editandoId &&
      !nuevoMiembroPendienteId
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

      const monto =
        Number(
          formMembresia.monto
        )

      if (
        !monto ||
        monto <= 0
      ) {
        setError(
          'El monto del pago debe ser mayor a 0.'
        )

        setGuardando(false)
        return
      }

      const errorPago =
        validarDetallePago(
          formMembresia
        )

      if (errorPago) {
        setError(
          errorPago
        )

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

      await cargarDatos()

      limpiarFormulario()

      setMensaje(
        'Miembro creado exitosamente.'
      )

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

  async function abrirDetalleMiembro(miembro) {
    setDetalleMiembro(miembro)
    setDetalleMembresia(null)
    setErrorDetalle('')
    setCargandoDetalle(true)

    const { data, error } = await supabase
      .from('membresias')
      .select(`
        id,
        fecha_inicio,
        fecha_fin,
        estado,
        plan_nombre_snapshot,
        plan_precio_snapshot,
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
  }

  function enviarDetallePorWhatsApp() {
    if (!detalleMiembro || !detalleMembresia) {
      return
    }

    const fechaRenovacion =
      sumarDiasDetalle(
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

  const planesDisponibles =
    useMemo(() => {
      return planes.filter(
        (plan) => {
          return (
            plan.activo &&
            !plan.es_upgrade &&
            plan.codigo !==
              'MENSUAL_FIDELIZACION'
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
                      Próxima renovación
                    </p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {formatearFechaDetalle(
                        sumarDiasDetalle(
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

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={enviarDetallePorWhatsApp}
                disabled={
                  cargandoDetalle ||
                  !detalleMembresia ||
                  !normalizarTelefonoWhatsAppDetalle(
                    detalleMiembro.telefono
                  )
                }
                className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Enviar detalles por WhatsApp
              </button>

              <button
                type="button"
                onClick={cerrarDetalleMiembro}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
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
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Monto
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          formMembresia.monto
                        }
                        onChange={(
                          e
                        ) =>
                          actualizarMembresia(
                            'monto',
                            e.target
                              .value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Método de pago
                      </label>

                      <select
                        value={
                          formMembresia.metodo_pago
                        }
                        onChange={(
                          e
                        ) =>
                          actualizarMembresia(
                            'metodo_pago',
                            e.target
                              .value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                      >
                        <option value="efectivo">
                          Efectivo
                        </option>

                        <option value="transferencia">
                          Transferencia
                        </option>

                        <option value="tarjeta">
                          Tarjeta
                        </option>
                      </select>
                    </div>

                    {formMembresia.metodo_pago ===
                      'transferencia' && (
                      <>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Número de comprobante
                          </label>

                          <input
                            value={
                              formMembresia.numero_comprobante
                            }
                            onChange={(
                              e
                            ) =>
                              actualizarMembresia(
                                'numero_comprobante',
                                e
                                  .target
                                  .value
                              )
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                            placeholder="Ej: TRX-001234"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Banco de origen
                          </label>

                          <input
                            value={
                              formMembresia.banco_origen
                            }
                            onChange={(
                              e
                            ) =>
                              actualizarMembresia(
                                'banco_origen',
                                e
                                  .target
                                  .value
                              )
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                            placeholder="Ej: Banco Pichincha"
                          />
                        </div>
                      </>
                    )}

                    {formMembresia.metodo_pago ===
                      'tarjeta' && (
                      <>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Tipo de tarjeta
                          </label>

                          <select
                            value={
                              formMembresia.tipo_tarjeta
                            }
                            onChange={(
                              e
                            ) =>
                              actualizarMembresia(
                                'tipo_tarjeta',
                                e
                                  .target
                                  .value
                              )
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                          >
                            <option value="">
                              Seleccionar tarjeta
                            </option>

                            {tiposTarjeta.map(
                              (
                                tarjeta
                              ) => (
                                <option
                                  key={
                                    tarjeta.value
                                  }
                                  value={
                                    tarjeta.value
                                  }
                                >
                                  {
                                    tarjeta.label
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Número de comprobante
                          </label>

                          <input
                            value={
                              formMembresia.numero_comprobante
                            }
                            onChange={(
                              e
                            ) =>
                              actualizarMembresia(
                                'numero_comprobante',
                                e
                                  .target
                                  .value
                              )
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                            placeholder="Ej: POS-001234"
                          />
                        </div>
                      </>
                    )}

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Nota del pago / membresía
                      </label>

                      <textarea
                        value={
                          formMembresia.notas
                        }
                        onChange={(
                          e
                        ) =>
                          actualizarMembresia(
                            'notas',
                            e.target
                              .value
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