from pathlib import Path
import shutil
import sys

ARCHIVO = Path("app/membresias/page.js")
RESPALDO = Path("app/membresias/page.js.antes-mejora-whatsapp.bak")
MARCADOR = "MAK_WHATSAPP_VENCIDAS_V1"


def error(mensaje):
    print("")
    print("ERROR:", mensaje)
    print("NO se modifico app/membresias/page.js")
    sys.exit(1)


if not ARCHIVO.exists():
    error("No existe app/membresias/page.js")

codigo = ARCHIVO.read_text(encoding="utf-8")

for requerido in [
    "export default function MembresiasPage()",
    "const membresiasConEstadoReal = useMemo(() => {",
    "const membresiasFiltradas = useMemo(() => {",
    "{membresiasFiltradas.map((membresia) => {",
]:
    if requerido not in codigo:
        error(f"No se encontro la estructura requerida: {requerido}")

if MARCADOR in codigo:
    print("")
    print("La mejora de WhatsApp para membresias vencidas ya esta instalada.")
    sys.exit(0)


# ============================================================
# 1. HELPERS DE WHATSAPP
# ============================================================

ancla_helpers = "function ajustarDetallePagoPorMetodo(nuevo, campo, valor) {"

if ancla_helpers not in codigo:
    error("No se encontro ajustarDetallePagoPorMetodo().")

helpers = r'''// MAK_WHATSAPP_VENCIDAS_V1

function normalizarTelefonoWhatsAppMembresia(telefono) {
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

function crearMensajeRenovacion(membresia) {
  const nombre =
    obtenerNombreSocio(membresia)

  return `*¡Este mes ha sido excelente!*

Hola, *${nombre}*.

Tu constancia, disciplina y esfuerzo ya comienzan a dar resultados, y queremos seguir acompañándote en cada paso.

En *MAK FITNESS* somos más que un gimnasio: queremos ser parte de tu progreso y de cada meta que alcances.

*Renueva hoy tu membresía*, sigue formando parte de nuestra comunidad y continúa trabajando por ese objetivo que te propusiste.

*¡Vamos por más!*

*MAK FITNESS*
*Entrenamiento real, para resultados reales*`
}

function crearMensajeRecuperacion(membresia) {
  const nombre =
    obtenerNombreSocio(membresia)

  return `*¡Es un buen momento para volver!*

Hola, *${nombre}*.

A veces hacemos una pausa, pero tus objetivos siguen ahí esperando por ti.

En *MAK FITNESS* queremos verte nuevamente entrenando, recuperando el ritmo y avanzando con disciplina y constancia.

Retoma hoy tu entrenamiento y vuelve a trabajar por la mejor versión de ti.

*¡Te esperamos!*

*MAK FITNESS*
*Entrenamiento real, para resultados reales*`
}

function abrirWhatsAppMembresia(
  telefono,
  mensaje
) {
  const numero =
    normalizarTelefonoWhatsAppMembresia(
      telefono
    )

  if (!numero) {
    window.alert(
      'El socio no tiene un numero de WhatsApp valido.'
    )
    return
  }

  const url =
    `https://wa.me/${numero}?text=${encodeURIComponent(
      mensaje
    )}`

  window.open(
    url,
    '_blank',
    'noopener,noreferrer'
  )
}

'''

codigo = codigo.replace(
    ancla_helpers,
    helpers + ancla_helpers,
    1
)


# ============================================================
# 2. ESTADO DEL MODAL
# ============================================================

ancla_estado = "  const [mensaje, setMensaje] = useState('')"

if ancla_estado not in codigo:
    error("No se encontro el estado mensaje.")

estado_modal = """  const [mensaje, setMensaje] = useState('')

  const [detalleVencida, setDetalleVencida] = useState(null)"""

codigo = codigo.replace(
    ancla_estado,
    estado_modal,
    1
)


# ============================================================
# 3. FUNCIONES DEL DETALLE
# ============================================================

ancla_funciones = "  const membresiasConEstadoReal = useMemo(() => {"

if ancla_funciones not in codigo:
    error("No se encontro membresiasConEstadoReal.")

funciones = r'''  function abrirDetalleVencida(
    membresia
  ) {
    if (
      membresia.estado_real !==
      'vencida'
    ) {
      return
    }

    setDetalleVencida(
      membresia
    )
  }

  function cerrarDetalleVencida() {
    setDetalleVencida(null)
  }

  function enviarMensajeVencida(
    tipo
  ) {
    if (!detalleVencida) {
      return
    }

    const telefono =
      detalleVencida.miembros
        ?.telefono

    const mensajeWhatsApp =
      tipo === 'recuperacion'
        ? crearMensajeRecuperacion(
            detalleVencida
          )
        : crearMensajeRenovacion(
            detalleVencida
          )

    abrirWhatsAppMembresia(
      telefono,
      mensajeWhatsApp
    )
  }

'''

codigo = codigo.replace(
    ancla_funciones,
    funciones + ancla_funciones,
    1
)


# ============================================================
# 4. MODAL / PUSH DE DETALLE
# ============================================================

ancla_modal = '      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-4">'

if ancla_modal not in codigo:
    error("No se encontro el punto para insertar el modal.")

