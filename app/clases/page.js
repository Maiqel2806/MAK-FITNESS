'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Plus,
  Search,
  Save,
  X,
  CalendarDays,
  Clock,
  Users,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'

const supabase = createClient()

const diasSemana = [
  { value: 'lunes', label: 'Lunes', orden: 1 },
  { value: 'martes', label: 'Martes', orden: 2 },
  { value: 'miercoles', label: 'Miércoles', orden: 3 },
  { value: 'jueves', label: 'Jueves', orden: 4 },
  { value: 'viernes', label: 'Viernes', orden: 5 },
  { value: 'sabado', label: 'Sábado', orden: 6 },
  { value: 'domingo', label: 'Domingo', orden: 7 },
]

function crearFormularioInicial() {
  return {
    nombre: '',
    tipo: '',
    instructor: '',
    dias_semana: ['lunes'],
    hora_inicio: '',
    hora_fin: '',
    capacidad_max: '20',
    descripcion: '',
    activa: true,
  }
}

function obtenerNombreDia(valor) {
  return diasSemana.find((dia) => dia.value === valor)?.label || valor
}

function obtenerOrdenDia(valor) {
  return diasSemana.find((dia) => dia.value === valor)?.orden || 99
}

function formatearHora(hora) {
  if (!hora) return '-'
  return String(hora).slice(0, 5)
}

