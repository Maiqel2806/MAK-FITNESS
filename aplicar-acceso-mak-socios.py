from pathlib import Path
import shutil

archivo = Path("app/miembros/page.js")
backup = Path("app/miembros/page.js.antes-acceso-mak-socios.bak")

texto = archivo.read_text(encoding="utf-8")

if "MAK_ACCESO_SOCIOS_ADMIN_V1" in texto:
    print("El cambio ya está aplicado.")
    raise SystemExit(0)

shutil.copy2(archivo, backup)


def reemplazar(anterior, nuevo):
    global texto

    if anterior not in texto:
        raise RuntimeError(
            "No se encontró uno de los bloques esperados. No se modificó el archivo."
        )

    texto = texto.replace(
        anterior,
        nuevo,
        1
    )


# ============================================================
# 1. PERMISO
# ============================================================

reemplazar(
"""  const esAdminPagos = ['dueno', 'administrador'].includes(perfil?.rol)

  // MAK_PERMISOS_EMPLEADOS_ESTABLE_V3
""",
"""  const esAdminPagos = ['dueno', 'administrador'].includes(perfil?.rol)

  // MAK_ACCESO_SOCIOS_ADMIN_V1
  const puedeGestionarAccesoSocios =
    perfil?.rol === 'dueno'

  // MAK_PERMISOS_EMPLEADOS_ESTABLE_V3
"""
)


# ============================================================
# 2. ESTADOS
# ============================================================

reemplazar(
"""  const [
    errorDetalle,
    setErrorDetalle,
  ] = useState('')

  const [
    mostrarComunicado,
""",
"""  const [
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
"""
)


# ============================================================
# 3. CONSULTAR ESTADO DE CUENTA
# ============================================================

reemplazar(
"""  async function abrirDetalleMiembro(miembro) {
""",
"""  async function cargarAccesoSocios(miembroId) {
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
"""
)


# ============================================================
# 4. CONSULTAR AL ABRIR DETALLE
# ============================================================

reemplazar(
"""  async function abrirDetalleMiembro(miembro) {
    setDetalleMiembro(miembro)
    setDetalleMembresia(null)
    setErrorDetalle('')
    setCargandoDetalle(true)

    const { data, error } = await supabase
""",
"""  async function abrirDetalleMiembro(miembro) {
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
"""
)


# ============================================================
# 5. LIMPIAR AL CERRAR
# ============================================================

reemplazar(
"""  function cerrarDetalleMiembro() {
    setDetalleMiembro(null)
    setDetalleMembresia(null)
    setErrorDetalle('')
    setCargandoDetalle(false)
  }
""",
"""  function cerrarDetalleMiembro() {
    setDetalleMiembro(null)
    setDetalleMembresia(null)
    setErrorDetalle('')
    setCargandoDetalle(false)

    setAccesoSocios(null)
    setCargandoAccesoSocios(false)
    setErrorAccesoSocios('')
  }
"""
)


# ============================================================
# 6. MOSTRAR ESTADO EN EL MODAL
# ============================================================

reemplazar(
"""            {cargandoDetalle ? (
              <div className="py-8 text-center text-sm text-gray-500">
""",
"""            {puedeGestionarAccesoSocios && (
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
"""
)


archivo.write_text(
    texto,
    encoding="utf-8"
)

print("Acceso MAK Socios integrado correctamente.")
print("Backup:", backup)