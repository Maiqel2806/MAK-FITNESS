from pathlib import Path
import shutil
import sys


ARCHIVO = Path("app/membresias/page.js")

BACKUP = Path(
    "app/membresias/page.js.antes-config-pagos-socios.bak"
)

MARCADOR = "MAK_CONFIG_PAGOS_SOCIOS_ADMIN_V1"


def error(mensaje):
    print("")
    print("ERROR:", mensaje)
    print("NO se modificó app/membresias/page.js")
    sys.exit(1)


def reemplazar_una(codigo, viejo, nuevo, nombre):
    cantidad = codigo.count(viejo)

    if cantidad != 1:
        error(
            f"{nombre}: se esperaba 1 coincidencia "
            f"y se encontraron {cantidad}."
        )

    return codigo.replace(
        viejo,
        nuevo,
        1,
    )


if not ARCHIVO.exists():
    error(
        "Ejecuta este script desde la raíz "
        "de gimnasio-admin."
    )


original = ARCHIVO.read_bytes()

salto = (
    "\r\n"
    if b"\r\n" in original
    else "\n"
)

codigo = (
    original
    .decode("utf-8")
    .replace("\r\n", "\n")
)


if MARCADOR in codigo:
    print("")
    print(
        "La configuración de pagos para socios "
        "ya está instalada."
    )
    sys.exit(0)


for requerido in [
    "const esAdminPagos =",
    "const [mostrarPlan, setMostrarPlan]",
    "function cerrarFormularios()",
    "Inscripción",
    "Nueva membresía",
    "{esDueno && mostrarPlan && (",
    "guardar_config_pagos_admin",
]:
    if requerido == "guardar_config_pagos_admin":
        continue

    if requerido not in codigo:
        error(
            f"Falta estructura requerida: {requerido}"
        )


# ============================================================
# 1. CONFIGURACIÓN INICIAL
# ============================================================

ancla = """const planInicial = {
"""

config_inicial = """// MAK_CONFIG_PAGOS_SOCIOS_ADMIN_V1
const configPagosSociosInicial = {
  efectivo_activo: true,
  efectivo_mensaje:
    'Realiza tu pago directamente en recepción de MAK FITNESS.',

  transferencia_activa: false,
  banco: '',
  tipo_cuenta: 'ahorros',
  numero_cuenta: '',
  titular_cuenta: '',
  identificacion_titular: '',
  transferencia_aviso_comprobante:
    'Por seguridad, conserva tu comprobante de pago. Puedes enviarlo al WhatsApp de MAK FITNESS.',

  whatsapp_gym: '0991183054',

  tarjeta_activa: false,
  tarjeta_mensaje:
    'Solicita tu link de pago para tarjeta de débito o crédito.',

  tarjeta_recargo_mensaje:
    'Los pagos con tarjeta tienen un recargo adicional correspondiente al procesamiento bancario. El valor final será informado antes de generar el link de pago.',

  tarjeta_solicitud_mensaje:
    'Quiero renovar mi membresía y pagar con tarjeta. Por favor envíame el link de pago.',
}


"""

if codigo.count(ancla) != 1:
    error(
        "No se encontró planInicial."
    )

codigo = codigo.replace(
    ancla,
    config_inicial + ancla,
    1,
)


# ============================================================
# 2. ESTADOS
# ============================================================

viejo = """  const [mostrarEditarMembresia, setMostrarEditarMembresia] = useState(false)

  const [editandoPlanId, setEditandoPlanId] = useState(null)
"""

nuevo = """  const [mostrarEditarMembresia, setMostrarEditarMembresia] = useState(false)

  const [
    mostrarConfigPagosSocios,
    setMostrarConfigPagosSocios,
  ] = useState(false)

  const [
    configPagosSocios,
    setConfigPagosSocios,
  ] = useState(
    configPagosSociosInicial
  )

  const [
    cargandoConfigPagosSocios,
    setCargandoConfigPagosSocios,
  ] = useState(false)

  const [
    guardandoConfigPagosSocios,
    setGuardandoConfigPagosSocios,
  ] = useState(false)

  const [editandoPlanId, setEditandoPlanId] = useState(null)
"""

codigo = reemplazar_una(
    codigo,
    viejo,
    nuevo,
    "Estados de pagos socios",
)


# ============================================================
# 3. CERRAR FORMULARIOS
# ============================================================

viejo = """  function cerrarFormularios() {
    setMostrarPlan(false)
    setMostrarMembresia(false)
    setMostrarInscripcion(false)
    setMostrarUpgrade(false)
    setMostrarEditarMembresia(false)
  }
"""

