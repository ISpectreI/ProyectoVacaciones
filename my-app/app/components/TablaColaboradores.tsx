'use client'

import { useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

export interface Equipo {
  id: number
  nombre: string
}

export interface Colaborador {
  id: number
  nombre: string
  equipo_id?: number | null
  fecha_ingreso: string
  saldo_pendiente: number
  equipos?: {
    nombre: string
  } | null
}

export interface SolicitudVacacion {
  id: number
  colaborador_id: number
  fecha_inicio: string
  fecha_fin: string
  dias_consumidos?: number
  colaboradores?: {
    equipo_id?: number | null
    nombre?: string
    equipos?: {
      nombre?: string
    } | null
  } | null
}

interface Props {
  colaboradores: Colaborador[]
  equipos: Equipo[]
  solicitudes: SolicitudVacacion[]
  loading: boolean
  onRefresh: () => void
}

export default function TablaColaboradores({ colaboradores, equipos, solicitudes, loading, onRefresh }: Props) {
  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formNombre, setFormNombre] = useState('')
  const [formEquipoId, setFormEquipoId] = useState<string>('')
  const [formFechaIngreso, setFormFechaIngreso] = useState('')
  const [formSaldo, setFormSaldo] = useState<number>(0)
  const [savingColab, setSavingColab] = useState(false)

  // Programar Vacaciones
  const [progColabId, setProgColabId] = useState<string>('')
  const [progFechaInicio, setProgFechaInicio] = useState('')
  const [progFechaFin, setProgFechaFin] = useState('')
  const [savingVac, setSavingVac] = useState(false)

  // Filtros
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroEquipo, setFiltroEquipo] = useState('')
  const [filtroSaldo, setFiltroSaldo] = useState<'todos' | 'con_saldo' | 'sin_saldo'>('todos')
  const [ordenSaldo, setOrdenSaldo] = useState<'ninguno' | 'desc' | 'asc'>('ninguno')

  // Advertencia de Traslape
  const advertenciaTraslape = useMemo(() => {
    if (!progColabId || !progFechaInicio || !progFechaFin) return null

    const colabSeleccionado = colaboradores.find((c) => c.id.toString() === progColabId)
    if (!colabSeleccionado || !colabSeleccionado.equipo_id) return null

    const inicioNuevo = new Date(progFechaInicio).getTime()
    const finNuevo = new Date(progFechaFin).getTime()

    const traslapes = solicitudes.filter((sol) => {
      if (sol.colaborador_id.toString() === progColabId) return false

      const mismoEquipo = sol.colaboradores?.equipo_id === colabSeleccionado.equipo_id
      if (!mismoEquipo) return false

      const inicioSol = new Date(sol.fecha_inicio).getTime()
      const finSol = new Date(sol.fecha_fin).getTime()

      return inicioNuevo <= finSol && finNuevo >= inicioSol
    })

    if (traslapes.length === 0) return null

    const nombresEnConflicto = traslapes
      .map((t) => t.colaboradores?.nombre || 'Un compañero')
      .join(', ')
    const equipoNombre = colabSeleccionado.equipos?.nombre || 'mismo equipo'

    return {
      mensaje: `En estas fechas, ${nombresEnConflicto} (Equipo: ${equipoNombre}) ya tiene vacaciones programadas.`
    }
  }, [progColabId, progFechaInicio, progFechaFin, colaboradores, solicitudes])

  const diasCalculados = useMemo(() => {
    if (!progFechaInicio || !progFechaFin) return 0
    const inicio = new Date(progFechaInicio)
    const fin = new Date(progFechaFin)
    const diffTime = fin.getTime() - inicio.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays > 0 ? diffDays : 0
  }, [progFechaInicio, progFechaFin])

  async function handleRegistrarVacaciones(e: React.FormEvent) {
    e.preventDefault()
    if (!progColabId || !progFechaInicio || !progFechaFin) {
      alert('Por favor selecciona colaborador y rango de fechas.')
      return
    }

    const colab = colaboradores.find((c) => c.id.toString() === progColabId)
    if (!colab) return

    if (diasCalculados <= 0) {
      alert('La fecha de fin debe ser posterior o igual a la fecha de inicio.')
      return
    }

    if (diasCalculados > colab.saldo_pendiente) {
      alert(`El colaborador solo cuenta con ${colab.saldo_pendiente} días disponibles.`)
      return
    }

    setSavingVac(true)

    try {
      const { error: errorVac } = await supabase.from('historial').insert([
        {
          colaborador_id: parseInt(progColabId),
          fecha_inicio: progFechaInicio,
          fecha_fin: progFechaFin,
          dias_consumidos: diasCalculados
        }
      ])

      if (errorVac) throw errorVac

      const nuevoSaldo = colab.saldo_pendiente - diasCalculados
      const { error: errorColab } = await supabase
        .from('colaboradores')
        .update({ saldo_pendiente: nuevoSaldo })
        .eq('id', colab.id)

      if (errorColab) throw errorColab

      alert('Vacaciones registradas correctamente.')
      setProgColabId('')
      setProgFechaInicio('')
      setProgFechaFin('')
      onRefresh()
    } catch (err: any) {
      alert('Error al registrar vacaciones: ' + (err.message || 'Error desconocido'))
    } finally {
      setSavingVac(false)
    }
  }

  const colaboradoresFiltrados = useMemo(() => {
    const resultado = colaboradores.filter((colab) => {
      const cumpleNombre = colab.nombre.toLowerCase().includes(filtroNombre.toLowerCase())
      let cumpleEquipo = true
      if (filtroEquipo === 'sin_equipo') {
        cumpleEquipo = !colab.equipo_id
      } else if (filtroEquipo !== '') {
        cumpleEquipo = colab.equipo_id?.toString() === filtroEquipo
      }

      let cumpleSaldo = true
      if (filtroSaldo === 'con_saldo') cumpleSaldo = colab.saldo_pendiente > 0
      else if (filtroSaldo === 'sin_saldo') cumpleSaldo = colab.saldo_pendiente === 0

      return cumpleNombre && cumpleEquipo && cumpleSaldo
    })

    if (ordenSaldo === 'desc') resultado.sort((a, b) => b.saldo_pendiente - a.saldo_pendiente)
    else if (ordenSaldo === 'asc') resultado.sort((a, b) => a.saldo_pendiente - b.saldo_pendiente)

    return resultado
  }, [colaboradores, filtroNombre, filtroEquipo, filtroSaldo, ordenSaldo])

  function abrirModalNuevo() {
    setEditingId(null)
    setFormNombre('')
    setFormEquipoId(equipos.length > 0 ? equipos[0].id.toString() : '')
    setFormFechaIngreso(new Date().toISOString().split('T')[0])
    setFormSaldo(0)
    setIsModalOpen(true)
  }

  function abrirModalEditar(colab: Colaborador) {
    setEditingId(colab.id)
    setFormNombre(colab.nombre)
    setFormEquipoId(colab.equipo_id ? colab.equipo_id.toString() : '')
    setFormFechaIngreso(colab.fecha_ingreso)
    setFormSaldo(colab.saldo_pendiente)
    setIsModalOpen(true)
  }

  async function handleEliminarColaborador(id: number, nombre: string) {
    if (!confirm(`¿Estás seguro de que deseas eliminar a ${nombre}? Se borrará también su historial de vacaciones.`)) return

    try {
      const { error } = await supabase.from('colaboradores').delete().eq('id', id)
      if (error) throw error
      alert('Colaborador eliminado correctamente.')
      onRefresh()
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  async function handleGuardarColaborador(e: React.FormEvent) {
    e.preventDefault()
    if (!formNombre || !formFechaIngreso) return

    setSavingColab(true)
    const payload = {
      nombre: formNombre,
      equipo_id: formEquipoId ? parseInt(formEquipoId) : null,
      fecha_ingreso: formFechaIngreso,
      saldo_pendiente: formSaldo
    }

    try {
      if (editingId) {
        const { error } = await supabase.from('colaboradores').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('colaboradores').insert([payload])
        if (error) throw error
      }
      setIsModalOpen(false)
      onRefresh()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSavingColab(false)
    }
  }

  // Función helper para renderizar el Badge del equipo
  const renderBadgeEquipo = (nombreEquipo?: string | null) => {
    if (!nombreEquipo) {
      return (
        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-semibold">
          Sin equipo
        </span>
      )
    }

    const eq = nombreEquipo.toLowerCase()
{/* pintando los equipos, colores */}
    if (eq.includes('data')) {
      return (
        <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md text-xs font-semibold">
          {nombreEquipo}
        </span>
      )
    }

   if (
      eq.includes('infra') ||
      eq.includes('estructura') ||
      eq.includes('sistema') ||
      eq.includes('red') ||
      eq.includes('soporte')
    ) {
      return (
        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md text-xs font-semibold">
          {nombreEquipo}
        </span>
      )
    }

    if (eq.includes('aplicacion') || eq.includes('aplicaciones')) {
      return (
        <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-md text-xs font-semibold">
          {nombreEquipo}
        </span>
      )
    }

    return (
      <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-md text-xs font-semibold">
        {nombreEquipo}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* FORMULARIO DE REGISTRO */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Programar Nuevas Vacaciones</h2>

        <form onSubmit={handleRegistrarVacaciones} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Colaborador</label>
              <select
                value={progColabId}
                onChange={(e) => setProgColabId(e.target.value)}
                className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Seleccionar colaborador...</option>
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.saldo_pendiente} d. pendientes)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={progFechaInicio}
                onChange={(e) => setProgFechaInicio(e.target.value)}
                className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={progFechaFin}
                onChange={(e) => setProgFechaFin(e.target.value)}
                className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={savingVac}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition disabled:opacity-50"
              >
                {savingVac ? 'Guardando...' : 'Registrar Vacaciones'}
              </button>
            </div>
          </div>

          {advertenciaTraslape && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg text-amber-800 text-xs flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <div>
                <span className="font-bold">Advertencia de Coincidencia:</span> {advertenciaTraslape.mensaje}
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Puedes registrar las vacaciones de todos modos si el equipo cuenta con cobertura.
                </p>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* TABLA DE SALDOS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Saldos de Colaboradores</h2>
            <p className="text-xs text-slate-500 mt-0.5">Lista general de colaboradores y días disponibles</p>
          </div>
          <button
            onClick={abrirModalNuevo}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
          >
            + Nuevo Colaborador
          </button>
        </div>

        {/* FILTROS */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={filtroNombre}
            onChange={(e) => setFiltroNombre(e.target.value)}
            className="border border-slate-300 bg-white text-slate-900 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          />
          <select
            value={filtroEquipo}
            onChange={(e) => setFiltroEquipo(e.target.value)}
            className="border border-slate-300 bg-white text-slate-900 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          >
            <option value="">Todos los Equipos</option>
            {equipos.map((eq) => (
              <option key={eq.id} value={eq.id}>{eq.nombre}</option>
            ))}
          </select>
          <select
            value={filtroSaldo}
            onChange={(e) => setFiltroSaldo(e.target.value as any)}
            className="border border-slate-300 bg-white text-slate-900 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          >
            <option value="todos">Todos los saldos</option>
            <option value="con_saldo">Con días disponibles</option>
            <option value="sin_saldo">Sin días disponibles</option>
          </select>
          <select
            value={ordenSaldo}
            onChange={(e) => setOrdenSaldo(e.target.value as any)}
            className="border border-slate-300 bg-white text-slate-900 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          >
            <option value="ninguno">Sin orden específico</option>
            <option value="desc">De Mayor a Menor ↓</option>
            <option value="asc">De Menor a Mayor ↑</option>
          </select>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-100">
              <th className="py-3 px-6">ID</th>
              <th className="py-3 px-6">Nombre</th>
              <th className="py-3 px-6">Equipo</th>
              <th className="py-3 px-6">Fecha Ingreso</th>
              <th className="py-3 px-6 text-center">Saldo Pendiente</th>
              <th className="py-3 px-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {colaboradoresFiltrados.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50/50">
                <td className="py-4 px-6 text-slate-400 font-mono">#{emp.id}</td>
                <td className="py-4 px-6 font-medium text-slate-800">{emp.nombre}</td>
                <td className="py-4 px-6">
                  {renderBadgeEquipo(emp.equipos?.nombre)}
                </td>
                <td className="py-4 px-6">{emp.fecha_ingreso}</td>
                <td className="py-4 px-6 text-center">
                  <span className={`font-bold px-3 py-1 rounded-full text-xs ${emp.saldo_pendiente > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {emp.saldo_pendiente} días
                  </span>
                </td>
                <td className="py-4 px-6 text-right space-x-3">
                  <button onClick={() => abrirModalEditar(emp)} className="text-blue-600 hover:text-blue-800 font-semibold text-xs">
                    Editar
                  </button>
                  <button onClick={() => handleEliminarColaborador(emp.id, emp.nombre)} className="text-rose-600 hover:text-rose-800 font-semibold text-xs">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL EDITAR / CREAR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              {editingId ? 'Editar Colaborador' : 'Nuevo Colaborador'}
            </h3>
            <form onSubmit={handleGuardarColaborador} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Equipo</label>
                <select
                  value={formEquipoId}
                  onChange={(e) => setFormEquipoId(e.target.value)}
                  className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Sin asignar --</option>
                  {equipos.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha Ingreso</label>
                <input
                  type="date"
                  required
                  value={formFechaIngreso}
                  onChange={(e) => setFormFechaIngreso(e.target.value)}
                  className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Saldo Pendiente (días)</label>
                <input
                  type="number"
                  min="0"
                  value={formSaldo}
                  onChange={(e) => setFormSaldo(parseInt(e.target.value) || 0)}
                  className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-semibold">
                  Cancelar
                </button>
                <button type="submit" disabled={savingColab} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}