'use client'

// MAK_INVITACION_DIRECTA_CEDULA_V1
import { Smartphone } from 'lucide-react'


function telefonoEcuador(valor) {
  const numero = String(valor || '').replace(/\D/g, '')

  if (/^09\d{8}$/.test(numero)) {
    return '593' + numero.slice(1)
  }

  if (/^5939\d{8}$/.test(numero)) {
    return numero
  }

  if (/^9\d{8}$/.test(numero)) {
    return '593' + numero
  }

  return ''
}

function enlacePublico() {
  const base =
    process.env.NEXT_PUBLIC_MAK_CLIENTES_URL ||
    'https://mak-socios.vercel.app'

  try {
    const url = new URL(base)

    if (url.protocol !== 'https:') {
      throw new Error('URL inválida')
    }

    return new URL('/login', url.origin).toString()
  } catch (error) {
    console.error('URL MAK Clientes inválida:', error)
    return ''
  }
}

export default function EnviarAccesoMakButton({
  nombre,
  codigo,
  telefono,
  disabled
}) {
  function enviar() {
    const numero = telefonoEcuador(telefono)

    if (!numero) {
      window.alert('Este socio no tiene un celular válido.')
      return
    }

    if (!codigo) {
      window.alert('El socio no tiene código MAK.')
      return
    }

    const enlace = enlacePublico()
    if (!enlace) return

    const mensaje = `\u{1F680}\u{1F4F1} *\u00a1MAK FITNESS AVANZA CONTIGO!*

\u00a1Hola, *${nombre || 'Socio MAK'}*! \u{1F44B}

\u00a1Tenemos una gran noticia para ti!

Ya puedes disfrutar de *MAK Clientes*, nuestra plataforma digital incluida en tu membres\u00eda.

\u{1F4AA} Consulta tus rutinas personalizadas.
\u{1F4CA} Revisa tu progreso.
\u{1F3CB}\uFE0F Consulta tu membres\u00eda.
\u{1F381} Descubre beneficios y novedades.

\u{1F510} *TUS DATOS DE ACCESO*

*Usuario:* ${codigo}
*Contrase\u00f1a:* Si todav\u00eda no la has cambiado, utiliza los 10 d\u00edgitos de tu c\u00e9dula registrada. Si ya la personalizaste, utiliza tu contrase\u00f1a actual.

\u{1F4F2} *INGRESA AQU\u00cd:*
${enlace}

\u{1F512} Por seguridad, recomendamos cambiar tu contrase\u00f1a desde Configuraci\u00f3n cuando ingreses.

Tu acceso es personal. No compartas tu contrase\u00f1a.

*MAK FITNESS*
Entrenamiento real, para resultados reales.

\u{1F4F8} S\u00edguenos en Instagram @makfitness0`

    window.location.assign(
      `https://web.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(mensaje)}`
    )
  }

  return (
    <button
      type="button"
      disabled={disabled || !codigo || !telefono}
      onClick={enviar}
      className="flex items-center justify-center gap-2 rounded-xl bg-[#02AFBB] px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Smartphone size={18}/>
      Enviar acceso MAK Clientes
    </button>
  )
}
