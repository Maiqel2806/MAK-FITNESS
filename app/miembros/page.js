'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Plus,
  Search,
  Pencil,
  Save,
  X,
  UserRound,
  Camera,
  ImageIcon,
  Power,
  PowerOff,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
} from 'lucide-react'

const supabase = createClient()

const estadoOpciones = [
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'suspendido', label: 'Suspendido' },
]

const formularioInicial = {
  codigo_acceso: '',
  nombre: '',
  apellido: '',
  cedula: '',
  email: '',
  telefono: '',
  fecha_nacimiento: '',
  direccion: '',
  contacto_emergencia: '',
  telefono_emergencia: '',
  estado: 'activo',
  notas: '',
  foto_url: '',
  foto_path: '',
}

export default function MiembrosPage() {
  const [miembros, setMiembros] = useState([])
  const [formulario, setFormulario] = useState(formularioInicial)
  const [archivoFoto, setArchivoFoto] = useState(null)
  const [previewFoto, setPreviewFoto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarMiembros()
  }, [])

  async function cargarMiembros() {
    setCargando(true)
    setError('')
    setMensaje('')

    const { data, error } = await supabase
      .from('miembros')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      setMiembros([])
    } else {
      setMiembros(data || [])
    }

    setCargando(false)
  }

  function actualizarCampo(campo, valor) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }))
  }

  function limpiarFormulario() {
    setFormulario(formularioInicial)
    setArchivoFoto(null)
    setPreviewFoto('')
    setEditandoId(null)
    setMostrarFormulario(false)
    setError('')
  }

  function abrirNuevoMiembro() {
    setFormulario(formularioInicial)
    setArchivoFoto(null)
    setPreviewFoto('')
    setEditandoId(null)
    setMostrarFormulario(true)
    setError('')
    setMensaje('')
  }

  function editarMiembro(miembro) {
    setFormulario({
      codigo_acceso: miembro.codigo_acceso || '',
      nombre: miembro.nombre || '',
      apellido: miembro.apellido || '',
      cedula: miembro.cedula || '',
      email: miembro.email || '',
      telefono: miembro.telefono || '',
      fecha_nacimiento: miembro.fecha_nacimiento || '',
      direccion: miembro.direccion || '',
      contacto_emergencia: miembro.contacto_emergencia || '',
      telefono_emergencia: miembro.telefono_emergencia || '',
      estado: miembro.estado || 'activo',
      notas: miembro.notas || '',
      foto_url: miembro.foto_url || '',
      foto_path: miembro.foto_path || '',
    })

    setArchivoFoto(null)
    setPreviewFoto(miembro.foto_url || '')
    setEditandoId(miembro.id)
    setMostrarFormulario(true)
    setError('')
    setMensaje('')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function seleccionarFoto(evento) {
    const archivo = evento.target.files?.[0]

    if (!archivo) return

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp']

    if (!tiposPermitidos.includes(archivo.type)) {
      setError('La foto debe ser JPG, PNG o WEBP.')
      return
    }

    if (archivo.size > 5 * 1024 * 1024) {
      setError('La foto no debe superar los 5 MB.')
      return
    }

    setArchivoFoto(archivo)
    setPreviewFoto(URL.createObjectURL(archivo))
    setError('')
    setMensaje('')
  }

  async function subirFoto() {
    if (!archivoFoto) {
      return {
        foto_url: formulario.foto_url || null,
        foto_path: formulario.foto_path || null,
      }
    }

    const extension = archivoFoto.name.split('.').pop()?.toLowerCase() || 'jpg'
    const nombreArchivo = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
    const rutaArchivo = `miembros/${nombreArchivo}`

    const { error } = await supabase.storage
      .from('miembros-fotos')
      .upload(rutaArchivo, archivoFoto, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      throw new Error(error.message)
    }

    const { data } = supabase.storage
      .from('miembros-fotos')
      .getPublicUrl(rutaArchivo)

    return {
      foto_url: data.publicUrl,
      foto_path: rutaArchivo,
    }
  }

  async function guardarMiembro(evento) {
    evento.preventDefault()
    setGuardando(true)
    setError('')
    setMensaje('')

    const datosBase = {
      nombre: formulario.nombre.trim(),
      apellido: formulario.apellido.trim(),
      cedula: formulario.cedula.trim() || null,
      email: formulario.email.trim() || null,
      telefono: formulario.telefono.trim() || null,
      fecha_nacimiento: formulario.fecha_nacimiento || null,
      direccion: formulario.direccion.trim() || null,
      contacto_emergencia: formulario.contacto_emergencia.trim() || null,
      telefono_emergencia: formulario.telefono_emergencia.trim() || null,
      estado: formulario.estado,
      notas: formulario.notas.trim() || null,
    }

    if (!datosBase.nombre || !datosBase.apellido) {
      setError('El nombre y apellido son obligatorios.')
      setGuardando(false)
      return
    }

    try {
      const datosFoto = await subirFoto()

      const datos = {
        ...datosBase,
        foto_url: datosFoto.foto_url,
        foto_path: datosFoto.foto_path,
      }

      let respuesta

      if (editandoId) {
        respuesta = await supabase
          .from('miembros')
          .update(datos)
          .eq('id', editandoId)
      } else {
        respuesta = await supabase
          .from('miembros')
          .insert(datos)
      }

      if (respuesta.error) {
        setError(respuesta.error.message)
        setGuardando(false)
        return
      }

      await cargarMiembros()
      limpiarFormulario()
      setMensaje(editandoId ? 'Miembro actualizado correctamente.' : 'Miembro registrado correctamente.')
      setGuardando(false)
    } catch (error) {
      setError(error.message)
      setGuardando(false)
    }
  }

  async function cambiarEstadoMiembro(miembro) {
    const nuevoEstado = miembro.estado === 'activo' ? 'inactivo' : 'activo'

    const confirmar = window.confirm(
      `¿Seguro que deseas cambiar el estado de ${miembro.nombre} ${miembro.apellido} a "${nuevoEstado}"?`
    )

    if (!confirmar) return

    setError('')
    setMensaje('')

    const { error } = await supabase
      .from('miembros')
      .update({
        estado: nuevoEstado,
      })
      .eq('id', miembro.id)

    if (error) {
      setError(error.message)
      return
    }

    await cargarMiembros()

    setMensaje(
      nuevoEstado === 'activo'
        ? 'Miembro activado correctamente.'
        : 'Miembro inactivado correctamente.'
    )
  }

  const miembrosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()

    if (!texto) return miembros

    return miembros.filter((miembro) => {
      const valores = [
        miembro.codigo_acceso,
        miembro.nombre,
        miembro.apellido,
        miembro.cedula,
        miembro.email,
        miembro.telefono,
        miembro.estado,
      ]

      return valores.some((valor) =>
        String(valor || '').toLowerCase().includes(texto)
      )
    })
  }, [miembros, busqueda])

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Miembros</h1>
          <p className="mt-2 text-sm text-gray-600 md:text-base">
            Administra los socios registrados, su código único y su foto de verificación.
          </p>
        </div>

        <button
          onClick={abrirNuevoMiembro}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          <Plus size={18} />
          Nuevo miembro
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

      {mostrarFormulario && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editandoId ? 'Editar miembro' : 'Registrar nuevo miembro'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                La foto será usada para validar visualmente la entrada del socio.
              </p>
            </div>

            <button
              onClick={limpiarFormulario}
              className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={guardarMiembro} className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mx-auto flex aspect-square w-full max-w-[260px] items-center justify-center overflow-hidden rounded-2xl bg-white">
                {previewFoto ? (
                  <img
                    src={previewFoto}
                    alt="Foto del socio"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <ImageIcon size={44} />
                    <span className="mt-2 text-sm">Sin foto</span>
                  </div>
                )}
              </div>

              <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800">
                <Camera size={18} />
                Tomar / seleccionar foto
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={seleccionarFoto}
                  className="hidden"
                />
              </label>

              <p className="mt-3 text-xs text-gray-500">
                Desde celular se abrirá la cámara. Formatos permitidos: JPG, PNG o WEBP. Máximo 5 MB.
              </p>

              <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Código del socio
                </p>

                <p className="mt-2 text-2xl font-black tracking-widest text-gray-900">
                  {formulario.codigo_acceso || 'Automático'}
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  Este código se genera automáticamente y se usa para registrar asistencia sin buscar por cédula.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nombre
                </label>
                <input
                  value={formulario.nombre}
                  onChange={(e) => actualizarCampo('nombre', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Ej: Juan"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Apellido
                </label>
                <input
                  value={formulario.apellido}
                  onChange={(e) => actualizarCampo('apellido', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Ej: Pérez"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Cédula
                </label>
                <input
                  value={formulario.cedula}
                  onChange={(e) => actualizarCampo('cedula', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Ej: 1720000000"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Teléfono
                </label>
                <input
                  value={formulario.telefono}
                  onChange={(e) => actualizarCampo('telefono', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Ej: 0999999999"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Correo
                </label>
                <input
                  type="email"
                  value={formulario.email}
                  onChange={(e) => actualizarCampo('email', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Ej: cliente@email.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Fecha de nacimiento
                </label>
                <input
                  type="date"
                  value={formulario.fecha_nacimiento}
                  onChange={(e) => actualizarCampo('fecha_nacimiento', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Dirección
                </label>
                <input
                  value={formulario.direccion}
                  onChange={(e) => actualizarCampo('direccion', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Ej: Calderón, Quito"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Estado
                </label>
                <select
                  value={formulario.estado}
                  onChange={(e) => actualizarCampo('estado', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                >
                  {estadoOpciones.map((estado) => (
                    <option key={estado.value} value={estado.value}>
                      {estado.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Contacto de emergencia
                </label>
                <input
                  value={formulario.contacto_emergencia}
                  onChange={(e) => actualizarCampo('contacto_emergencia', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Nombre del contacto"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Teléfono de emergencia
                </label>
                <input
                  value={formulario.telefono_emergencia}
                  onChange={(e) => actualizarCampo('telefono_emergencia', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Teléfono del contacto"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notas
                </label>
                <textarea
                  value={formulario.notas}
                  onChange={(e) => actualizarCampo('notas', e.target.value)}
                  className="min-h-24 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Observaciones relevantes del socio"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row md:col-span-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={18} />
                  {guardando ? 'Guardando...' : 'Guardar miembro'}
                </button>

                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Listado de miembros</h2>
            <p className="text-sm text-gray-500">
              Total registrados: {miembros.length}
            </p>
          </div>

          <div className="relative w-full md:w-96">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-black"
              placeholder="Buscar por código, nombre, cédula o teléfono"
            />
          </div>
        </div>

        {cargando ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Cargando miembros...
          </div>
        ) : miembrosFiltrados.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <UserRound size={24} className="text-gray-500" />
            </div>
            <p className="font-semibold text-gray-900">No hay miembros registrados</p>
            <p className="mt-1 text-sm text-gray-500">
              Agrega tu primer socio para comenzar.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
              {miembrosFiltrados.map((miembro) => (
                <div
                  key={miembro.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                      {miembro.foto_url ? (
                        <img
                          src={miembro.foto_url}
                          alt="Foto del socio"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <UserRound size={28} className="text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-gray-900">
                            {miembro.nombre} {miembro.apellido}
                          </h3>

                          <span className="mt-2 inline-flex rounded-full bg-black px-3 py-1 text-sm font-bold tracking-widest text-white">
                            {miembro.codigo_acceso || '-'}
                          </span>
                        </div>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            miembro.estado === 'activo'
                              ? 'bg-green-50 text-green-700'
                              : miembro.estado === 'suspendido'
                                ? 'bg-yellow-50 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {miembro.estado}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-gray-400" />
                      <span>Cédula: {miembro.cedula || '-'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      <span>{miembro.telefono || 'Sin teléfono'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-gray-400" />
                      <span className="truncate">{miembro.email || 'Sin correo'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      <span className="truncate">{miembro.direccion || 'Sin dirección'}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    {miembro.foto_url ? (
                      <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        Foto registrada
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        Foto pendiente
                      </span>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => editarMiembro(miembro)}
                        className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                        title="Editar"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        onClick={() => cambiarEstadoMiembro(miembro)}
                        className={`rounded-lg border p-2 transition ${
                          miembro.estado === 'activo'
                            ? 'border-red-100 text-red-500 hover:bg-red-50 hover:text-red-700'
                            : 'border-green-100 text-green-600 hover:bg-green-50 hover:text-green-700'
                        }`}
                        title={miembro.estado === 'activo' ? 'Inactivar' : 'Activar'}
                      >
                        {miembro.estado === 'activo' ? (
                          <PowerOff size={17} />
                        ) : (
                          <Power size={17} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Socio</th>
                    <th className="px-5 py-3">Código</th>
                    <th className="px-5 py-3">Cédula</th>
                    <th className="px-5 py-3">Teléfono</th>
                    <th className="px-5 py-3">Correo</th>
                    <th className="px-5 py-3">Foto</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {miembrosFiltrados.map((miembro) => (
                    <tr key={miembro.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 overflow-hidden rounded-full bg-gray-100">
                            {miembro.foto_url ? (
                              <img
                                src={miembro.foto_url}
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
                            <div className="font-semibold text-gray-900">
                              {miembro.nombre} {miembro.apellido}
                            </div>
                            <div className="text-xs text-gray-500">
                              {miembro.direccion || 'Sin dirección'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-black px-3 py-1 text-sm font-bold tracking-widest text-white">
                          {miembro.codigo_acceso || '-'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {miembro.cedula || '-'}
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {miembro.telefono || '-'}
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {miembro.email || '-'}
                      </td>

                      <td className="px-5 py-4">
                        {miembro.foto_url ? (
                          <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                            Registrada
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                            Pendiente
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            miembro.estado === 'activo'
                              ? 'bg-green-50 text-green-700'
                              : miembro.estado === 'suspendido'
                                ? 'bg-yellow-50 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {miembro.estado}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => editarMiembro(miembro)}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                            title="Editar"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            onClick={() => cambiarEstadoMiembro(miembro)}
                            className={`rounded-lg p-2 transition ${
                              miembro.estado === 'activo'
                                ? 'text-red-500 hover:bg-red-50 hover:text-red-700'
                                : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                            }`}
                            title={miembro.estado === 'activo' ? 'Inactivar' : 'Activar'}
                          >
                            {miembro.estado === 'activo' ? (
                              <PowerOff size={17} />
                            ) : (
                              <Power size={17} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}