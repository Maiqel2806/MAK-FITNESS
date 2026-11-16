from pathlib import Path
import shutil
import sys

ARCHIVO = Path("app/miembros/page.js")
RESPALDO = Path(
    "app/miembros/page.js.antes-whatsapp-bienvenida.bak"
)

MARCADOR = "MAK_WHATSAPP_BIENVENIDA_V2"


def terminar_error(mensaje):
    print("")
    print("ERROR:", mensaje)
    print("")
    print("NO se modificó app/miembros/page.js")
    sys.exit(1)


if not ARCHIVO.exists():
    terminar_error(
        "No existe app/miembros/page.js"
    )

codigo_original = ARCHIVO.read_text(
    encoding="utf-8"
)

codigo = codigo_original


# ============================================================
# VALIDAR QUE ESTAMOS SOBRE EL ARCHIVO CORRECTO
# ============================================================

validaciones_base = [
    "export default function MiembrosPage()",
    "const RESULTADOS_POR_PAGINA = 10",
    "async function registrarMembresiaInicial(",
    "async function guardarMiembro(",
    "Registrar miembro y membresía",
]

for texto in validaciones_base:
    if texto not in codigo:
        terminar_error(
            f"No encuentro la estructura esperada: {texto}"
        )


if MARCADOR in codigo:
    print("")
    print(
        "La integración de WhatsApp ya está aplicada."
    )
    sys.exit(0)


def reemplazar_exacto(
    buscar,
    reemplazo,
    nombre,
    cantidad_esperada=1,
):
    global codigo

    cantidad = codigo.count(buscar)

    if cantidad != cantidad_esperada:
        terminar_error(
            f"{nombre}: esperaba "
            f"{cantidad_esperada} coincidencia(s) "
            f"y encontré {cantidad}."
        )

    codigo = codigo.replace(
        buscar,
        reemplazo,
        cantidad_esperada,
    )


# ============================================================
# 1. FUNCIONES DE WHATSAPP
# ============================================================

buscar = """function formatearDinero(valor) {
  return `$${Number(
    valor || 0
  ).toFixed(2)}`
}
"""

reemplazo = """function formatearDinero(valor) {
  return `$${Number(
    valor || 0
  ).toFixed(2)}`
}

// MAK_WHATSAPP_BIENVENIDA_V2

function formatearFechaWhatsApp(
  fecha
) {
  if (!fecha) return '-'

  const [year, month, day] =
    String(fecha)
      .slice(0, 10)
      .split('-')

  return `${day}/${month}/${year}`
}

function sumarDiasWhatsApp(
  fecha,
  dias
) {
  if (!fecha) return ''

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
    date.getUTCDate() +
      Number(dias || 0)
  )

  return date
    .toISOString()
    .slice(0, 10)
}

function normalizarTelefonoWhatsApp(
  telefono
) {
  const numero = String(
    telefono || ''
  ).replace(/\\D/g, '')

  // Ejemplo:
  // +593982593153
  // queda: 593982593153
  if (
    numero.startsWith('593') &&
    numero.length === 12 &&
    numero.slice(3).startsWith('9')
  ) {
    return numero
  }

  // También aceptamos:
  // 0982593153
  // y convertimos a 593982593153
  if (
    numero.startsWith('09') &&
    numero.length === 10
  ) {
    return `593${numero.slice(1)}`
  }

  // También:
  // 982593153
  if (
    numero.startsWith('9') &&
    numero.length === 9
  ) {
    return `593${numero}`
  }

  return ''
}

function crearMensajeBienvenidaWhatsApp({
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

function abrirWhatsAppBienvenida(
  telefono,
  mensaje
) {
  const numero =
    normalizarTelefonoWhatsApp(
      telefono
    )

  if (!numero) {
    window.alert(
      'Número de WhatsApp inválido. Usa el formato +593982593153.'
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
"""

reemplazar_exacto(
    buscar,
    reemplazo,
    "Agregar funciones WhatsApp",
)


# ============================================================
# 2. ESTADO PARA GUARDAR LA BIENVENIDA
# ============================================================

buscar = """  const [
    mensaje,
    setMensaje,
  ] = useState('')
"""

reemplazo = """  const [
    mensaje,
    setMensaje,
  ] = useState('')

  const [
    whatsappPendiente,
    setWhatsappPendiente,
  ] = useState(null)
"""

reemplazar_exacto(
    buscar,
    reemplazo,
    "Agregar estado whatsappPendiente",
)


