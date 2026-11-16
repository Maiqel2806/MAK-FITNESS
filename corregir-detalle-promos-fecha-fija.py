from pathlib import Path
import shutil
import sys

PATH = Path('app/miembros/page.js')

MARKER = 'MAK_DETALLE_PROMO_FECHA_FIJA_V1'


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
        'La corrección del detalle '
        'de promociones ya está aplicada.'
    )
    sys.exit(0)


for required in [
    'MAK_PROMOS_FECHA_FIJA_MIEMBROS_V1',
    'function crearMensajeWhatsAppDetalle',
    'async function abrirDetalleMiembro',
    'Próxima renovación',
]:
    if required not in text:
        fail(
            f'Falta estructura requerida: '
            f'{required}'
        )


# ============================================================
# 1. TRAER MODALIDAD Y FECHA FINAL SNAPSHOT
# ============================================================

old = """        plan_nombre_snapshot,
        plan_precio_snapshot,
        created_at
"""

new = """        plan_nombre_snapshot,
        plan_precio_snapshot,
        plan_modalidad_vigencia_snapshot,
        plan_vigencia_desde_snapshot,
        plan_vigencia_hasta_snapshot,
        created_at
"""

text = replace_once(
    text,
    old,
    new,
    'Select detalle membresía',
)


# ============================================================
# 2. HELPER
# ============================================================

anchor = """  function enviarDetallePorWhatsApp() {
"""

helper = """  // MAK_DETALLE_PROMO_FECHA_FIJA_V1
  function esPromoFechaFijaDetalle(
    membresia
  ) {
    return (
      membresia
        ?.plan_modalidad_vigencia_snapshot ===
      'fecha_fija'
    )
  }

"""

if text.count(anchor) != 1:
    fail(
        'No se encontró '
        'enviarDetallePorWhatsApp().'
    )

text = text.replace(
    anchor,
    helper + anchor,
    1,
)


# ============================================================
# 3. WHATSAPP
#
# Plan normal:
# fecha_fin + 1 = próxima renovación
#
# Promo fecha fija:
# fecha_fin = último día real de vigencia
# ============================================================

old = """    const fechaRenovacion =
      sumarDiasDetalle(
        detalleMembresia.fecha_fin,
        1
      )
"""

new = """    const fechaRenovacion =
      esPromoFechaFijaDetalle(
        detalleMembresia
      )
        ? detalleMembresia.fecha_fin
        : sumarDiasDetalle(
            detalleMembresia.fecha_fin,
            1
          )
"""

text = replace_once(
    text,
    old,
    new,
    'WhatsApp fecha de vigencia',
)


# ============================================================
# 4. DETALLE VISUAL
# ============================================================

old = """                  <div>
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
"""

new = """                  <div>
                    <p className="text-xs text-gray-500">
                      {esPromoFechaFijaDetalle(
                        detalleMembresia
                      )
                        ? 'Fin de vigencia'
                        : 'Próxima renovación'}
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">

                      {formatearFechaDetalle(
                        esPromoFechaFijaDetalle(
                          detalleMembresia
                        )
                          ? detalleMembresia.fecha_fin
                          : sumarDiasDetalle(
                              detalleMembresia.fecha_fin,
                              1
                            )
                      )}

                    </p>
                  </div>
"""

text = replace_once(
    text,
    old,
    new,
    'Detalle próxima renovación',
)


# ============================================================
# 5. VALIDACIONES
# ============================================================

if text.count(MARKER) != 1:
    fail(
        'Marcador final duplicado o ausente.'
    )


if (
    'MAK_PROMOS_FECHA_FIJA_MIEMBROS_V1'
    not in text
):
    fail(
        'Se perdió la integración '
        'de promociones fecha fija.'
    )


if (
    'registrar_membresia_con_pagos'
    not in text
):
    fail(
        'Se perdió el registro seguro '
        'de membresías.'
    )


if (
    'RESULTADOS_POR_PAGINA = 10'
    not in text
):
    fail(
        'Se perdió la paginación.'
    )


if (
    text.count(
        'plan_modalidad_vigencia_snapshot'
    ) < 2
):
    fail(
        'La modalidad snapshot '
        'no quedó integrada correctamente.'
    )


# ============================================================
# 6. RESPALDO
# ============================================================

backup = PATH.with_name(
    PATH.name +
    '.antes-detalle-promos-fecha-fija.bak'
)


if not backup.exists():
    shutil.copy2(
        PATH,
        backup,
    )


# ============================================================
# 7. ESCRITURA
# ============================================================

try:

    if newline == '\r\n':
        output = text.replace(
            '\n',
            '\r\n'
        )
    else:
        output = text

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
    'DETALLE DE PROMOCIONES '
    'CORREGIDO CORRECTAMENTE'
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
    'Cambios:'
)
print(
    ' - Promoción fecha fija muestra Fin de vigencia.'
)
print(
    ' - Usa la fecha final real de la promoción.'
)
print(
    ' - WhatsApp usa la fecha final real.'
)
print(
    ' - Planes normales conservan Próxima renovación.'
)