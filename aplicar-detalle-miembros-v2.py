from pathlib import Path
import shutil
import sys

ARCHIVO = Path("app/miembros/page.js")
RESPALDO = Path("app/miembros/page.js.antes-detalle-membresia-v2.bak")
MARCADOR = "MAK_DETALLE_MEMBRESIA_V2"


def error(mensaje):
    print("")
    print("ERROR:", mensaje)
    print("NO se modifico app/miembros/page.js")
    sys.exit(1)


if not ARCHIVO.exists():
    error("No existe app/miembros/page.js")

codigo = ARCHIVO.read_text(encoding="utf-8")

for requerido in [
    "export default function MiembrosPage()",
    "const RESULTADOS_POR_PAGINA = 10",
    "async function guardarMiembro(",
    "{miembrosPaginados.map(",
]:
    if requerido not in codigo:
        error(f"No se encontro la estructura requerida: {requerido}")

if MARCADOR in codigo:
    print("")
    print("La mejora ya esta instalada.")
    sys.exit(0)


# 1. Helpers independientes para detalle + WhatsApp.
if "function normalizarTelefonoWhatsAppDetalle(" not in codigo:
    bloque_dinero = '''function formatearDinero(valor) {
  return `$${Number(
    valor || 0
  ).toFixed(2)}`
}
'''

    if bloque_dinero not in codigo:
        error("No se encontro function formatearDinero().")

    helpers = r'''

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
  return `🏋️‍♂️ ¡BIENVENIDO/A A *MAK FITNESS*! 🏋️‍♀️

¡Hola, *${nombre}*! 👋

Nos alegra mucho darte la bienvenida a MAK FITNESS y agradecemos la confianza que has depositado en nosotros. 💪🔥

A partir de hoy formas parte de nuestra comunidad, donde trabajamos juntos con disciplina, compromiso y constancia para alcanzar nuestros objetivos.

📋 DATOS DE TU MEMBRESÍA

🔹 Código único de asistencia: *${codigo}*
🔹 Tipo de membresía: *${plan}*
🔹 Vigencia: *${formatearFechaWhatsApp(fechaInicio)}* al *${formatearFechaWhatsApp(fechaRenovacion)}*

⚠️ IMPORTANTE: Cada vez que vengas a entrenar, es obligatorio proporcionar tu *Código Único* de asistencia al coach encargado, quien registrará tu asistencia correspondiente.

📌 REGLAS PRINCIPALES DE MAK FITNESS

🧴 1. Uso obligatorio de toalla personal
Utiliza siempre tu toalla durante el entrenamiento para mantener los equipos limpios e higiénicos.

🤝 2. Respeto hacia los demás miembros
Mantengamos un ambiente agradable y de respeto para todos. Cuidemos nuestras palabras, acciones y el espacio compartido.

💪 3. Entrenamiento responsable
Entrena de manera segura y responsable. Respeta tus límites, utiliza correctamente los equipos y sigue las indicaciones de nuestros entrenadores.

🏋️ 4. Deja el peso en su lugar
Después de utilizar discos, mancuernas y demás accesorios, recuerda devolverlos a su lugar correspondiente. ¡El orden es responsabilidad de todos!

🔥 ¡AHORA ES TU MOMENTO!

La disciplina y la constancia son la clave para lograr resultados. Cada entrenamiento cuenta, cada esfuerzo suma y cada día es una nueva oportunidad para ser mejor.

📲 Síguenos en Instagram como:
*@TU_USUARIO_DE_INSTAGRAM*

¡Entrena con actitud, compromiso y disciplina! 💪

*MAK FITNESS*
🏆 “Entrenamiento real, para resultados reales”

¡Nos vemos en el entrenamiento! 🔥🏋️‍♂️`
}

function abrirWhatsAppDetalle(telefono, mensaje) {
  const numero =
    normalizarTelefonoWhatsAppDetalle(
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
        bloque_dinero,
        bloque_dinero + helpers,
        1,
    )


# 2. Estados para la ventana de detalle.
if "detalleMiembro," not in codigo:
    estado_mensaje = '''  const [
    mensaje,
    setMensaje,
  ] = useState('')