nuevo = """  function cerrarFormularios() {
    setMostrarPlan(false)
    setMostrarMembresia(false)
    setMostrarInscripcion(false)
    setMostrarUpgrade(false)
    setMostrarEditarMembresia(false)
    setMostrarConfigPagosSocios(false)
  }
"""

codigo = reemplazar_una(
    codigo,
    viejo,
    nuevo,
    "Cerrar formularios",
)


# ============================================================
# 4. FUNCIONES DE CONFIGURACIÓN
# ============================================================

ancla = """  function abrirNuevoPlan() {
"""

funciones = r"""  function actualizarConfigPagosSocios(
    campo,
    valor
  ) {
    setConfigPagosSocios(
      (actual) => ({
        ...actual,
        [campo]: valor,
      })
    )
  }


  async function abrirConfigPagosSocios() {
    if (!esAdminPagos) {
      setError(
        'No tienes permisos para administrar los métodos de pago de los socios.'
      )
      return
    }

    setCargandoConfigPagosSocios(true)
    setError('')
    setMensaje('')

    try {
      const {
        data,
        error: errorConfig,
      } = await supabase.rpc(
        'obtener_config_pagos_admin'
      )

      if (errorConfig) {
        throw new Error(
          errorConfig.message
        )
      }

      setConfigPagosSocios({
        ...configPagosSociosInicial,
        ...(data || {}),
      })

      cerrarFormularios()
      setMostrarConfigPagosSocios(true)

    } catch (errorConfig) {
      setError(
        errorConfig.message
      )

    } finally {
      setCargandoConfigPagosSocios(false)
    }
  }


  function cerrarConfigPagosSocios() {
    setMostrarConfigPagosSocios(false)
    setError('')
  }


  async function guardarConfigPagosSocios(
    evento
  ) {
    evento.preventDefault()

    if (!esAdminPagos) {
      return
    }

    setGuardandoConfigPagosSocios(true)
    setError('')
    setMensaje('')

    try {
      const {
        error: errorGuardar,
      } = await supabase.rpc(
        'guardar_config_pagos_admin',
        {
          p_efectivo_activo:
            Boolean(
              configPagosSocios
                .efectivo_activo
            ),

          p_efectivo_mensaje:
            String(
              configPagosSocios
                .efectivo_mensaje || ''
            ).trim(),

          p_transferencia_activa:
            Boolean(
              configPagosSocios
                .transferencia_activa
            ),

          p_banco:
            String(
              configPagosSocios
                .banco || ''
            ).trim(),

          p_tipo_cuenta:
            configPagosSocios
              .tipo_cuenta ||
            'ahorros',

          p_numero_cuenta:
            String(
              configPagosSocios
                .numero_cuenta || ''
            ).trim(),

          p_titular_cuenta:
            String(
              configPagosSocios
                .titular_cuenta || ''
            ).trim(),

          p_identificacion_titular:
            String(
              configPagosSocios
                .identificacion_titular || ''
            ).trim(),

          p_transferencia_aviso_comprobante:
            String(
              configPagosSocios
                .transferencia_aviso_comprobante ||
              ''
            ).trim(),

          p_whatsapp_gym:
            String(
              configPagosSocios
                .whatsapp_gym || ''
            ).trim(),

          p_tarjeta_activa:
            Boolean(
              configPagosSocios
                .tarjeta_activa
            ),

          p_tarjeta_mensaje:
            String(
              configPagosSocios
                .tarjeta_mensaje || ''
            ).trim(),

          p_tarjeta_recargo_mensaje:
            String(
              configPagosSocios
                .tarjeta_recargo_mensaje ||
              ''
            ).trim(),

          p_tarjeta_solicitud_mensaje:
            String(
              configPagosSocios
                .tarjeta_solicitud_mensaje ||
              ''
            ).trim(),
        }
      )

      if (errorGuardar) {
        throw new Error(
          errorGuardar.message
        )
      }

      setMostrarConfigPagosSocios(false)

      setMensaje(
        'Métodos de pago para socios actualizados correctamente.'
      )

    } catch (errorGuardar) {
      setError(
        errorGuardar.message
      )

    } finally {
      setGuardandoConfigPagosSocios(false)
    }
  }


"""

if codigo.count(ancla) != 1:
    error(
        "No se encontró abrirNuevoPlan()."
    )

codigo = codigo.replace(
    ancla,
    funciones + ancla,
    1,
)


