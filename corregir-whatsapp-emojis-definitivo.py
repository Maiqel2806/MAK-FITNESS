from pathlib import Path
import shutil
import sys

ARCHIVO = Path("app/miembros/page.js")
RESPALDO = Path(
    "app/miembros/page.js.antes-emojis-definitivo.bak"
)

INICIO = "function crearMensajeBienvenidaWhatsApp({"
FIN = "function abrirWhatsAppBienvenida("


def error(mensaje):
    print("")
    print("ERROR:", mensaje)
    print("NO se modifico page.js.")
    sys.exit(1)


if not ARCHIVO.exists():
    error("No existe app/miembros/page.js")


codigo = ARCHIVO.read_text(
    encoding="utf-8"
)


# ------------------------------------------------------------
# VALIDACIONES
# ------------------------------------------------------------

if "export default function MiembrosPage()" not in codigo:
    error(
        "No se encontro MiembrosPage()."
    )

pos_inicio = codigo.find(INICIO)
pos_fin = codigo.find(
    FIN,
    pos_inicio
)

if pos_inicio == -1:
    error(
        "No se encontro crearMensajeBienvenidaWhatsApp()."
    )

if pos_fin == -1:
    error(
        "No se encontro abrirWhatsAppBienvenida()."
    )

if pos_fin <= pos_inicio:
    error(
        "La estructura de las funciones no es valida."
    )


# ------------------------------------------------------------
# NUEVA FUNCION
#
# IMPORTANTE:
# NO contiene emojis escritos directamente.
# Todo se construye mediante puntos Unicode.
# ------------------------------------------------------------

nueva_funcion = r'''function crearMensajeBienvenidaWhatsApp({
  nombre,
  codigo,
  plan,
  fechaInicio,
  fechaRenovacion,
}) {
  const emojis = {
    gimnasioHombre:
      String.fromCodePoint(
        0x1F3CB,
        0xFE0F,
        0x200D,
        0x2642,
        0xFE0F
      ),

    gimnasioMujer:
      String.fromCodePoint(
        0x1F3CB,
        0xFE0F,
        0x200D,
        0x2640,
        0xFE0F
      ),

    gimnasio:
      String.fromCodePoint(
        0x1F3CB,
        0xFE0F
      ),

    saludo:
      String.fromCodePoint(
        0x1F44B
      ),

    musculo:
      String.fromCodePoint(
        0x1F4AA
      ),

    fuego:
      String.fromCodePoint(
        0x1F525
      ),

    portapapeles:
      String.fromCodePoint(
        0x1F4CB
      ),

    rombo:
      String.fromCodePoint(
        0x1F539
      ),

    advertencia:
      String.fromCodePoint(
        0x26A0,
        0xFE0F
      ),

    pin:
      String.fromCodePoint(
        0x1F4CC
      ),

    botella:
      String.fromCodePoint(
        0x1F9F4
      ),

    manos:
      String.fromCodePoint(
        0x1F91D
      ),

    trofeo:
      String.fromCodePoint(
        0x1F3C6
      ),

    movil:
      String.fromCodePoint(
        0x1F4F2
      ),
  }

  return `${emojis.gimnasioHombre} ¡BIENVENIDO/A A *MAK FITNESS*! ${emojis.gimnasioMujer}

¡Hola, *${nombre}*! ${emojis.saludo}

Nos alegra mucho darte la bienvenida a MAK FITNESS y agradecemos la confianza que has depositado en nosotros. ${emojis.musculo}${emojis.fuego}

A partir de hoy formas parte de nuestra comunidad, donde trabajamos juntos con disciplina, compromiso y constancia para alcanzar nuestros objetivos.

${emojis.portapapeles} DATOS DE TU MEMBRESÍA

${emojis.rombo} Código único de asistencia: *${codigo}*
${emojis.rombo} Tipo de membresía: *${plan}*
${emojis.rombo} Vigencia: *${formatearFechaWhatsApp(fechaInicio)}* al *${formatearFechaWhatsApp(fechaRenovacion)}*

${emojis.advertencia} IMPORTANTE: Cada vez que vengas a entrenar, es obligatorio proporcionar tu *Código Único* de asistencia al coach encargado, quien registrará tu asistencia correspondiente.

${emojis.pin} REGLAS PRINCIPALES DE MAK FITNESS

${emojis.botella} 1. Uso obligatorio de toalla personal
Utiliza siempre tu toalla durante el entrenamiento para mantener los equipos limpios e higiénicos.

${emojis.manos} 2. Respeto hacia los demás miembros
Mantengamos un ambiente agradable y de respeto para todos. Cuidemos nuestras palabras, acciones y el espacio compartido.

${emojis.musculo} 3. Entrenamiento responsable
Entrena de manera segura y responsable. Respeta tus límites, utiliza correctamente los equipos y sigue las indicaciones de nuestros entrenadores.

${emojis.gimnasio} 4. Deja el peso en su lugar
Después de utilizar discos, mancuernas y demás accesorios, recuerda devolverlos a su lugar correspondiente. ¡El orden es responsabilidad de todos!

${emojis.fuego} ¡AHORA ES TU MOMENTO!

La disciplina y la constancia son la clave para lograr resultados. Cada entrenamiento cuenta, cada esfuerzo suma y cada día es una nueva oportunidad para ser mejor.

¡Entrena con actitud, compromiso y disciplina! ${emojis.musculo}

*MAK FITNESS*
${emojis.trofeo} "Entrenamiento real, para resultados reales"

¡Nos vemos en el entrenamiento! ${emojis.fuego}${emojis.gimnasioHombre}`
}

'''


