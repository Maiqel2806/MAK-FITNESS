from pathlib import Path
import shutil
import sys

PATH = Path('app/miembros/page.js')

MARKER = 'MAK_COMUNICADOS_WHATSAPP_V1'


def fail(msg):
    print('')
    print('ERROR:', msg)
    print('No se modificó app/miembros/page.js.')
    sys.exit(1)


def replace_once(text, old, new, label):
    count = text.count(old)

    if count != 1:
        fail(
            f'{label}: se esperaba 1 coincidencia '
            f'y se encontraron {count}.'
        )

    return text.replace(old, new, 1)


if not PATH.is_file():
    fail(
        'Ejecuta este script desde la raíz '
        'del proyecto gimnasio-admin.'
    )


raw = PATH.read_bytes()

newline = (
    '\r\n'
    if b'\r\n' in raw
    else '\n'
)

text = (
    raw.decode('utf-8')
    .replace('\r\n', '\n')
)


if MARKER in text:
    print('')
    print(
        'La función de comunicados '
        'ya está instalada.'
    )
    sys.exit(0)


# ============================================================
# VALIDACIONES PREVIAS
# ============================================================

for required in [
    'MAK_PROMOS_FECHA_FIJA_MIEMBROS_V1',
    'MAK_DETALLE_PROMO_FECHA_FIJA_V1',
    'function abrirWhatsAppDetalle',
    'async function abrirDetalleMiembro',
    'Enviar detalles por WhatsApp',
    'Nuevo miembro',
    'const esEmpleado =',
]:
    if required not in text:
        fail(
            f'Falta estructura requerida: {required}'
        )


# ============================================================
# 1. PERMISO FRONTEND
# ============================================================

old = """function MiembrosContenido({ perfil }) {
  const esEmpleado = perfil?.rol === 'empleado'
"""

new = """function MiembrosContenido({ perfil }) {
  const esEmpleado = perfil?.rol === 'empleado'

  // MAK_COMUNICADOS_WHATSAPP_V1
  const puedeAdministrarComunicado =
    ['dueno', 'administrador'].includes(
      perfil?.rol
    )
"""

text = replace_once(
    text,
    old,
    new,
    'Permisos de comunicados',
)


# ============================================================
# 2. ESTADOS
# ============================================================

old = """  const [
    errorDetalle,
    setErrorDetalle,
  ] = useState('')
"""

new = """  const [
    errorDetalle,
    setErrorDetalle,
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
"""

text = replace_once(
    text,
    old,
    new,
    'Estados de comunicado',
)


# ============================================================
# 3. FUNCIONES
# ============================================================

anchor = """  async function abrirDetalleMiembro(miembro) {
"""

functions = r'''  async function abrirFormularioComunicado() {
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

'''

if text.count(anchor) != 1:
    fail(
        'No se encontró abrirDetalleMiembro().'
    )

text = text.replace(
    anchor,
    functions + anchor,
    1,
)


# ============================================================
# 4. BOTONES SUPERIORES
# ============================================================

old = """        <button
          onClick={
            abrirNuevoMiembro
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          <Plus size={18} />

          Nuevo miembro
        </button>
"""

new = """        <div className="flex flex-col gap-2 sm:flex-row">

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
"""

text = replace_once(
    text,
    old,
    new,
    'Botón Crear comunicado',
)


# ============================================================
# 5. MODAL CREAR / EDITAR COMUNICADO
# ============================================================

anchor = """      {detalleMiembro && (
"""

modal = r'''      {mostrarComunicado &&
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

'''

if text.count(anchor) != 1:
    fail(
        'No se encontró el modal '
        'de detalle del miembro.'
    )

text = text.replace(
    anchor,
    modal + anchor,
    1,
)


# ============================================================
# 6. BOTONES DEL DETALLE
# ============================================================

old = """            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
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
"""

new = """            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">

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
"""

text = replace_once(
    text,
    old,
    new,
    'Botón Enviar comunicado',
)


# ============================================================
# 7. VALIDACIONES FINALES
# ============================================================

if text.count(MARKER) != 1:
    fail(
        'Marcador de comunicados duplicado '
        'o ausente.'
    )


for required in [
    'guardar_comunicado_actual',
    'obtener_comunicado_actual',
    'desactivar_comunicado_actual',
    'Enviar comunicado',
    'Crear comunicado',
    '@makfitness0',
    'MAK_DETALLE_PROMO_FECHA_FIJA_V1',
    'MAK_PROMOS_FECHA_FIJA_MIEMBROS_V1',
    'registrar_membresia_con_pagos',
    'RESULTADOS_POR_PAGINA = 10',
]:
    if required not in text:
        fail(
            f'Validación final falló: {required}'
        )


# ============================================================
# 8. RESPALDO
# ============================================================

backup = PATH.with_name(
    PATH.name +
    '.antes-comunicados-whatsapp.bak'
)


if not backup.exists():
    shutil.copy2(
        PATH,
        backup,
    )


# ============================================================
# 9. ESCRITURA
# ============================================================

try:

    output = text

    if newline == '\r\n':
        output = output.replace(
            '\n',
            '\r\n'
        )

    PATH.write_bytes(
        output.encode('utf-8')
    )

except Exception as exc:

    PATH.write_bytes(raw)

    fail(
        f'No se pudo escribir '
        f'el archivo: {exc}'
    )


print('')
print(
    'COMUNICADOS DE WHATSAPP '
    'APLICADOS CORRECTAMENTE'
)
print('')
print(
    'Se modificó únicamente:'
)
print(
    ' - app/miembros/page.js'
)
print('')
print(
    'Funcionamiento:'
)
print(
    ' - Dueño/administrador puede crear el comunicado.'
)
print(
    ' - Solo existe un comunicado activo.'
)
print(
    ' - Guardar reemplaza el comunicado anterior.'
)
print(
    ' - No se guarda historial de comunicados.'
)
print(
    ' - No se registra a quién se envió.'
)
print(
    ' - Staff puede usar Enviar comunicado desde Ver.'
)
print(
    ' - WhatsApp abre con el texto listo para enviar.'
)
print(
    ' - El pie de Instagram se añade automáticamente.'
)