modal = r'''      {detalleVencida && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={
            cerrarDetalleVencida
          }
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Membresía caducada
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {obtenerNombreSocio(
                    detalleVencida
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  cerrarDetalleVencida
                }
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Código
                </p>
                <p className="mt-1 font-bold text-gray-900">
                  {detalleVencida.miembros
                    ?.codigo_acceso ||
                    '-'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  WhatsApp
                </p>
                <p className="mt-1 font-bold text-gray-900">
                  {detalleVencida.miembros
                    ?.telefono ||
                    'Sin teléfono'}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Último plan
                </p>
                <p className="mt-1 font-bold text-gray-900">
                  {obtenerNombrePlan(
                    detalleVencida
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Inicio
                </p>
                <p className="mt-1 font-bold text-gray-900">
                  {formatearFecha(
                    detalleVencida.fecha_inicio
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Debió renovar
                </p>
                <p className="mt-1 font-bold text-gray-900">
                  {formatearFecha(
                    obtenerFechaRenovacionMembresia(
                      detalleVencida
                    )
                  )}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Estado
                </p>
                <p className="mt-1 font-bold text-red-700">
                  {detalleVencida.texto_vigencia}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-sm text-gray-600">
                Elige el mensaje que deseas enviar al socio:
              </p>

              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    enviarMensajeVencida(
                      'renovacion'
                    )
                  }
                  disabled={
                    !normalizarTelefonoWhatsAppMembresia(
                      detalleVencida
                        .miembros
                        ?.telefono
                    )
                  }
                  className="rounded-xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Enviar mensaje renovación
                </button>

                <button
                  type="button"
                  onClick={() =>
                    enviarMensajeVencida(
                      'recuperacion'
                    )
                  }
                  disabled={
                    !normalizarTelefonoWhatsAppMembresia(
                      detalleVencida
                        .miembros
                        ?.telefono
                    )
                  }
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Mensaje recuperación cliente
                </button>
              </div>

              {!normalizarTelefonoWhatsAppMembresia(
                detalleVencida.miembros
                  ?.telefono
              ) && (
                <p className="mt-3 text-xs font-semibold text-red-600">
                  El socio no tiene un número de WhatsApp válido registrado.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

'''

codigo = codigo.replace(
    ancla_modal,
    modal + ancla_modal,
    1
)


# ============================================================
# 5. BOTON VER EN MOVIL - SOLO VENCIDAS
# ============================================================

ancla_movil = '''                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      {puedeAmpliarFidelizacion(membresia) && ('''

if ancla_movil not in codigo:
    error("No se encontro el bloque de acciones movil.")

reemplazo_movil = '''                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      {membresia.estado_real === 'vencida' && (
                        <button
                          type="button"
                          onClick={() =>
                            abrirDetalleVencida(
                              membresia
                            )
                          }
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          Ver
                        </button>
                      )}

                      {puedeAmpliarFidelizacion(membresia) && ('''

codigo = codigo.replace(
    ancla_movil,
    reemplazo_movil,
    1
)


# ============================================================
# 6. BOTON VER EN ESCRITORIO - SOLO VENCIDAS
# ============================================================

ancla_escritorio = '''                          <div className="flex justify-end gap-2">
                            {puedeAmpliarFidelizacion(membresia) && ('''

if ancla_escritorio not in codigo:
    error("No se encontro el bloque de acciones escritorio.")

reemplazo_escritorio = '''                          <div className="flex justify-end gap-2">
                            {membresia.estado_real === 'vencida' && (
                              <button
                                type="button"
                                onClick={() =>
                                  abrirDetalleVencida(
                                    membresia
                                  )
                                }
                                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                              >
                                Ver
                              </button>
                            )}

                            {puedeAmpliarFidelizacion(membresia) && ('''

codigo = codigo.replace(
    ancla_escritorio,
    reemplazo_escritorio,
    1
)


# ============================================================
# 7. VALIDACIONES FINALES
# ============================================================

validaciones = [
    MARCADOR,
    "function normalizarTelefonoWhatsAppMembresia(",
    "function crearMensajeRenovacion(",
    "function crearMensajeRecuperacion(",
    "function abrirWhatsAppMembresia(",
    "const [detalleVencida, setDetalleVencida]",
    "function abrirDetalleVencida(",
    "Enviar mensaje renovación",
    "Mensaje recuperación cliente",
    "export default function MembresiasPage()",
]

for texto in validaciones:
    if texto not in codigo:
        error(f"Fallo la validacion final: {texto}")

if codigo.count(
    "export default function MembresiasPage()"
) != 1:
    error("MembresiasPage quedo inconsistente.")

if codigo.count(
    "function abrirDetalleVencida("
) != 1:
    error("abrirDetalleVencida quedo duplicada.")

if codigo.count(
    "Mensaje recuperación cliente"
) != 1:
    error("El modal quedo duplicado.")


# ============================================================
# 8. RESPALDO Y GUARDADO
# ============================================================

shutil.copy2(
    ARCHIVO,
    RESPALDO
)

ARCHIVO.write_text(
    codigo,
    encoding="utf-8"
)

print("")
print("==============================================")
print(" MEJORA DE MEMBRESIAS INSTALADA CORRECTAMENTE")
print("==============================================")
print("")
print("Se agrego:")
print("- Boton Ver solo en membresias vencidas.")
print("- Ventana de detalle.")
print("- Mensaje de renovacion por WhatsApp.")
print("- Mensaje de recuperacion por WhatsApp.")
print("- Formato de WhatsApp para Ecuador.")
print("")
print("Respaldo:")
print(RESPALDO)
print("")
print("Ahora ejecuta:")
print("")
print("npm run dev")
print("")
