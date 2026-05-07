'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Save,
  X,
  Pencil,
  ShieldCheck,
  User,
  Power,
  Search,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

const formularioInicial = {
  usuario: '',
  nombre: '',
  password: '',
  rol: 'empleado',
  activo: true,
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [formulario, setFormulario] = useState(formularioInicial)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarUsuarios()
  }, [])

  async function obtenerToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }

  async function cargarUsuarios() {
    setCargando(true)
    setError('')
    setMensaje('')

    const token = await obtenerToken()

    const respuesta = await fetch('/api/admin/usuarios', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await respuesta.json()

    if (!respuesta.ok) {
      setError(data.error || 'No se pudieron cargar los usuarios.')
      setUsuarios([])
      setCargando(false)
      return
    }

    setUsuarios(data.usuarios || [])
    setCargando(false)
  }

  function actualizarCampo(campo, valor) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }))
  }

  function abrirNuevoUsuario() {
    setFormulario(formularioInicial)
    setEditandoId(null)
    setMostrarFormulario(true)
    setError('')
    setMensaje('')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function editarUsuario(usuario) {
    setFormulario({
      usuario: usuario.usuario || '',
      nombre: usuario.nombre || '',
      password: '',
      rol: usuario.rol || 'empleado',
      activo: Boolean(usuario.activo),
    })

    setEditandoId(usuario.id)
    setMostrarFormulario(true)
    setError('')
    setMensaje('')

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function limpiarFormulario() {
    setFormulario(formularioInicial)
    setEditandoId(null)
    setMostrarFormulario(false)
    setError('')
  }

  async function guardarUsuario(evento) {
    evento.preventDefault()
    setGuardando(true)
    setError('')
    setMensaje('')

    const token = await obtenerToken()

    const payload = {
      usuario: formulario.usuario.trim().toLowerCase(),
      nombre: formulario.nombre.trim(),
      password: formulario.password,
      rol: formulario.rol,
      activo: formulario.activo,
    }

    if (!payload.usuario && !editandoId) {
      setError('El usuario es obligatorio.')
      setGuardando(false)
      return
    }

    if (!payload.nombre) {
      setError('El nombre es obligatorio.')
      setGuardando(false)
      return
    }

    if (!editandoId && !payload.password) {
      setError('La contraseña es obligatoria para crear un usuario.')
      setGuardando(false)
      return
    }

    if (!editandoId && payload.password.length < 6) {
      setError('La contraseña debe tener mínimo 6 caracteres.')
      setGuardando(false)
      return
    }

    if (editandoId && payload.password && payload.password.length < 6) {
      setError('La nueva contraseña debe tener mínimo 6 caracteres.')
      setGuardando(false)
      return
    }

    const respuesta = await fetch('/api/admin/usuarios', {
      method: editandoId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        editandoId
          ? {
              id: editandoId,
              nombre: payload.nombre,
              password: payload.password,
              rol: payload.rol,
              activo: payload.activo,
            }
          : payload
      ),
    })

    const data = await respuesta.json()

    if (!respuesta.ok) {
      setError(data.error || 'No se pudo guardar el usuario.')
      setGuardando(false)
      return
    }

    await cargarUsuarios()
    limpiarFormulario()
    setMensaje(editandoId ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.')
    setGuardando(false)
  }

  async function cambiarEstadoUsuario(usuario) {
    const nuevoEstado = !usuario.activo

    const confirmar = window.confirm(
      `¿Seguro que deseas ${nuevoEstado ? 'activar' : 'desactivar'} el usuario "${usuario.usuario}"?`
    )

    if (!confirmar) return

    setError('')
    setMensaje('')

    const token = await obtenerToken()

    const respuesta = await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: usuario.id,
        nombre: usuario.nombre,
        password: '',
        rol: usuario.rol,
        activo: nuevoEstado,
      }),
    })

    const data = await respuesta.json()

    if (!respuesta.ok) {
      setError(data.error || 'No se pudo cambiar el estado del usuario.')
      return
    }

    await cargarUsuarios()
    setMensaje(nuevoEstado ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.')
  }

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()

    if (!texto) return usuarios

    return usuarios.filter((usuario) => {
      const valores = [
        usuario.usuario,
        usuario.nombre,
        usuario.rol,
        usuario.auth_email,
        usuario.activo ? 'activo' : 'inactivo',
      ]

      return valores.some((valor) =>
        String(valor || '').toLowerCase().includes(texto)
      )
    })
  }, [usuarios, busqueda])

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Usuarios
          </h1>
          <p className="mt-2 text-sm text-gray-600 md:text-base">
            Crea y administra accesos internos del sistema.
          </p>
        </div>

        <button
          onClick={abrirNuevoUsuario}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          <Plus size={18} />
          Nuevo usuario
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
                {editandoId ? 'Editar usuario' : 'Crear nuevo usuario'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                El personal ingresará con usuario y contraseña.
              </p>
            </div>

            <button
              onClick={limpiarFormulario}
              className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={guardarUsuario} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Usuario
              </label>
              <input
                value={formulario.usuario}
                onChange={(e) => actualizarCampo('usuario', e.target.value)}
                disabled={Boolean(editandoId)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="ej: recepcion"
                autoCapitalize="none"
                autoCorrect="off"
              />
              {editandoId && (
                <p className="mt-1 text-xs text-gray-500">
                  El nombre de usuario no se puede cambiar después de creado.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nombre
              </label>
              <input
                value={formulario.nombre}
                onChange={(e) => actualizarCampo('nombre', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: Recepción MAK FITNESS"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                type="password"
                value={formulario.password}
                onChange={(e) => actualizarCampo('password', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder={editandoId ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Rol
              </label>
              <select
                value={formulario.rol}
                onChange={(e) => actualizarCampo('rol', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="empleado">Empleado</option>
                <option value="dueno">Administrador</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Estado
              </label>
              <select
                value={formulario.activo ? 'activo' : 'inactivo'}
                onChange={(e) => actualizarCampo('activo', e.target.value === 'activo')}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:col-span-2">
              <button
                type="submit"
                disabled={guardando}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {guardando ? 'Guardando...' : 'Guardar usuario'}
              </button>

              <button
                type="button"
                onClick={limpiarFormulario}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Usuarios del sistema</h2>
            <p className="text-sm text-gray-500">
              Total registrados: {usuarios.length}
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
              placeholder="Buscar por usuario, nombre, rol o correo"
            />
          </div>
        </div>

        {cargando ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Cargando usuarios...
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No hay usuarios registrados.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
              {usuariosFiltrados.map((usuario) => (
                <div
                  key={usuario.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                        usuario.rol === 'dueno'
                          ? 'bg-black text-white'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {usuario.rol === 'dueno' ? (
                        <ShieldCheck size={22} />
                      ) : (
                        <User size={22} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-gray-900">
                            {usuario.usuario}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {usuario.nombre}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            usuario.activo
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>

                      <p className="mt-2 truncate text-xs text-gray-500">
                        {usuario.auth_email || 'Sin correo auth'}
                      </p>

                      <span
                        className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          usuario.rol === 'dueno'
                            ? 'bg-black text-white'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {usuario.rol === 'dueno' ? 'Administrador' : 'Empleado'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => editarUsuario(usuario)}
                      className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                      title="Editar"
                    >
                      <Pencil size={17} />
                    </button>

                    <button
                      onClick={() => cambiarEstadoUsuario(usuario)}
                      className={`rounded-lg border p-2 transition ${
                        usuario.activo
                          ? 'border-red-100 text-red-500 hover:bg-red-50 hover:text-red-700'
                          : 'border-green-100 text-green-600 hover:bg-green-50 hover:text-green-700'
                      }`}
                      title={usuario.activo ? 'Desactivar' : 'Activar'}
                    >
                      <Power size={17} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Usuario</th>
                    <th className="px-5 py-3">Nombre</th>
                    <th className="px-5 py-3">Rol</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {usuariosFiltrados.map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                            {usuario.rol === 'dueno' ? (
                              <ShieldCheck size={19} className="text-gray-500" />
                            ) : (
                              <User size={19} className="text-gray-500" />
                            )}
                          </div>

                          <div>
                            <p className="font-semibold text-gray-900">
                              {usuario.usuario}
                            </p>
                            <p className="text-xs text-gray-500">
                              {usuario.auth_email || 'Sin correo auth'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {usuario.nombre}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            usuario.rol === 'dueno'
                              ? 'bg-black text-white'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {usuario.rol === 'dueno' ? 'Administrador' : 'Empleado'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            usuario.activo
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => editarUsuario(usuario)}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                            title="Editar"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            onClick={() => cambiarEstadoUsuario(usuario)}
                            className={`rounded-lg p-2 transition ${
                              usuario.activo
                                ? 'text-red-500 hover:bg-red-50 hover:text-red-700'
                                : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                            }`}
                            title={usuario.activo ? 'Desactivar' : 'Activar'}
                          >
                            <Power size={17} />
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