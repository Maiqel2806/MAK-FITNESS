'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Search,
  Save,
  UserRound,
  CalendarCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'

const supabase = createClient()

function obtenerFechaHoy() {
  const hoy = new Date()
  const year = hoy.getFullYear()
  const month = String(hoy.getMonth() + 1).padStart(2, '0')
  const day = String(hoy.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function crearInicioDiaISO(fecha) {
  return new Date(`${fecha}T00:00:00`).toISOString()
}

function crearFinDiaISO(fecha) {
  return new Date(`${fecha}T23:59:59`).toISOString()
}

function diferenciaDias(fechaDesde, fechaHasta) {
  const inicio = new Date(`${fechaDesde}T00:00:00`)
  const fin = new Date(`${fechaHasta}T00:00:00`)
  return Math.round((fin - inicio) / (1000 * 60 * 60 * 24))
}

function formatearFecha(fecha) {
  if (!fecha) return '-'

  const texto = String(fecha)

  if (texto.includes('T')) {
    const date = new Date(texto)

    return date.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const [year, month, day] = texto.split('-')
  return `${day}/${month}/${year}`
}

function formatearFechaHora(fecha) {
  if (!fecha) return '-'

  const date = new Date(fecha)

  return date.toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function obtenerNombrePlan(membresia) {
  return (
    membresia?.plan_nombre_snapshot ||
    membresia?.planes?.nombre ||
    'Plan registrado'
  )
}

function obtenerEstadoMembresia(membresias) {
  const hoy = obtenerFechaHoy()

  const suspendidaActual = membresias.find((membresia) => {
    return (
      membresia.estado === 'suspendida' &&
      membresia.fecha_inicio <= hoy &&
      membresia.fecha_fin >= hoy
    )
  })

  if (suspendidaActual) {
    return {
      autorizado: false,
      tipo: 'suspendida',
      titulo: 'Membresía suspendida',
      mensaje: 'El socio tiene una membresía suspendida. No se permite registrar entrada.',
      membresia: suspendidaActual,
    }
  }

  const vigente = membresias
    .filter((membresia) => {
      return (
        membresia.estado === 'activa' &&
        membresia.fecha_inicio <= hoy &&
        membresia.fecha_fin >= hoy
      )
    })
    .sort((a, b) => String(b.fecha_fin).localeCompare(String(a.fecha_fin)))[0]

  if (vigente) {
    const diasRestantes = diferenciaDias(hoy, vigente.fecha_fin)

    if (diasRestantes === 0) {
      return {
        autorizado: true,
        tipo: 'vence_hoy',
        titulo: 'Membresía vigente, vence hoy',
        mensaje: 'El socio puede ingresar hoy. Recuerda informar que su membresía vence hoy.',
        membresia: vigente,
      }
    }

    if (diasRestantes <= 7) {
      return {
        autorizado: true,
        tipo: 'por_caducar',
        titulo: 'Membresía vigente, por caducar',
        mensaje: `El socio puede ingresar. Su membresía vence en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}.`,
        membresia: vigente,
      }
    }

    return {
      autorizado: true,
      tipo: 'vigente',
      titulo: 'Membresía vigente',
      mensaje: `El socio puede ingresar. Su membresía vence el ${formatearFecha(vigente.fecha_fin)}.`,
      membresia: vigente,
    }
  }

  const futura = membresias
    .filter((membresia) => {
      return (
        membresia.estado === 'activa' &&
        membresia.fecha_inicio > hoy
      )
    })
    .sort((a, b) => String(a.fecha_inicio).localeCompare(String(b.fecha_inicio)))[0]

  if (futura) {
    return {
      autorizado: false,
      tipo: 'futura',
      titulo: 'Membresía futura',
      mensaje: `El socio tiene una membresía registrada, pero inicia el ${formatearFecha(futura.fecha_inicio)}.`,
      membresia: futura,
    }
  }

  const ultima = membresias
    .filter((membresia) => membresia.estado !== 'suspendida')
    .sort((a, b) => String(b.fecha_fin).localeCompare(String(a.fecha_fin)))[0]

  if (ultima) {
    return {
      autorizado: false,
      tipo: 'vencida',
      titulo: 'Membresía vencida',
      mensaje: `La última membresía venció el ${formatearFecha(ultima.fecha_fin)}. Debe renovar antes de ingresar.`,
      membresia: ultima,
    }
  }

  return {
    autorizado: false,
    tipo: 'sin_membresia',
    titulo: 'Sin membresía',
    mensaje: 'El socio no tiene una membresía registrada. Debe registrar una membresía antes de ingresar.',
    membresia: null,
  }
}

function obtenerClaseEstado(tipo) {
  if (tipo === 'vigente') return 'border-green-200 bg-green-50 text-green-800'
  if (tipo === 'por_caducar') return 'border-orange-200 bg-orange-50 text-orange-800'
  if (tipo === 'vence_hoy') return 'border-yellow-200 bg-yellow-50 text-yellow-800'
  if (tipo === 'vencida') return 'border-red-200 bg-red-50 text-red-800'
  if (tipo === 'suspendida') return 'border-gray-300 bg-gray-100 text-gray-800'
  return 'border-red-200 bg-red-50 text-red-800'
}

export default function AsistenciaPage() {
  const codigoInputRef = useRef(null)

  const [codigo, setCodigo] = useState('')
  const [miembro, setMiembro] = useState(null)
  const [membresias, setMembresias] = useState([])
  const [asistenciasHoy, setAsistenciasHoy] = useState([])
  const [observacion, setObservacion] = useState('')

  const [buscando, setBuscando] = useState(false)
  const [registrando, setRegistrando] = useState(false)
  const [cargandoHistorial, setCargandoHistorial] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [bienvenida, setBienvenida] = useState(null)

  useEffect(() => {
    cargarAsistenciasHoy()

    setTimeout(() => {
      codigoInputRef.current?.focus()
    }, 200)
  }, [])

  async function cargarAsistenciasHoy() {
    setCargandoHistorial(true)

    const hoy = obtenerFechaHoy()
    const inicioISO = crearInicioDiaISO(hoy)
    const finISO = crearFinDiaISO(hoy)

    const { data, error } = await supabase
      .from('asistencia')
      .select(`
        *,
        miembros (
          id,
          nombre,
          apellido,
          codigo_acceso,
          telefono,
          foto_url
        ),
        membresias (
          id,
          fecha_inicio,
          fecha_fin,
          plan_nombre_snapshot,
          planes (
            id,
            nombre
          )
        )
      `)
      .gte('fecha_entrada', inicioISO)
      .lte('fecha_entrada', finISO)
      .order('fecha_entrada', { ascending: false })

    if (error) {
      setAsistenciasHoy([])
    } else {
      setAsistenciasHoy(data || [])
    }

    setCargandoHistorial(false)
  }

  function limpiarCodigo(valor) {
    return String(valor || '')
      .replace(/\D/g, '')
      .slice(0, 5)
  }

  function limpiarParaSiguienteSocio() {
    setBienvenida(null)
    setCodigo('')
    setMiembro(null)
    setMembresias([])
    setObservacion('')
    setError('')
    setMensaje('')

    setTimeout(() => {
      codigoInputRef.current?.focus()
    }, 100)
  }

  async function buscarMiembro(evento) {
    evento.preventDefault()

    const codigoLimpio = limpiarCodigo(codigo)

    setBuscando(true)
    setError('')
    setMensaje('')
    setBienvenida(null)
    setMiembro(null)
    setMembresias([])
    setObservacion('')

    if (!codigoLimpio || codigoLimpio.length !== 5) {
      setError('Ingresa el código de 5 dígitos del socio.')
      setBuscando(false)
      return
    }

    const { data: miembroEncontrado, error: errorMiembro } = await supabase
      .from('miembros')
      .select('*')
      .eq('codigo_acceso', codigoLimpio)
      .maybeSingle()

    if (errorMiembro) {
      setError(errorMiembro.message)
      setBuscando(false)
      return
    }

    if (!miembroEncontrado) {
      setError('No se encontró un miembro con ese código.')
      setBuscando(false)
      return
    }

    const { data: membresiasEncontradas, error: errorMembresias } = await supabase
      .from('membresias')
      .select(`
        *,
        planes (
          id,
          nombre,
          precio,
          duracion_dias
        )
      `)
      .eq('miembro_id', miembroEncontrado.id)
      .order('fecha_fin', { ascending: false })

    if (errorMembresias) {
      setError(errorMembresias.message)
      setBuscando(false)
      return
    }

    setMiembro(miembroEncontrado)
    setMembresias(membresiasEncontradas || [])
    setBuscando(false)
  }

  async function registrarEntrada() {
    if (!miembro) return

    setRegistrando(true)
    setError('')
    setMensaje('')

    const estado = obtenerEstadoMembresia(membresias)

    if (miembro.estado !== 'activo') {
      setError('El miembro no está activo. No se puede registrar entrada.')
      setRegistrando(false)
      return
    }

    if (!miembro.foto_url) {
      setError('El socio no tiene foto registrada. Primero registra su foto para poder validar visualmente.')
      setRegistrando(false)
      return
    }

    if (!estado.autorizado) {
      setError(estado.mensaje)
      setRegistrando(false)
      return
    }

    const { error } = await supabase.rpc('registrar_asistencia_validada', {
      p_miembro_id: miembro.id,
      p_origen_registro: 'manual',
      p_metodo_verificacion: 'foto_verificacion_visual',
      p_verificado_visualmente: true,
      p_observacion: observacion || null,
    })

    if (error) {
      setError(error.message)
      setRegistrando(false)
      return
    }

    await cargarAsistenciasHoy()

    const ahora = new Date()

    setBienvenida({
      nombre: `${miembro.nombre} ${miembro.apellido}`,
      codigo: miembro.codigo_acceso || '',
      hora: ahora.toLocaleTimeString('es-EC', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      plan: obtenerNombrePlan(estado.membresia),
      vence: estado.membresia?.fecha_fin || null,
    })

    setMensaje('Entrada registrada correctamente. El socio puede ingresar.')
    setObservacion('')
    setRegistrando(false)
  }

  const estadoMiembro = useMemo(() => {
    if (!miembro) return null

    if (miembro.estado !== 'activo') {
      return {
        autorizado: false,
        tipo: 'miembro_inactivo',
        titulo: 'Miembro no activo',
        mensaje: `El estado actual del miembro es "${miembro.estado}". No se permite registrar entrada.`,
        membresia: null,
      }
    }

    if (!miembro.foto_url) {
      return {
        autorizado: false,
        tipo: 'sin_foto',
        titulo: 'Foto pendiente',
        mensaje: 'El socio no tiene foto registrada. Registra la foto antes de permitir el ingreso.',
        membresia: null,
      }
    }

    return obtenerEstadoMembresia(membresias)
  }, [miembro, membresias])

  const resumenHoy = useMemo(() => {
    const sociosDistintos = new Set(
      asistenciasHoy.map((asistencia) => asistencia.miembro_id)
    )

    return {
      entradas: asistenciasHoy.length,
      sociosDistintos: sociosDistintos.size,
    }
  }, [asistenciasHoy])

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Asistencia</h1>
          <p className="mt-2 text-gray-600">
            Registra entradas verificadas usando el código único del socio.
          </p>
        </div>

        <button
          onClick={cargarAsistenciasHoy}
          disabled={cargandoHistorial}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={18} />
          {cargandoHistorial ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {mensaje}
        </div>
      )}

      {bienvenida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <CheckCircle size={36} className="text-green-700" />
            </div>

            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              Bienvenido
            </h2>

            <p className="mt-2 text-xl font-bold text-gray-900">
              {bienvenida.nombre}
            </p>

            {bienvenida.codigo && (
              <p className="mt-1 text-sm text-gray-500">
                Código: {bienvenida.codigo}
              </p>
            )}

            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-left">
              <p className="text-sm font-semibold text-green-800">
                Entrada registrada correctamente
              </p>

              <p className="mt-1 text-sm text-green-700">
                Hora de ingreso: {bienvenida.hora}
              </p>

              <p className="mt-1 text-sm text-green-700">
                Plan: {bienvenida.plan}
              </p>

              {bienvenida.vence && (
                <p className="mt-1 text-sm text-green-700">
                  Membresía válida hasta: {formatearFecha(bienvenida.vence)}
                </p>
              )}
            </div>

            <p className="mt-5 text-sm font-semibold text-gray-700">
              Puede ingresar al gimnasio.
            </p>

            <button
              onClick={limpiarParaSiguienteSocio}
              className="mt-5 w-full rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Aceptar y registrar siguiente socio
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Entradas de hoy</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {cargandoHistorial ? '-' : resumenHoy.entradas}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Socios distintos</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {cargandoHistorial ? '-' : resumenHoy.sociosDistintos}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Tipo de control</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            Código + foto
          </h2>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900">Validar socio</h2>
          <p className="mt-1 text-sm text-gray-500">
            Busca por código único de 5 dígitos, verifica la foto y confirma la entrada.
          </p>

          <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-900">
            <div className="flex gap-3">
              <AlertTriangle size={22} />

              <div>
                <h3 className="font-bold">Regla de control</h3>

                <p className="mt-1 text-sm">
                  El código de 5 dígitos sirve para localizar al socio sin usar su cédula. La entrada sigue validándose con foto, estado activo y membresía vigente.
                </p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={buscarMiembro} className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              ref={codigoInputRef}
              value={codigo}
              onChange={(e) => setCodigo(limpiarCodigo(e.target.value))}
              inputMode="numeric"
              maxLength={5}
              className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-lg font-bold tracking-widest outline-none focus:border-black"
              placeholder="Código del socio"
            />
          </div>

          <button
            type="submit"
            disabled={buscando}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Search size={18} />
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {miembro && estadoMiembro && (
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-white">
                {miembro.foto_url ? (
                  <img
                    src={miembro.foto_url}
                    alt="Foto del socio"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <UserRound size={48} />
                    <span className="mt-2 text-sm">Sin foto</span>
                  </div>
                )}
              </div>

              <div className="mt-4 text-center">
                <h3 className="text-xl font-bold text-gray-900">
                  {miembro.nombre} {miembro.apellido}
                </h3>

                <p className="mt-1 text-sm font-semibold text-gray-700">
                  Código: {miembro.codigo_acceso}
                </p>

                <span
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    miembro.estado === 'activo'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {miembro.estado}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className={`rounded-2xl border p-5 ${obtenerClaseEstado(estadoMiembro.tipo)}`}>
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    {estadoMiembro.autorizado ? (
                      <CheckCircle size={24} />
                    ) : (
                      <XCircle size={24} />
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold">
                      {estadoMiembro.titulo}
                    </h3>

                    <p className="mt-1 text-sm">
                      {estadoMiembro.mensaje}
                    </p>
                  </div>
                </div>
              </div>

              {estadoMiembro.membresia && (
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h3 className="font-bold text-gray-900">Detalle de membresía</h3>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500">Plan</p>
                      <p className="mt-1 font-bold text-gray-900">
                        {obtenerNombrePlan(estadoMiembro.membresia)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500">Inicio</p>
                      <p className="mt-1 font-bold text-gray-900">
                        {formatearFecha(estadoMiembro.membresia.fecha_inicio)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500">Vence</p>
                      <p className="mt-1 font-bold text-gray-900">
                        {formatearFecha(estadoMiembro.membresia.fecha_fin)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Observación opcional
                </label>

                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  className="min-h-20 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Ej: Validado con foto del sistema"
                />

                <button
                  onClick={registrarEntrada}
                  disabled={registrando || !estadoMiembro.autorizado}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={18} />
                  {registrando ? 'Registrando...' : 'Registrar entrada verificada'}
                </button>

                <p className="mt-3 text-xs text-gray-500">
                  Este registro no consume días ni modifica la vigencia de la membresía.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Entradas registradas hoy</h2>
            <p className="text-sm text-gray-500">
              Los registros se almacenan aquí sin alargar toda la pantalla.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
            {asistenciasHoy.length} entrada{asistenciasHoy.length === 1 ? '' : 's'}
          </span>
        </div>

        {cargandoHistorial ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Cargando asistencias...
          </div>
        ) : asistenciasHoy.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <CalendarCheck size={24} className="text-gray-500" />
            </div>

            <p className="font-semibold text-gray-900">No hay entradas registradas hoy</p>

            <p className="mt-1 text-sm text-gray-500">
              Busca un socio para registrar su primera entrada.
            </p>
          </div>
        ) : (
          <div className="max-h-[460px] overflow-y-auto">
            <div className="divide-y divide-gray-100">
              {asistenciasHoy.map((asistencia) => (
                <div
                  key={asistencia.id}
                  className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-100">
                      {asistencia.miembros?.foto_url ? (
                        <img
                          src={asistencia.miembros.foto_url}
                          alt="Foto del socio"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <UserRound size={20} className="text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="font-bold text-gray-900">
                        {asistencia.miembros?.nombre} {asistencia.miembros?.apellido}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Código: {asistencia.miembros?.codigo_acceso || '-'} · {asistencia.miembros?.telefono || 'Sin teléfono'}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Plan: {obtenerNombrePlan(asistencia.membresias)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-sm md:items-end">
                    <div className="flex items-center gap-2 font-semibold text-gray-900">
                      <Clock size={16} className="text-gray-400" />
                      {formatearFechaHora(asistencia.fecha_entrada)}
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        {asistencia.origen_registro || 'manual'}
                      </span>

                      {asistencia.verificado_visualmente && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          <ShieldCheck size={13} />
                          Verificado
                        </span>
                      )}
                    </div>

                    {asistencia.observacion && (
                      <p className="max-w-md text-xs text-gray-500">
                        {asistencia.observacion}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}