# ============================================================
# 5. BOTÓN SUPERIOR
# ============================================================

viejo = """          <button
            onClick={abrirNuevaMembresia}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <Plus size={18} />
            Nueva membresía
          </button>
"""

nuevo = """          {esAdminPagos && (
            <button
              type="button"
              onClick={
                abrirConfigPagosSocios
              }
              disabled={
                cargandoConfigPagosSocios
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CreditCard size={18} />

              {cargandoConfigPagosSocios
                ? 'Cargando...'
                : 'Pagos socios'}
            </button>
          )}

          <button
            onClick={abrirNuevaMembresia}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <Plus size={18} />
            Nueva membresía
          </button>
"""

codigo = reemplazar_una(
    codigo,
    viejo,
    nuevo,
    "Botón Pagos socios",
)


# ============================================================
# 6. MODAL
# ============================================================

ancla = """      {esDueno && mostrarPlan && (
"""

modal = r"""      {esAdminPagos &&
        mostrarConfigPagosSocios && (

        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          onClick={
            cerrarConfigPagosSocios
          }
        >

          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl md:p-6"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="flex items-start justify-between gap-4">

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Configurar pagos de socios
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Define los métodos de pago que aparecerán en MAK Socios.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  cerrarConfigPagosSocios
                }
                className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <X size={20} />
              </button>

            </div>


            <form
              onSubmit={
                guardarConfigPagosSocios
              }
              className="mt-6 space-y-5"
            >

              <section className="rounded-2xl border border-gray-200 p-4">

                <label className="flex cursor-pointer items-center justify-between gap-4">

                  <div>
                    <p className="font-bold text-gray-900">
                      Efectivo
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Pago directamente en recepción.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      Boolean(
                        configPagosSocios
                          .efectivo_activo
                      )
                    }
                    onChange={(e) =>
                      actualizarConfigPagosSocios(
                        'efectivo_activo',
                        e.target.checked
                      )
                    }
                    className="h-5 w-5"
                  />

                </label>


                {configPagosSocios
                  .efectivo_activo && (

                  <div className="mt-4">

                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Mensaje para el socio
                    </label>

                    <textarea
                      rows={2}
                      value={
                        configPagosSocios
                          .efectivo_mensaje
                      }
                      onChange={(e) =>
                        actualizarConfigPagosSocios(
                          'efectivo_mensaje',
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    />

                  </div>
                )}

              </section>


              <section className="rounded-2xl border border-gray-200 p-4">

                <label className="flex cursor-pointer items-center justify-between gap-4">

                  <div>
                    <p className="font-bold text-gray-900">
                      Transferencia bancaria
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Muestra tus datos bancarios en MAK Socios.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      Boolean(
                        configPagosSocios
                          .transferencia_activa
                      )
                    }
                    onChange={(e) =>
                      actualizarConfigPagosSocios(
                        'transferencia_activa',
                        e.target.checked
                      )
                    }
                    className="h-5 w-5"
                  />

                </label>


                {configPagosSocios
                  .transferencia_activa && (

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Banco
                      </label>

                      <input
                        value={
                          configPagosSocios
                            .banco
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'banco',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                        placeholder="Ej: Banco Pichincha"
                      />
                    </div>


                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Tipo de cuenta
                      </label>

                      <select
                        value={
                          configPagosSocios
                            .tipo_cuenta
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'tipo_cuenta',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      >
                        <option value="ahorros">
                          Ahorros
                        </option>

                        <option value="corriente">
                          Corriente
                        </option>
                      </select>
                    </div>


                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Número de cuenta
                      </label>

                      <input
                        value={
                          configPagosSocios
                            .numero_cuenta
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'numero_cuenta',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      />
                    </div>


                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Titular
                      </label>

                      <input
                        value={
                          configPagosSocios
                            .titular_cuenta
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'titular_cuenta',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      />
                    </div>


                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Identificación del titular
                      </label>

                      <input
                        value={
                          configPagosSocios
                            .identificacion_titular
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'identificacion_titular',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      />
                    </div>


                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        WhatsApp MAK FITNESS
                      </label>

                      <input
                        value={
                          configPagosSocios
                            .whatsapp_gym
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'whatsapp_gym',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                        placeholder="0991183054"
                      />
                    </div>


                    <div className="md:col-span-2">

                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Aviso sobre comprobante
                      </label>

                      <textarea
                        rows={3}
                        value={
                          configPagosSocios
                            .transferencia_aviso_comprobante
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'transferencia_aviso_comprobante',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      />

                    </div>

                  </div>
                )}

              </section>


              <section className="rounded-2xl border border-gray-200 p-4">

                <label className="flex cursor-pointer items-center justify-between gap-4">

                  <div>
                    <p className="font-bold text-gray-900">
                      Tarjeta de débito o crédito
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      El socio solicitará el link de pago por WhatsApp.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      Boolean(
                        configPagosSocios
                          .tarjeta_activa
                      )
                    }
                    onChange={(e) =>
                      actualizarConfigPagosSocios(
                        'tarjeta_activa',
                        e.target.checked
                      )
                    }
                    className="h-5 w-5"
                  />

                </label>


                {configPagosSocios
                  .tarjeta_activa && (

                  <div className="mt-4 space-y-4">

                    <div>

                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Texto de la opción
                      </label>

                      <textarea
                        rows={2}
                        value={
                          configPagosSocios
                            .tarjeta_mensaje
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'tarjeta_mensaje',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      />

                    </div>


                    <div>

                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Aviso de recargo
                      </label>

                      <textarea
                        rows={3}
                        value={
                          configPagosSocios
                            .tarjeta_recargo_mensaje
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'tarjeta_recargo_mensaje',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm outline-none focus:border-amber-500"
                      />

                      <p className="mt-1 text-xs text-gray-500">
                        No coloques un porcentaje si el banco o procesador puede variarlo.
                      </p>

                    </div>


                    <div>

                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Mensaje que enviará el socio
                      </label>

                      <textarea
                        rows={3}
                        value={
                          configPagosSocios
                            .tarjeta_solicitud_mensaje
                        }
                        onChange={(e) =>
                          actualizarConfigPagosSocios(
                            'tarjeta_solicitud_mensaje',
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      />

                      <p className="mt-1 text-xs text-gray-500">
                        MAK Socios añadirá automáticamente el nombre y código del socio.
                      </p>

                    </div>

                  </div>
                )}

              </section>


              <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row">

                <button
                  type="submit"
                  disabled={
                    guardandoConfigPagosSocios
                  }
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={18} />

                  {guardandoConfigPagosSocios
                    ? 'Guardando...'
                    : 'Guardar configuración'}
                </button>


                <button
                  type="button"
                  onClick={
                    cerrarConfigPagosSocios
                  }
                  disabled={
                    guardandoConfigPagosSocios
                  }
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

"""