# ============================================================
# 3. LIMPIAR MENSAJE ANTERIOR AL CREAR OTRO SOCIO
# ============================================================

buscar = """  function abrirNuevoMiembro() {
    setFormulario(
      formularioInicial
    )
"""

reemplazo = """  function abrirNuevoMiembro() {
    setWhatsappPendiente(
      null
    )

    setFormulario(
      formularioInicial
    )
"""

reemplazar_exacto(
    buscar,
    reemplazo,
    "Modificar abrirNuevoMiembro",
)


# ============================================================
# 4. LIMPIAR MENSAJE SI ENTRAMOS A EDITAR
# ============================================================

buscar = """  function editarMiembro(
    miembro
  ) {
    setFormulario({
"""

reemplazo = """  function editarMiembro(
    miembro
  ) {
    setWhatsappPendiente(
      null
    )

    setFormulario({
"""

reemplazar_exacto(
    buscar,
    reemplazo,
    "Modificar editarMiembro",
)


# ============================================================
# 5. VALIDAR WHATSAPP DEL NUEVO SOCIO
# ============================================================

buscar = """    if (
      !editandoId &&
      !nuevoMiembroPendienteId
    ) {
"""

reemplazo = """    if (
      !editandoId
    ) {
      const numeroWhatsApp =
        normalizarTelefonoWhatsApp(
          formulario.telefono
        )

      if (!numeroWhatsApp) {
        setError(
          'Ingresa un WhatsApp válido de Ecuador. Ejemplo: +593982593153.'
        )

        setGuardando(false)
        return
      }
    }

    if (
      !editandoId &&
      !nuevoMiembroPendienteId
    ) {
"""

reemplazar_exacto(
    buscar,
    reemplazo,
    "Agregar validación WhatsApp",
)


# ============================================================
# 6. PREPARAR WHATSAPP DESPUÉS DE CREAR
#    SOCIO + MEMBRESÍA CORRECTAMENTE
# ============================================================

buscar = """      await cargarDatos()

      limpiarFormulario()

      setMensaje(
        codigoGenerado
          ? `Miembro y membresía registrados correctamente. Código del socio: ${codigoGenerado}.`
          : 'Miembro y membresía registrados correctamente.'
      )

      setGuardando(false)
"""

reemplazo = """      const {
        data:
          membresiaRegistrada,

        error:
          errorMembresiaRegistrada,
      } = await supabase
        .from('membresias')
        .select(`
          id,
          plan_id,
          fecha_inicio,
          fecha_fin,
          plan_nombre_snapshot
        `)
        .eq(
          'miembro_id',
          miembroId
        )
        .eq(
          'plan_id',
          formMembresia.plan_id
        )
        .eq(
          'fecha_inicio',
          formMembresia.fecha_inicio
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle()

      const planRegistrado =
        planes.find(
          (plan) =>
            plan.id ===
            formMembresia.plan_id
        )

      if (
        !errorMembresiaRegistrada &&
        membresiaRegistrada
      ) {
        const fechaRenovacion =
          sumarDiasWhatsApp(
            membresiaRegistrada.fecha_fin,
            1
          )

        const nombreCliente =
          formulario.nombre.trim()

        const codigoCliente =
          codigoGenerado ||
          formulario.codigo_acceso ||
          '-'

        const nombrePlan =
          membresiaRegistrada.plan_nombre_snapshot ||
          planRegistrado?.nombre ||
          'Membresía MAK FITNESS'

        const mensajeWhatsApp =
          crearMensajeBienvenidaWhatsApp({
            nombre:
              nombreCliente,

            codigo:
              codigoCliente,

            plan:
              nombrePlan,

            fechaInicio:
              membresiaRegistrada.fecha_inicio,

            fechaRenovacion,
          })

        setWhatsappPendiente({
          nombre:
            `${formulario.nombre.trim()} ${formulario.apellido.trim()}`.trim(),

          telefono:
            formulario.telefono,

          codigo:
            codigoCliente,

          plan:
            nombrePlan,

          fechaInicio:
            membresiaRegistrada.fecha_inicio,

          fechaRenovacion,

          mensaje:
            mensajeWhatsApp,
        })
      } else {
        setWhatsappPendiente(
          null
        )
      }

      await cargarDatos()

      limpiarFormulario()

      setMensaje(
        errorMembresiaRegistrada
          ? 'Miembro y membresía registrados correctamente, pero no se pudo preparar el mensaje de WhatsApp.'
          : codigoGenerado
            ? `Miembro y membresía registrados correctamente. Código del socio: ${codigoGenerado}.`
            : 'Miembro y membresía registrados correctamente.'
      )

      setGuardando(false)
"""

