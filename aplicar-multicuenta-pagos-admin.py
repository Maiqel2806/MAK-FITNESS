from pathlib import Path
import shutil
import sys


ARCHIVO = Path("app/membresias/page.js")
BACKUP = Path(
    "app/membresias/page.js.antes-multicuenta-pagos.bak"
)

MARCADOR_EXISTENTE = "MAK_CONFIG_PAGOS_SOCIOS_ADMIN_V1"
MARCADOR_NUEVO = "MAK_CUENTAS_BANCARIAS_DINAMICAS_V1"


def fallo(mensaje):
    print("")
    print("ERROR:", mensaje)
    print("No se modificó app/membresias/page.js")
    sys.exit(1)


def reemplazar_uno(codigo, viejo, nuevo, nombre):
    cantidad = codigo.count(viejo)

    if cantidad != 1:
        fallo(
            f"{nombre}: se esperaba 1 coincidencia "
            f"y se encontraron {cantidad}."
        )

    return codigo.replace(
        viejo,
        nuevo,
        1,
    )


if not ARCHIVO.exists():
    fallo(
        "Ejecuta este script desde la raíz de gimnasio-admin."
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


if MARCADOR_EXISTENTE not in codigo:
    fallo(
        "No está instalada la configuración anterior "
        "de pagos socios."
    )


if MARCADOR_NUEVO in codigo:
    print("")
    print(
        "El soporte de cuentas bancarias dinámicas "
        "ya está instalado."
    )
    sys.exit(0)


# ============================================================
# 1. MODELO DE CUENTA BANCARIA
# ============================================================

ancla = """const configPagosSociosInicial = {
"""

modelo = """// MAK_CUENTAS_BANCARIAS_DINAMICAS_V1
const cuentaBancariaPagoInicial = {
  id: null,
  banco_codigo: 'pichincha',
  nombre_banco: 'Banco Pichincha',
  tipo_cuenta: 'ahorros',
  numero_cuenta: '',
  titular_cuenta: '',
  identificacion_titular: '',
  activo: true,
  orden: 1,
}


"""

if codigo.count(ancla) != 1:
    fallo(
        "No se encontró configPagosSociosInicial."
    )

codigo = codigo.replace(
    ancla,
    modelo + ancla,
    1,
)


# ============================================================
# 2. ESTADOS
# ============================================================

viejo = """  const [
    guardandoConfigPagosSocios,
    setGuardandoConfigPagosSocios,
  ] = useState(false)

  const [editandoPlanId, setEditandoPlanId] = useState(null)
"""

nuevo = """  const [
    guardandoConfigPagosSocios,
    setGuardandoConfigPagosSocios,
  ] = useState(false)

  const [
    cuentasBancariasPago,
    setCuentasBancariasPago,
  ] = useState([])

  const [
    formCuentaBancaria,
    setFormCuentaBancaria,
  ] = useState(null)

  const [
    guardandoCuentaBancaria,
    setGuardandoCuentaBancaria,
  ] = useState(false)

  const [editandoPlanId, setEditandoPlanId] = useState(null)
"""

codigo = reemplazar_uno(
    codigo,
    viejo,
    nuevo,
    "Estados multicuenta",
)


# ============================================================
# 3. FUNCIONES DE CUENTAS BANCARIAS
# ============================================================

ancla = """  async function abrirConfigPagosSocios() {
"""

funciones = r"""  function actualizarCuentaBancaria(
    campo,
    valor
  ) {
    setFormCuentaBancaria(
      (actual) => ({
        ...actual,
        [campo]: valor,
      })
    )
  }


  function cambiarBancoCuenta(
    bancoCodigo
  ) {
    let nombreBanco = ''

    if (
      bancoCodigo ===
      'pichincha'
    ) {
      nombreBanco =
        'Banco Pichincha'
    }

    if (
      bancoCodigo ===
      'guayaquil'
    ) {
      nombreBanco =
        'Banco Guayaquil'
    }

    if (
      bancoCodigo ===
      'otro'
    ) {
      nombreBanco = ''
    }

    setFormCuentaBancaria(
      (actual) => ({
        ...actual,
        banco_codigo:
          bancoCodigo,
        nombre_banco:
          nombreBanco,
      })
    )
  }


  function nuevaCuentaBancaria() {
    setFormCuentaBancaria({
      ...cuentaBancariaPagoInicial,
      orden:
        cuentasBancariasPago.length +
        1,
    })
  }


  function editarCuentaBancaria(
    cuenta
  ) {
    setFormCuentaBancaria({
      id:
        cuenta.id,

      banco_codigo:
        cuenta.banco_codigo ||
        'otro',

      nombre_banco:
        cuenta.nombre_banco ||
        '',

      tipo_cuenta:
        cuenta.tipo_cuenta ||
        'ahorros',

      numero_cuenta:
        cuenta.numero_cuenta ||
        '',

      titular_cuenta:
        cuenta.titular_cuenta ||
        '',

      identificacion_titular:
        cuenta.identificacion_titular ||
        '',

      activo:
        Boolean(
          cuenta.activo
        ),

      orden:
        Number(
          cuenta.orden || 0
        ),
    })
  }


  function cancelarCuentaBancaria() {
    setFormCuentaBancaria(null)
  }


  async function recargarCuentasBancarias() {
    const {
      data,
      error: errorCuentas,
    } = await supabase.rpc(
      'obtener_cuentas_bancarias_admin'
    )

    if (errorCuentas) {
      throw new Error(
        errorCuentas.message
      )
    }

    setCuentasBancariasPago(
      Array.isArray(data)
        ? data
        : []
    )

    return data
  }


  async function guardarCuentaBancaria(
    evento
  ) {
    evento.preventDefault()

    if (
      !esAdminPagos ||
      !formCuentaBancaria
    ) {
      return
    }

    setGuardandoCuentaBancaria(true)
    setError('')
    setMensaje('')

    try {
      const {
        error: errorGuardar,
      } = await supabase.rpc(
        'guardar_cuenta_bancaria_admin',
        {
          p_id:
            formCuentaBancaria.id ||
            null,

          p_banco_codigo:
            String(
              formCuentaBancaria
                .banco_codigo ||
              'otro'
            ).trim(),

          p_nombre_banco:
            String(
              formCuentaBancaria
                .nombre_banco ||
              ''
            ).trim(),

          p_tipo_cuenta:
            formCuentaBancaria
              .tipo_cuenta ||
            'ahorros',

          p_numero_cuenta:
            String(
              formCuentaBancaria
                .numero_cuenta ||
              ''
            ).trim(),

          p_titular_cuenta:
            String(
              formCuentaBancaria
                .titular_cuenta ||
              ''
            ).trim(),

          p_identificacion_titular:
            String(
              formCuentaBancaria
                .identificacion_titular ||
              ''
            ).trim(),

          p_activo:
            Boolean(
              formCuentaBancaria
                .activo
            ),

          p_orden:
            Number(
              formCuentaBancaria
                .orden || 0
            ),
        }
      )

      if (errorGuardar) {
        throw new Error(
          errorGuardar.message
        )
      }

      await recargarCuentasBancarias()

      setFormCuentaBancaria(null)

      setMensaje(
        'Cuenta bancaria guardada correctamente.'
      )

    } catch (errorGuardar) {
      setError(
        errorGuardar.message
      )

    } finally {
      setGuardandoCuentaBancaria(false)
    }
  }


"""

if codigo.count(ancla) != 1:
    fallo(
        "No se encontró abrirConfigPagosSocios()."
    )

codigo = codigo.replace(
    ancla,
    funciones + ancla,
    1,
)


# ============================================================
# 4. CARGAR CONFIG + CUENTAS AL ABRIR
# ============================================================

viejo = """    try {
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
"""

nuevo = """    try {
      const [
        respuestaConfig,
        respuestaCuentas,
      ] = await Promise.all([
        supabase.rpc(
          'obtener_config_pagos_admin'
        ),

        supabase.rpc(
          'obtener_cuentas_bancarias_admin'
        ),
      ])

      if (
        respuestaConfig.error
      ) {
        throw new Error(
          respuestaConfig
            .error
            .message
        )
      }

      if (
        respuestaCuentas.error
      ) {
        throw new Error(
          respuestaCuentas
            .error
            .message
        )
      }

      setConfigPagosSocios({
        ...configPagosSociosInicial,
        ...(respuestaConfig.data || {}),
      })

      setCuentasBancariasPago(
        Array.isArray(
          respuestaCuentas.data
        )
          ? respuestaCuentas.data
          : []
      )

      setFormCuentaBancaria(null)

      cerrarFormularios()
      setMostrarConfigPagosSocios(true)
"""

codigo = reemplazar_uno(
    codigo,
    viejo,
    nuevo,
    "Carga de configuración multicuenta",
)


# ============================================================
# 5. YA NO ENVIAMOS BANCO ÚNICO A CONFIG GENERAL
# ============================================================

reemplazos = {
"""          p_banco:
            String(
              configPagosSocios
                .banco || ''
            ).trim(),
""":
"""          p_banco: '',
""",

"""          p_tipo_cuenta:
            configPagosSocios
              .tipo_cuenta ||
            'ahorros',
""":
"""          p_tipo_cuenta: 'ahorros',
""",

"""          p_numero_cuenta:
            String(
              configPagosSocios
                .numero_cuenta || ''
            ).trim(),
""":
"""          p_numero_cuenta: '',
""",

"""          p_titular_cuenta:
            String(
              configPagosSocios
                .titular_cuenta || ''
            ).trim(),
""":
"""          p_titular_cuenta: '',
""",

"""          p_identificacion_titular:
            String(
              configPagosSocios
                .identificacion_titular || ''
            ).trim(),
""":
"""          p_identificacion_titular: '',
""",
}

for viejo, nuevo in reemplazos.items():
    codigo = reemplazar_uno(
        codigo,
        viejo,
        nuevo,
        "Parámetro legado de cuenta única",
    )


# ============================================================
# 6. REEMPLAZAR BLOQUE VISUAL DE TRANSFERENCIA
# ============================================================

inicio = codigo.find(
    """              <section className="rounded-2xl border border-gray-200 p-4">

                <label className="flex cursor-pointer items-center justify-between gap-4">

                  <div>
                    <p className="font-bold text-gray-900">
                      Transferencia bancaria
"""
)

if inicio == -1:
    fallo(
        "No se encontró el bloque actual "
        "de Transferencia bancaria."
    )


fin = codigo.find(
    """              <section className="rounded-2xl border border-gray-200 p-4">

                <label className="flex cursor-pointer items-center justify-between gap-4">

                  <div>
                    <p className="font-bold text-gray-900">
                      Tarjeta de débito o crédito
""",
    inicio,
)

if fin == -1:
    fallo(
        "No se encontró el inicio del bloque "
        "de pago con tarjeta."
    )


bloque_transferencia = r"""              <section className="rounded-2xl border border-gray-200 p-4">

                <label className="flex cursor-pointer items-center justify-between gap-4">

                  <div>
                    <p className="font-bold text-gray-900">
                      Transferencia / depósito
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Permite al socio elegir entre las cuentas bancarias activas.
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


                <div className="mt-5 border-t border-gray-100 pt-5">

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <p className="font-semibold text-gray-900">
                        Cuentas bancarias
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Puedes tener varias cuentas y decidir cuáles mostrar en MAK Socios.
                      </p>

                    </div>


                    <button
                      type="button"
                      onClick={
                        nuevaCuentaBancaria
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
                    >
                      <Plus size={17} />
                      Agregar cuenta
                    </button>

                  </div>


                  <div className="mt-4 space-y-3">

                    {cuentasBancariasPago
                      .length === 0 && (

                      <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                        Todavía no existen cuentas bancarias.
                      </div>

                    )}


                    {cuentasBancariasPago
                      .map((cuenta) => (

                      <div
                        key={
                          cuenta.id
                        }
                        className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <p className="font-bold text-gray-900">
                              {cuenta.nombre_banco}
                            </p>

                            <span
                              className={
                                cuenta.activo
                                  ? 'rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700'
                                  : 'rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-600'
                              }
                            >
                              {cuenta.activo
                                ? 'Activa'
                                : 'Inactiva'}
                            </span>

                          </div>


                          <p className="mt-1 text-sm capitalize text-gray-500">
                            Cuenta {cuenta.tipo_cuenta}
                            {' · '}
                            ••••
                            {String(
                              cuenta.numero_cuenta ||
                              ''
                            ).slice(-4)}
                          </p>


                          <p className="mt-1 text-xs text-gray-400">
                            Orden de visualización: {cuenta.orden}
                          </p>

                        </div>


                        <button
                          type="button"
                          onClick={() =>
                            editarCuentaBancaria(
                              cuenta
                            )
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                        >
                          <Pencil size={16} />
                          Editar
                        </button>

                      </div>

                    ))}

                  </div>


                  {formCuentaBancaria && (

                    <form
                      onSubmit={
                        guardarCuentaBancaria
                      }
                      className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50/40 p-4"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <h3 className="font-bold text-gray-900">
                            {formCuentaBancaria.id
                              ? 'Editar cuenta bancaria'
                              : 'Agregar cuenta bancaria'}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            Los datos activos serán visibles para los socios.
                          </p>

                        </div>


                        <button
                          type="button"
                          onClick={
                            cancelarCuentaBancaria
                          }
                          className="rounded-lg p-2 text-gray-500 hover:bg-white"
                        >
                          <X size={18} />
                        </button>

                      </div>


                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">

                        <div>

                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Banco
                          </label>

                          <select
                            value={
                              formCuentaBancaria
                                .banco_codigo
                            }
                            onChange={(e) =>
                              cambiarBancoCuenta(
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                          >
                            <option value="pichincha">
                              Banco Pichincha
                            </option>

                            <option value="guayaquil">
                              Banco Guayaquil
                            </option>

                            <option value="otro">
                              Otro banco
                            </option>
                          </select>

                        </div>


                        <div>

                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Nombre del banco
                          </label>

                          <input
                            value={
                              formCuentaBancaria
                                .nombre_banco
                            }
                            onChange={(e) =>
                              actualizarCuentaBancaria(
                                'nombre_banco',
                                e.target.value
                              )
                            }
                            disabled={
                              formCuentaBancaria
                                .banco_codigo !==
                              'otro'
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none disabled:bg-gray-100 focus:border-black"
                          />

                        </div>


                        <div>

                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Tipo de cuenta
                          </label>

                          <select
                            value={
                              formCuentaBancaria
                                .tipo_cuenta
                            }
                            onChange={(e) =>
                              actualizarCuentaBancaria(
                                'tipo_cuenta',
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
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
                              formCuentaBancaria
                                .numero_cuenta
                            }
                            onChange={(e) =>
                              actualizarCuentaBancaria(
                                'numero_cuenta',
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                            placeholder="Número de cuenta"
                          />

                        </div>


                        <div>

                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Titular
                          </label>

                          <input
                            value={
                              formCuentaBancaria
                                .titular_cuenta
                            }
                            onChange={(e) =>
                              actualizarCuentaBancaria(
                                'titular_cuenta',
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                            placeholder="Nombre del titular"
                          />

                        </div>


                        <div>

                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Identificación
                          </label>

                          <input
                            value={
                              formCuentaBancaria
                                .identificacion_titular
                            }
                            onChange={(e) =>
                              actualizarCuentaBancaria(
                                'identificacion_titular',
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                            placeholder="Cédula o RUC"
                          />

                        </div>


                        <div>

                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Orden
                          </label>

                          <input
                            type="number"
                            min="0"
                            value={
                              formCuentaBancaria
                                .orden
                            }
                            onChange={(e) =>
                              actualizarCuentaBancaria(
                                'orden',
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                          />

                        </div>


                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">

                          <input
                            type="checkbox"
                            checked={
                              Boolean(
                                formCuentaBancaria
                                  .activo
                              )
                            }
                            onChange={(e) =>
                              actualizarCuentaBancaria(
                                'activo',
                                e.target.checked
                              )
                            }
                            className="h-5 w-5"
                          />

                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              Cuenta activa
                            </p>

                            <p className="text-xs text-gray-500">
                              Mostrar esta cuenta a los socios.
                            </p>
                          </div>

                        </label>

                      </div>


                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">

                        <button
                          type="submit"
                          disabled={
                            guardandoCuentaBancaria
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
                        >
                          <Save size={17} />

                          {guardandoCuentaBancaria
                            ? 'Guardando...'
                            : 'Guardar cuenta'}
                        </button>


                        <button
                          type="button"
                          onClick={
                            cancelarCuentaBancaria
                          }
                          disabled={
                            guardandoCuentaBancaria
                          }
                          className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>

                      </div>

                    </form>

                  )}


                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">

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

                </div>

              </section>


"""

codigo = (
    codigo[:inicio]
    + bloque_transferencia
    + codigo[fin:]
)


# ============================================================
# 7. VALIDACIONES
# ============================================================

for requerido in [
    MARCADOR_NUEVO,
    "obtener_cuentas_bancarias_admin",
    "guardar_cuenta_bancaria_admin",
    "cuentasBancariasPago",
    "formCuentaBancaria",
    "Agregar cuenta",
    "Banco Guayaquil",
    "Cuenta activa",
    "guardarCuentaBancaria",
]:
    if requerido not in codigo:
        fallo(
            f"Validación final falló: {requerido}"
        )


# Evita formularios HTML anidados.
# El formulario de cuenta está dentro del modal, pero el
# formulario global comienza más arriba. Para evitar submit
# cruzado cambiamos el form global por div y guardado manual.

viejo = """            <form
              onSubmit={
                guardarConfigPagosSocios
              }
              className="mt-6 space-y-5"
            >
"""

nuevo = """            <div
              className="mt-6 space-y-5"
            >
"""

codigo = reemplazar_uno(
    codigo,
    viejo,
    nuevo,
    "Contenedor principal configuración",
)


viejo = """                <button
                  type="submit"
                  disabled={
                    guardandoConfigPagosSocios
                  }
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
"""

nuevo = """                <button
                  type="button"
                  onClick={
                    guardarConfigPagosSocios
                  }
                  disabled={
                    guardandoConfigPagosSocios
                  }
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
"""

codigo = reemplazar_uno(
    codigo,
    viejo,
    nuevo,
    "Botón guardar configuración",
)


# guardarConfigPagosSocios antes esperaba submit event.
viejo = """  async function guardarConfigPagosSocios(
    evento
  ) {
    evento.preventDefault()

    if (!esAdminPagos) {
"""

nuevo = """  async function guardarConfigPagosSocios() {
    if (!esAdminPagos) {
"""

codigo = reemplazar_uno(
    codigo,
    viejo,
    nuevo,
    "Guardar configuración sin formulario",
)


# Cierre del antiguo form global.
# Buscamos el que está justo antes del cierre principal del modal.
viejo = """            </form>

          </div>

        </div>
      )}

      {esDueno && mostrarPlan && (
"""

nuevo = """            </div>

          </div>

        </div>
      )}

      {esDueno && mostrarPlan && (
"""

codigo = reemplazar_uno(
    codigo,
    viejo,
    nuevo,
    "Cierre contenedor configuración",
)


# ============================================================
# 8. RESPALDO + ESCRITURA
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

    fallo(
        f"No se pudo guardar: {exc}"
    )


print("")
print(
    "CUENTAS BANCARIAS DINÁMICAS APLICADAS CORRECTAMENTE"
)
print("")
print(
    "Ahora Pagos socios permite:"
)
print(
    " - Ver todas las cuentas bancarias."
)
print(
    " - Agregar Banco Pichincha."
)
print(
    " - Agregar Banco Guayaquil."
)
print(
    " - Agregar otros bancos."
)
print(
    " - Editar datos."
)
print(
    " - Activar o desactivar cada cuenta."
)
print(
    " - Definir el orden de aparición."
)
print("")
print(
    "La cuenta Pichincha existente no fue modificada."
)
print(
    "No se modificó mak-socios-app."
)
print(
    "No se modificó Supabase desde este script."
)