'''

    if estado_mensaje not in codigo:
        error("No se encontro el estado mensaje.")

    estados = '''  const [
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
'''

    codigo = codigo.replace(
        estado_mensaje,
        estados,
        1,
    )


# 3. Mensaje simple al registrar correctamente.
mensaje_antiguo = '''      setMensaje(
        codigoGenerado
          ? `Miembro y membresía registrados correctamente. Código del socio: ${codigoGenerado}.`
          : 'Miembro y membresía registrados correctamente.'
      )
'''

if mensaje_antiguo in codigo:
    codigo = codigo.replace(
        mensaje_antiguo,
        '''      setMensaje(
        'Miembro creado exitosamente.'
      )
''',
        1,
    )
else:
    codigo = codigo.replace(
        "'Miembro y membresía registrados correctamente.'",
        "'Miembro creado exitosamente.'",
    )


# 4. Ocultar una tarjeta antigua de WhatsApp, si existe.
inicio_card = codigo.find("      {whatsappPendiente && (")
if inicio_card != -1:
    fin_card = codigo.find(
        "      {mostrarFormulario && (",
        inicio_card,
    )
    if fin_card == -1:
        error(
            "Se encontro una tarjeta antigua de WhatsApp pero no se pudo localizar su final."
        )
    codigo = codigo[:inicio_card] + codigo[fin_card:]


# 5. Funciones de detalle de membresia.
if "async function abrirDetalleMiembro(" not in codigo:
    marcador = "  const planesDisponibles =\n"
    if marcador not in codigo:
        error("No se encontro const planesDisponibles.")

    funciones = r'''  async function abrirDetalleMiembro(miembro) {
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

'''

    codigo = codigo.replace(
        marcador,
        funciones + marcador,
        1,
    )


# 6. Modal compacto.
if "Detalle de membresía" not in codigo:
    marcador_modal = "      {mostrarFormulario && (\n"
    if marcador_modal not in codigo:
        error("No se encontro el punto donde insertar el modal.")

    modal = r'''      {detalleMiembro && (
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

'''

    codigo = codigo.replace(
        marcador_modal,
        modal + marcador_modal,
        1,
    )


# 7. Boton Ver en movil.
if "abrirDetalleMiembro(\n                                miembro" not in codigo:
    movil_viejo = '''                        <h3 className="font-bold text-gray-900">
                          {
                            miembro.nombre
                          }{' '}
                          {
                            miembro.apellido
                          }
                        </h3>
'''

    movil_nuevo = '''                        <div className="flex items-start justify-between gap-3">
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
'''

    if movil_viejo not in codigo:
        error("No se encontro el nombre del socio en la vista movil.")

    codigo = codigo.replace(
        movil_viejo,
        movil_nuevo,
        1,
    )

    escritorio_viejo = '''                              <div className="font-semibold text-gray-900">
                                {
                                  miembro.nombre
                                }{' '}
                                {
                                  miembro.apellido
                                }
                              </div>
'''

    escritorio_nuevo = '''                              <div className="flex items-center gap-2">
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
'''

    if escritorio_viejo not in codigo:
        error("No se encontro el nombre del socio en la vista de escritorio.")

    codigo = codigo.replace(
        escritorio_viejo,
        escritorio_nuevo,
        1,
    )


# 8. Validaciones finales.
for requerido in [
    MARCADOR,
    "Miembro creado exitosamente.",
    "function normalizarTelefonoWhatsAppDetalle(",
    "async function abrirDetalleMiembro(",
    "function enviarDetallePorWhatsApp()",
    "Detalle de membresía",
    "Enviar detalles por WhatsApp",
    "export default function MiembrosPage()",
]:
    if requerido not in codigo:
        error(f"Fallo validacion final: {requerido}")

if codigo.count("export default function MiembrosPage()") != 1:
    error("MiembrosPage quedo inconsistente.")

if codigo.count("async function abrirDetalleMiembro(") != 1:
    error("abrirDetalleMiembro quedo duplicada.")


# 9. Respaldo y guardado.
shutil.copy2(ARCHIVO, RESPALDO)
ARCHIVO.write_text(codigo, encoding="utf-8")

print("")
print("==============================================")
print(" DETALLE DE MEMBRESIA INSTALADO CORRECTAMENTE")
print("==============================================")
print("")
print("Cambios:")
print("- Mensaje: Miembro creado exitosamente.")
print("- Boton Ver junto al nombre.")
print("- Modal pequeno con datos de membresia.")
print("- Boton Enviar detalles por WhatsApp.")
print("- WhatsApp en texto plano, sin emojis.")
print("")
print("Respaldo:")
print(RESPALDO)
print("")
print("Ahora ejecuta:")
print("")
print("npm run dev")
print("")