reemplazar_exacto(
    buscar,
    reemplazo,
    "Preparar WhatsApp después del registro",
)


# ============================================================
# 7. CAMBIAR CAMPO TELÉFONO A WHATSAPP
# ============================================================

buscar = """                    Teléfono
                  </label>"""

reemplazo = """                    WhatsApp *
                  </label>"""

reemplazar_exacto(
    buscar,
    reemplazo,
    "Cambiar etiqueta Teléfono",
)


buscar = """                    placeholder="Ej: 0999999999"
                  />"""

reemplazo = """                    placeholder="Ej: +593982593153"
                  />"""

reemplazar_exacto(
    buscar,
    reemplazo,
    "Cambiar ejemplo del teléfono",
)


# ============================================================
# 8. BOTÓN VERDE DESPUÉS DEL REGISTRO
# ============================================================

buscar = """      {mensaje && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {mensaje}
        </div>
      )}

      {mostrarFormulario && (
"""

reemplazo = """      {mensaje && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {mensaje}
        </div>
      )}

      {whatsappPendiente && (
        <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 md:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="min-w-0">
              <h2 className="font-bold text-green-900">
                💬 Bienvenida lista para WhatsApp
              </h2>

              <p className="mt-2 text-sm text-green-800">
                {whatsappPendiente.nombre}
                {' · '}
                Código {whatsappPendiente.codigo}
                {' · '}
                {whatsappPendiente.plan}
              </p>

              <p className="mt-1 text-xs text-green-700">
                WhatsApp: +{normalizarTelefonoWhatsApp(
                  whatsappPendiente.telefono
                )}
              </p>

              <p className="mt-1 text-xs text-green-700">
                Inicio:{' '}
                {formatearFechaWhatsApp(
                  whatsappPendiente.fechaInicio
                )}
                {' · '}
                Renovación:{' '}
                {formatearFechaWhatsApp(
                  whatsappPendiente.fechaRenovacion
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                abrirWhatsAppBienvenida(
                  whatsappPendiente.telefono,
                  whatsappPendiente.mensaje
                )
              }
              className="inline-flex w-full items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700 sm:w-auto"
            >
              💬 Enviar bienvenida por WhatsApp
            </button>

          </div>
        </div>
      )}

      {mostrarFormulario && (
"""

reemplazar_exacto(
    buscar,
    reemplazo,
    "Agregar botón de WhatsApp",
)


# ============================================================
# 9. VALIDACIONES FINALES
# ============================================================

validaciones_finales = [
    "export default function MiembrosPage()",
    "const RESULTADOS_POR_PAGINA = 10",
    "MAK_WHATSAPP_BIENVENIDA_V2",
    "whatsappPendiente",
    "normalizarTelefonoWhatsApp",
    "crearMensajeBienvenidaWhatsApp",
    "abrirWhatsAppBienvenida",
    "Enviar bienvenida por WhatsApp",
    "Registrar miembro y membresía",
    "miembrosPaginados",
]

for texto in validaciones_finales:
    if texto not in codigo:
        terminar_error(
            f"Falló la validación final: {texto}"
        )


# El componente principal debe seguir existiendo una sola vez.
if (
    codigo.count(
        "export default function MiembrosPage()"
    )
    != 1
):
    terminar_error(
        "El componente MiembrosPage quedó inconsistente."
    )


# Confirmar que no se truncó el archivo.
if len(codigo) < len(codigo_original):
    terminar_error(
        "El archivo resultante es menor al original. "
        "Por seguridad no se guardará."
    )


# ============================================================
# 10. RESPALDO + GUARDAR
# ============================================================

shutil.copy2(
    ARCHIVO,
    RESPALDO,
)

ARCHIVO.write_text(
    codigo,
    encoding="utf-8",
)

print("")
print("==============================================")
print(" WHATSAPP DE BIENVENIDA INSTALADO CORRECTAMENTE")
print("==============================================")
print("")
print("Archivo:")
print(ARCHIVO)
print("")
print("Respaldo:")
print(RESPALDO)
print("")
print("Formatos aceptados:")
print("  +593982593153")
print("  593982593153")
print("  0982593153")
print("  982593153")
print("")
print("Ahora ejecuta:")
print("")
print("npm run dev")
print("")