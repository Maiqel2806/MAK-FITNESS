'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  RefreshCw,
  ShieldCheck,
  Search,
  Database,
  UserRound,
  Clock,
  FileText,
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

function obtenerEtiquetaAccion(accion) {
  if (accion === 'INSERT') return 'Creación'
  if (accion === 'UPDATE') return 'Edición'
  if (accion === 'DELETE') return 'Eliminación'
  return accion
}

function obtenerClaseAccion(accion) {
  if (accion === 'INSERT') return 'bg-green-50 text-green-700'
  if (accion === 'UPDATE') return 'bg-blue-50 text-blue-700'
  if (accion === 'DELETE') return 'bg-red-50 text-red-700'
  return 'bg-gray-100 text-gray-700'
}

function formatearRol(rol) {
  if (rol === 'dueno') return 'Administrador'
  if (rol === 'empleado') return 'Empleado'
  return rol || '-'
}

function resumirRegistro(registro) {
  const datos = registro.datos_nuevos || registro.datos_anteriores || {}

  if (registro.tabla === 'miembros') {
    return `${datos.nombre || ''} ${datos.apellido || ''}`.trim() || registro.registro_id
  }

  if (registro.tabla === 'productos') {
    return datos.nombre || registro.registro_id
  }

  if (registro.tabla === 'planes') {
    return datos.nombre || registro.registro_id
  }

  if (registro.tabla === 'clases') {
    return datos.nombre || registro.registro_id
  }

  if (registro.tabla === 'admin_usuarios') {
    return datos.usuario || registro.registro_id
  }

  if (registro.tabla === 'ventas') {
    return `Venta ${datos.total ? `$${Number(datos.total).toFixed(2)}` : ''}`
  }

  if (registro.tabla === 'pagos') {
    return `Pago ${datos.monto ? `$${Number(datos.monto).toFixed(2)}` : ''}`
  }

  if (registro.tabla === 'asistencia') {
    return 'Registro de asistencia'
  }

  if (registro.tabla === 'membresias') {
    return 'Registro de membresía'
  }

  return registro.registro_id || '-'
}