if codigo.count(ancla) != 1:
    error(
        "No se encontró el inicio del formulario de planes."
    )

codigo = codigo.replace(
    ancla,
    modal + ancla,
    1,
)


# ============================================================
# 7. VALIDACIÓN FINAL
# ============================================================

for requerido in [
    MARCADOR,
    "obtener_config_pagos_admin",
    "guardar_config_pagos_admin",
    "abrirConfigPagosSocios",
    "guardarConfigPagosSocios",
    "Pagos socios",
    "Transferencia bancaria",
    "WhatsApp MAK FITNESS",
    "Aviso de recargo",
]:
    if requerido not in codigo:
        error(
            f"Validación final falló: {requerido}"
        )


if codigo.count(MARCADOR) != 1:
    error(
        "El marcador quedó duplicado."
    )


# ============================================================
# 8. RESPALDO Y ESCRITURA
# ============================================================

if not BACKUP.exists():
    shutil.copy2(
        ARCHIVO,
        BACKUP,
    )


salida = codigo

if salto == "\r\n":
    salida = salida.replace(
        "\n",
        "\r\n",
    )


try:
    ARCHIVO.write_bytes(
        salida.encode("utf-8")
    )

except Exception as exc:
    ARCHIVO.write_bytes(
        original
    )

    error(
        f"No se pudo escribir el archivo: {exc}"
    )


print("")
print(
    "CONFIGURACIÓN DE PAGOS PARA SOCIOS APLICADA CORRECTAMENTE"
)
print("")
print(
    "Se modificó únicamente:"
)
print(
    " - app/membresias/page.js"
)
print("")
print(
    "Ahora dueño/administrador puede:"
)
print(
    " - Activar/desactivar efectivo."
)
print(
    " - Configurar transferencia bancaria."
)
print(
    " - Definir WhatsApp del gimnasio."
)
print(
    " - Activar pagos con tarjeta."
)
print(
    " - Configurar aviso de recargo."
)
print(
    " - Configurar mensaje para solicitar link."
)
print("")
print(
    "No se modificaron miembros, pagos ni membresías."
)

