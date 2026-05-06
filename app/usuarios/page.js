'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Save,
  X,
  Pencil,
  UserCog,
  ShieldCheck,
  User,
  Power,
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

  async function desactivarUsuario(usuario) {
    const confirmar = window.confirm(
      `¿Seguro que deseas desactivar el usuario "${usuario.usuario}"?`
    )

    if (!confirmar) return

    setError('')
    setMensaje('')

    const token = await obtenerToken()

    const respuesta = await fetch(`/api/admin/usuarios?id=${usuario.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await respuesta.json()

    if (!respuesta.ok) {
      setError(data.error || 'No se pudo desactivar el usuario.')
      return
    }

    await cargarUsuarios()
    setMensaje('Usuario desactivado correctamente.')
  }

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
          <p className="mt-2 text-gray-600">
            Crea y administra accesos del sistema.
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
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editandoId ? 'Editar usuario' : 'Crear nuevo usuario'}
              </h2>
              <p className="text-sm text-gray-500">
                El empleado ingresará con usuario y contraseña.
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
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black disabled:bg-gray-100"
                placeholder="ej: recepcion"
                autoCapitalize="none"
                autoCorrect="off"
              />
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

            <div className="flex gap-3 md:col-span-2">
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
        <div className="border-b border-gray-200 p-5">
          <h2 className="text-lg font-bold text-gray-900">Usuarios del sistema</h2>
          <p className="text-sm text-gray-500">
            Control de accesos internos.
          </p>
        </div>

        {cargando ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Cargando usuarios...
          </div>
        ) : usuarios.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No hay usuarios registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                {usuarios.map((usuario) => (
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
                            {usuario.auth_email}
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
                          onClick={() => desactivarUsuario(usuario)}
                          className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700"
                          title="Desactivar"
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
        )}
      </div>
    </div>
  )
}