export default function AuditoriaPage() {
  const [fechaDesde, setFechaDesde] = useState(obtenerFechaHoy())
  const [fechaHasta, setFechaHasta] = useState(obtenerFechaHoy())
  const [registros, setRegistros] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [tablaFiltro, setTablaFiltro] = useState('')
  const [accionFiltro, setAccionFiltro] = useState('')
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarAuditoria()
  }, [])

  async function cargarAuditoria() {
    setCargando(true)
    setError('')

    const inicioISO = crearInicioDiaISO(fechaDesde)
    const finISO = crearFinDiaISO(fechaHasta)

    const { data, error } = await supabase
      .from('auditoria_sistema')
      .select('*')
      .gte('created_at', inicioISO)
      .lte('created_at', finISO)
      .order('created_at', { ascending: false })
      .limit(300)

    if (error) {
      setError(error.message)
      setRegistros([])
    } else {
      setRegistros(data || [])
    }

    setCargando(false)
  }

  const tablasDisponibles = useMemo(() => {
    const setTablas = new Set(registros.map((item) => item.tabla))
    return Array.from(setTablas).sort()
  }, [registros])

  const registrosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()

    return registros.filter((registro) => {
      const coincideTabla = tablaFiltro ? registro.tabla === tablaFiltro : true
      const coincideAccion = accionFiltro ? registro.accion === accionFiltro : true

      const valores = [
        registro.tabla,
        registro.accion,
        registro.usuario_sistema,
        registro.usuario_nombre,
        registro.usuario_rol,
        registro.descripcion,
        resumirRegistro(registro),
      ]

      const coincideBusqueda = texto
        ? valores.some((valor) =>
            String(valor || '').toLowerCase().includes(texto)
          )
        : true

      return coincideTabla && coincideAccion && coincideBusqueda
    })
  }, [registros, busqueda, tablaFiltro, accionFiltro])

  const resumen = useMemo(() => {
    const creaciones = registros.filter((item) => item.accion === 'INSERT').length
    const ediciones = registros.filter((item) => item.accion === 'UPDATE').length
    const eliminaciones = registros.filter((item) => item.accion === 'DELETE').length

    const usuarios = new Set(
      registros
        .map((item) => item.usuario_sistema)
        .filter(Boolean)
    )

    return {
      total: registros.length,
      creaciones,
      ediciones,
      eliminaciones,
      usuarios: usuarios.size,
    }
  }, [registros])

  return (
    <div>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Auditoría</h1>
          <p className="mt-2 text-gray-600">
            Revisa las acciones realizadas por los usuarios del sistema.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>
          </div>

          <button
            onClick={cargarAuditoria}
            disabled={cargando}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 md:self-end"
          >
            <RefreshCw size={18} />
            {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Registros</p>
            <ShieldCheck size={22} className="text-gray-400" />
          </div>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {cargando ? '-' : resumen.total}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Creaciones</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {cargando ? '-' : resumen.creaciones}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Ediciones</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {cargando ? '-' : resumen.ediciones}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Eliminaciones</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {cargando ? '-' : resumen.eliminaciones}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Usuarios activos</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {cargando ? '-' : resumen.usuarios}
          </h2>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-4 border-b border-gray-200 p-5 md:grid-cols-[1fr_220px_220px]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-black"
              placeholder="Buscar por usuario, tabla, acción o registro"
            />
          </div>

          <select
            value={tablaFiltro}
            onChange={(e) => setTablaFiltro(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          >
            <option value="">Todas las tablas</option>
            {tablasDisponibles.map((tabla) => (
              <option key={tabla} value={tabla}>
                {tabla}
              </option>
            ))}
          </select>

          <select
            value={accionFiltro}
            onChange={(e) => setAccionFiltro(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          >
            <option value="">Todas las acciones</option>
            <option value="INSERT">Creación</option>
            <option value="UPDATE">Edición</option>
            <option value="DELETE">Eliminación</option>
          </select>
        </div>

        {cargando ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Cargando auditoría...
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No hay registros de auditoría para los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Usuario</th>
                  <th className="px-5 py-3">Tabla</th>
                  <th className="px-5 py-3">Acción</th>
                  <th className="px-5 py-3">Registro</th>
                  <th className="px-5 py-3 text-right">Detalle</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {registrosFiltrados.map((registro) => (
                  <tr key={registro.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 text-gray-700">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-gray-400" />
                        {formatearFechaHora(registro.created_at)}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                          <UserRound size={17} className="text-gray-500" />
                        </div>

                        <div>
                          <p className="font-semibold text-gray-900">
                            {registro.usuario_nombre || 'Sistema'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {registro.usuario_sistema || '-'} · {formatearRol(registro.usuario_rol)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        <Database size={13} />
                        {registro.tabla}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${obtenerClaseAccion(registro.accion)}`}
                      >
                        {obtenerEtiquetaAccion(registro.accion)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {resumirRegistro(registro)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setRegistroSeleccionado(registro)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        <FileText size={15} />
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {registroSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Detalle de auditoría
                </h2>
                <p className="text-sm text-gray-500">
                  {registroSeleccionado.tabla} · {obtenerEtiquetaAccion(registroSeleccionado.accion)}
                </p>
              </div>

              <button
                onClick={() => setRegistroSeleccionado(null)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="font-bold text-gray-900">Información</h3>

                <div className="mt-3 space-y-2 text-sm">
                  <p>
                    <span className="font-semibold">Fecha:</span>{' '}
                    {formatearFechaHora(registroSeleccionado.created_at)}
                  </p>
                  <p>
                    <span className="font-semibold">Usuario:</span>{' '}
                    {registroSeleccionado.usuario_nombre || 'Sistema'}
                  </p>
                  <p>
                    <span className="font-semibold">Rol:</span>{' '}
                    {formatearRol(registroSeleccionado.usuario_rol)}
                  </p>
                  <p>
                    <span className="font-semibold">Tabla:</span>{' '}
                    {registroSeleccionado.tabla}
                  </p>
                  <p>
                    <span className="font-semibold">Acción:</span>{' '}
                    {obtenerEtiquetaAccion(registroSeleccionado.accion)}
                  </p>
                  <p>
                    <span className="font-semibold">Registro ID:</span>{' '}
                    {registroSeleccionado.registro_id || '-'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="font-bold text-gray-900">Resumen</h3>
                <p className="mt-3 text-sm text-gray-700">
                  {registroSeleccionado.descripcion}
                </p>
                <p className="mt-3 text-sm text-gray-700">
                  Registro: {resumirRegistro(registroSeleccionado)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 pt-0 md:grid-cols-2">
              <div>
                <h3 className="mb-2 font-bold text-gray-900">Datos anteriores</h3>
                <pre className="max-h-80 overflow-auto rounded-2xl bg-gray-900 p-4 text-xs text-gray-100">
                  {JSON.stringify(registroSeleccionado.datos_anteriores, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="mb-2 font-bold text-gray-900">Datos nuevos</h3>
                <pre className="max-h-80 overflow-auto rounded-2xl bg-gray-900 p-4 text-xs text-gray-100">
                  {JSON.stringify(registroSeleccionado.datos_nuevos, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}