# ------------------------------------------------------------
# REEMPLAZAR SOLO LA FUNCION DEL MENSAJE
# ------------------------------------------------------------

codigo_nuevo = (
    codigo[:pos_inicio]
    + nueva_funcion
    + codigo[pos_fin:]
)


# ------------------------------------------------------------
# VALIDACIONES ANTES DE TOCAR EL ARCHIVO
# ------------------------------------------------------------

validaciones = [
    "export default function MiembrosPage()",
    "function crearMensajeBienvenidaWhatsApp",
    "function abrirWhatsAppBienvenida",
    "String.fromCodePoint(",
    "0x1F44B",
    "0x1F4AA",
    "0x1F525",
    "0x1F4CB",
    "0x1F539",
    "0x1F3C6",
    "normalizarTelefonoWhatsApp",
    "Enviar bienvenida por WhatsApp",
]

for texto in validaciones:
    if texto not in codigo_nuevo:
        error(
            f"Fallo validacion: {texto}"
        )


if codigo_nuevo.count(
    "export default function MiembrosPage()"
) != 1:
    error(
        "MiembrosPage no quedo correctamente."
    )


if codigo_nuevo.count(
    "function crearMensajeBienvenidaWhatsApp"
) != 1:
    error(
        "Hay mas de una funcion de mensaje."
    )


if codigo_nuevo.count(
    "function abrirWhatsAppBienvenida"
) != 1:
    error(
        "Hay mas de una funcion abrirWhatsApp."
    )


# ------------------------------------------------------------
# RESPALDO
# ------------------------------------------------------------

shutil.copy2(
    ARCHIVO,
    RESPALDO
)


# ------------------------------------------------------------
# GUARDADO
# ------------------------------------------------------------

ARCHIVO.write_text(
    codigo_nuevo,
    encoding="utf-8"
)


print("")
print("==============================================")
print(" EMOJIS CORREGIDOS DEFINITIVAMENTE")
print("==============================================")
print("")
print("Solo se modifico:")
print("crearMensajeBienvenidaWhatsApp()")
print("")
print("Respaldo:")
print(RESPALDO)
print("")
print("Los emojis ahora se generan con")
print("String.fromCodePoint() y no dependen")
print("de la codificacion del archivo.")
print("")