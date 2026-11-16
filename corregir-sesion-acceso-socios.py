from pathlib import Path
import shutil

archivo = Path("app/miembros/page.js")
backup = Path(
    "app/miembros/page.js.antes-corregir-sesion-socios.bak"
)

texto = archivo.read_text(
    encoding="utf-8"
)

anterior = """      const {
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
"""

nuevo = """      const {
        data: sesionActual,
      } =
        await supabase.auth.getSession()

      if (!sesionActual?.session) {
        throw new Error(
          'Sesión administrativa no válida.'
        )
      }

      const {
        data: sesionRefrescada,
        error: errorRefresco,
      } =
        await supabase.auth.refreshSession()

      if (
        errorRefresco ||
        !sesionRefrescada?.session?.access_token
      ) {
        throw new Error(
          'Sesión administrativa no válida.'
        )
      }

      const token =
        sesionRefrescada.session.access_token
"""

cantidad = texto.count(anterior)

if cantidad != 1:
    raise RuntimeError(
        f"Esperaba encontrar 1 bloque de sesión y encontré {cantidad}. "
        "No se modificó el archivo."
    )

shutil.copy2(
    archivo,
    backup
)

texto = texto.replace(
    anterior,
    nuevo,
    1
)

archivo.write_text(
    texto,
    encoding="utf-8"
)

print(
    "Sesión de Acceso MAK Socios corregida correctamente."
)
print(
    "Backup:",
    backup
)