export default function ClasesPage() {
  const [clases, setClases] = useState([])
  const [formulario, setFormulario] = useState(crearFormularioInicial())
  const [busqueda, setBusqueda] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarClases()
  }, [])

  async function cargarClases() {
    setCargando(true)
    setError('')
    setMensaje('')

    const { data, error } = await supabase
      .from('clases')
      .select('*')
      .order('hora_inicio', { ascending: true })

    if (error) {
      setError(error.message)
      setClases([])
    } else {
      const ordenadas = (data || []).sort((a, b) => {
        const ordenDia = obtenerOrdenDia(a.dia_semana) - obtenerOrdenDia(b.dia_semana)

        if (ordenDia !== 0) return ordenDia

        return String(a.hora_inicio).localeCompare(String(b.hora_inicio))
      })

      setClases(ordenadas)
    }

    setCargando(false)
  }

  function actualizarCampo(campo, valor) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }))
  }

  function cambiarDiaSeleccionado(diaSeleccionado) {
    setFormulario((actual) => {
      const yaExiste = actual.dias_semana.includes(diaSeleccionado)

      let nuevosDias

      if (yaExiste) {
        nuevosDias = actual.dias_semana.filter((dia) => dia !== diaSeleccionado)
      } else {
        nuevosDias = [...actual.dias_semana, diaSeleccionado]
      }

      nuevosDias = nuevosDias.sort((a, b) => obtenerOrdenDia(a) - obtenerOrdenDia(b))

      return {
        ...actual,
        dias_semana: nuevosDias,
      }
    })
  }

  function abrirNuevaClase() {
    setFormulario(crearFormularioInicial())
    setEditandoId(null)
    setMostrarFormulario(true)
    setError('')
    setMensaje('')
  }

  function limpiarFormulario() {
    setFormulario(crearFormularioInicial())
    setEditandoId(null)
    setMostrarFormulario(false)
    setError('')
  }

  function editarClase(clase) {
    setFormulario({
      nombre: clase.nombre || '',
      tipo: clase.tipo || '',
      instructor: clase.instructor || '',
      dias_semana: [clase.dia_semana || 'lunes'],
      hora_inicio: formatearHora(clase.hora_inicio),
      hora_fin: formatearHora(clase.hora_fin),
      capacidad_max: String(clase.capacidad_max || 20),
      descripcion: clase.descripcion || '',
      activa: Boolean(clase.activa),
    })

    setEditandoId(clase.id)
    setMostrarFormulario(true)
    setError('')
    setMensaje('')
  }

  function validarFormulario(datosBase) {
    if (!datosBase.nombre) {
      return 'El nombre de la clase es obligatorio.'
    }

    if (!formulario.dias_semana.length) {
      return 'Debes seleccionar al menos un día.'
    }

    if (!datosBase.hora_inicio || !datosBase.hora_fin) {
      return 'La hora de inicio y la hora fin son obligatorias.'
    }

    if (datosBase.hora_fin <= datosBase.hora_inicio) {
      return 'La hora fin debe ser mayor a la hora de inicio.'
    }

    if (!datosBase.capacidad_max || datosBase.capacidad_max <= 0) {
      return 'La capacidad máxima debe ser mayor a 0.'
    }

    return ''
  }

  async function guardarClase(evento) {
    evento.preventDefault()
    setGuardando(true)
    setError('')
    setMensaje('')

    const datosBase = {
      nombre: formulario.nombre.trim(),
      tipo: formulario.tipo.trim() || null,
      instructor: formulario.instructor.trim() || null,
      hora_inicio: formulario.hora_inicio,
      hora_fin: formulario.hora_fin,
      capacidad_max: Number(formulario.capacidad_max),
      descripcion: formulario.descripcion.trim() || null,
      activa: Boolean(formulario.activa),
    }

    const errorValidacion = validarFormulario(datosBase)

    if (errorValidacion) {
      setError(errorValidacion)
      setGuardando(false)
      return
    }

    const diasSeleccionados = formulario.dias_semana

    if (editandoId) {
      const primerDia = diasSeleccionados[0]
      const diasAdicionales = diasSeleccionados.slice(1)

      const respuestaUpdate = await supabase
        .from('clases')
        .update({
          ...datosBase,
          dia_semana: primerDia,
        })
        .eq('id', editandoId)

      if (respuestaUpdate.error) {
        setError(respuestaUpdate.error.message)
        setGuardando(false)
        return
      }

      if (diasAdicionales.length > 0) {
        const registrosAdicionales = diasAdicionales.map((dia) => ({
          ...datosBase,
          dia_semana: dia,
        }))

        const respuestaInsert = await supabase
          .from('clases')
          .insert(registrosAdicionales)

        if (respuestaInsert.error) {
          setError(respuestaInsert.error.message)
          setGuardando(false)
          return
        }
      }

      setMensaje('Clase actualizada correctamente.')
    } else {
      const registros = diasSeleccionados.map((dia) => ({
        ...datosBase,
        dia_semana: dia,
      }))

      const respuestaInsert = await supabase
        .from('clases')
        .insert(registros)

      if (respuestaInsert.error) {
        setError(respuestaInsert.error.message)
        setGuardando(false)
        return
      }

      setMensaje(
        diasSeleccionados.length === 1
          ? 'Clase registrada correctamente.'
          : 'Clases registradas correctamente para los días seleccionados.'
      )
    }

    await cargarClases()
    limpiarFormulario()
    setGuardando(false)
  }

  async function cambiarEstadoClase(clase) {
    setError('')
    setMensaje('')

    const { error } = await supabase
      .from('clases')
      .update({
        activa: !clase.activa,
      })
      .eq('id', clase.id)

    if (error) {
      setError(error.message)
      return
    }

    await cargarClases()
  }

  async function eliminarClase(clase) {
    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar la clase "${clase.nombre}" del día ${obtenerNombreDia(clase.dia_semana)}?`
    )

    if (!confirmar) return

    setError('')
    setMensaje('')

    const { error } = await supabase
      .from('clases')
      .delete()
      .eq('id', clase.id)

    if (error) {
      setError(error.message)
      return
    }

    await cargarClases()
  }

  const clasesFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()

    if (!texto) return clases

    return clases.filter((clase) => {
      const valores = [
        clase.nombre,
        clase.tipo,
        clase.instructor,
        clase.dia_semana,
        obtenerNombreDia(clase.dia_semana),
        clase.descripcion,
      ]

      return valores.some((valor) =>
        String(valor || '').toLowerCase().includes(texto)
      )
    })
  }, [clases, busqueda])

  const resumen = useMemo(() => {
    const activas = clases.filter((clase) => clase.activa)
    const inactivas = clases.filter((clase) => !clase.activa)
    const capacidadTotal = activas.reduce(
      (total, clase) => total + Number(clase.capacidad_max || 0),
      0
    )

    return {
      total: clases.length,
      activas: activas.length,
      inactivas: inactivas.length,
      capacidadTotal,
    }
  }, [clases])

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clases y horarios</h1>
          <p className="mt-2 text-gray-600">
            Administra clases grupales, horarios, cupos e instructores.
          </p>
        </div>

        <button
          onClick={abrirNuevaClase}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          <Plus size={18} />
          Nueva clase
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

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total clases</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {cargando ? '-' : resumen.total}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Clases activas</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {cargando ? '-' : resumen.activas}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Clases inactivas</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {cargando ? '-' : resumen.inactivas}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Capacidad activa</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {cargando ? '-' : resumen.capacidadTotal}
          </h2>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editandoId ? 'Editar clase' : 'Registrar nueva clase'}
              </h2>
              <p className="text-sm text-gray-500">
                Puedes seleccionar uno o varios días para crear el horario.
              </p>
            </div>

            <button
              onClick={limpiarFormulario}
              className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={guardarClase} className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nombre de la clase
              </label>
              <input
                value={formulario.nombre}
                onChange={(e) => actualizarCampo('nombre', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: Funcional"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tipo
              </label>
              <input
                value={formulario.tipo}
                onChange={(e) => actualizarCampo('tipo', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: Cardio, Fuerza, Funcional"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Instructor
              </label>
              <input
                value={formulario.instructor}
                onChange={(e) => actualizarCampo('instructor', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: Michael"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Días que se imparte
              </label>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-7">
                {diasSemana.map((dia) => {
                  const seleccionado = formulario.dias_semana.includes(dia.value)

                  return (
                    <label
                      key={dia.value}
                      className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                        seleccionado
                          ? 'border-black bg-black text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={seleccionado}
                        onChange={() => cambiarDiaSeleccionado(dia.value)}
                        className="hidden"
                      />
                      {dia.label}
                    </label>
                  )
                })}
              </div>

              <p className="mt-2 text-xs text-gray-500">
                Si seleccionas varios días, el sistema creará un horario individual por cada día.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Hora inicio
              </label>
              <input
                type="time"
                value={formulario.hora_inicio}
                onChange={(e) => actualizarCampo('hora_inicio', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Hora fin
              </label>
              <input
                type="time"
                value={formulario.hora_fin}
                onChange={(e) => actualizarCampo('hora_fin', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Capacidad máxima
              </label>
              <input
                type="number"
                min="1"
                value={formulario.capacidad_max}
                onChange={(e) => actualizarCampo('capacidad_max', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Ej: 15"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Estado
              </label>
              <select
                value={formulario.activa ? 'activa' : 'inactiva'}
                onChange={(e) => actualizarCampo('activa', e.target.value === 'activa')}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                value={formulario.descripcion}
                onChange={(e) => actualizarCampo('descripcion', e.target.value)}
                className="min-h-24 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Descripción o indicaciones de la clase"
              />
            </div>

            <div className="flex gap-3 md:col-span-3">
              <button
                type="submit"
                disabled={guardando}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {guardando ? 'Guardando...' : 'Guardar clase'}
              </button>

              <button
                type="button"
                onClick={limpiarFormulario}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Listado de clases</h2>
            <p className="text-sm text-gray-500">
              Horarios configurados en el sistema.
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
              placeholder="Buscar por clase, día, tipo o instructor"
            />
          </div>
        </div>

        {cargando ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Cargando clases...
          </div>
        ) : clasesFiltradas.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <CalendarDays size={24} className="text-gray-500" />
            </div>
            <p className="font-semibold text-gray-900">No hay clases registradas</p>
            <p className="mt-1 text-sm text-gray-500">
              Crea tu primera clase para empezar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Clase</th>
                  <th className="px-5 py-3">Día</th>
                  <th className="px-5 py-3">Horario</th>
                  <th className="px-5 py-3">Instructor</th>
                  <th className="px-5 py-3">Capacidad</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {clasesFiltradas.map((clase) => (
                  <tr key={clase.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900">
                        {clase.nombre}
                      </div>
                      <div className="text-xs text-gray-500">
                        {clase.tipo || 'Sin tipo'} · {clase.descripcion || 'Sin descripción'}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={16} className="text-gray-400" />
                        {obtenerNombreDia(clase.dia_semana)}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-gray-400" />
                        {formatearHora(clase.hora_inicio)} - {formatearHora(clase.hora_fin)}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {clase.instructor || '-'}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-gray-400" />
                        {clase.capacidad_max}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          clase.activa
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {clase.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => cambiarEstadoClase(clase)}
                          className={`rounded-lg p-2 transition ${
                            clase.activa
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-500 hover:bg-gray-100'
                          }`}
                          title={clase.activa ? 'Desactivar' : 'Activar'}
                        >
                          {clase.activa ? (
                            <ToggleRight size={18} />
                          ) : (
                            <ToggleLeft size={18} />
                          )}
                        </button>

                        <button
                          onClick={() => editarClase(clase)}
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                          title="Editar"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          onClick={() => eliminarClase(clase)}
                          className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700"
                          title="Eliminar"
                        >
                          <Trash2 size={17} />
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