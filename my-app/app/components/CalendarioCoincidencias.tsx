'use client'

import { useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

export interface SolicitudVacacion {
  id: number
  colaborador_id: number
  fecha_inicio: string
  fecha_fin: string
  dias_consumidos?: number
  colaboradores?: {
    nombre?: string
    equipo_id?: number | null
    equipos?: {
      nombre?: string
    } | null
  } | null
}

export interface Equipo {
  id: number
  nombre: string
}

interface Props {
  solicitudes: SolicitudVacacion[]
  equipos: Equipo[]
  loading: boolean
  onRefresh?: () => void
}

const MESES_2026 = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

function obtenerColorEquipo(nombreEquipo?: string): { bgBadge: string; bgPill: string } {
  if (!nombreEquipo) return { bgBadge: 'bg-slate-500 text-white hover:bg-slate-600', bgPill: 'bg-slate-100 text-slate-700' }
  
  const eq = nombreEquipo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  if (eq.includes('data')) {
    return { bgBadge: 'bg-amber-500 text-white hover:bg-amber-600', bgPill: 'bg-amber-100 text-amber-800' }
  }
  if (eq.includes('infra') || eq.includes('estructura') || eq.includes('sistema') || eq.includes('red')) {
    return { bgBadge: 'bg-emerald-600 text-white hover:bg-emerald-700', bgPill: 'bg-emerald-100 text-emerald-800' }
  }
  if (eq.includes('aplicacion') || eq.includes('aplicaciones') || eq.includes('dev')) {
    return { bgBadge: 'bg-blue-600 text-white hover:bg-blue-700', bgPill: 'bg-blue-100 text-blue-800' }
  }
  
  return { bgBadge: 'bg-purple-600 text-white hover:bg-purple-700', bgPill: 'bg-purple-100 text-purple-800' }
}

export default function CalendarioCoincidencias({ solicitudes, equipos, loading, onRefresh }: Props) {
  const [colaboradorFiltro, setColaboradorFiltro] = useState<string>('todos')
  const [modoVista, setModoVista] = useState<'mensual' | 'anual'>('mensual')
  const [mesSeleccionado, setMesSeleccionado] = useState<number>(8) // Septiembre 2026 por defecto
  
  // Modal de eliminación
  const [solicitudAEliminar, setSolicitudAEliminar] = useState<SolicitudVacacion | null>(null)
  const [deleting, setDeleting] = useState(false)

  const listaColaboradores = useMemo(() => {
    const mapa = new Map<number, { id: number; nombre: string }>()
    solicitudes.forEach((sol) => {
      if (sol.colaboradores?.nombre && sol.colaborador_id) {
        mapa.set(sol.colaborador_id, {
          id: sol.colaborador_id,
          nombre: sol.colaboradores.nombre
        })
      }
    })
    return Array.from(mapa.values())
  }, [solicitudes])

  // Helper para construir la cuadrícula de un mes específico
  const construirDiasMes = (mesIdx: number) => {
    const año = 2026
    const primerDia = new Date(año, mesIdx, 1)
    const ultimoDia = new Date(año, mesIdx + 1, 0)

    let diaSemanaInicio = primerDia.getDay() - 1
    if (diaSemanaInicio === -1) diaSemanaInicio = 6

    const totalDias = ultimoDia.getDate()
    const diasArray = []

    for (let i = 0; i < diaSemanaInicio; i++) {
      diasArray.push(null)
    }

    for (let d = 1; d <= totalDias; d++) {
      const fechaStr = `${año}-${String(mesIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      diasArray.push({ numero: d, fechaStr })
    }

    return diasArray
  }

  const diasDelMesActual = useMemo(() => construirDiasMes(mesSeleccionado), [mesSeleccionado])

  async function handleConfirmarEliminacion() {
    if (!solicitudAEliminar) return
    setDeleting(true)

    try {
      const colabId = solicitudAEliminar.colaborador_id
      const diasDevueltos = solicitudAEliminar.dias_consumidos || 0

      const { error: errorHistorial } = await supabase
        .from('historial')
        .delete()
        .eq('id', solicitudAEliminar.id)

      if (errorHistorial) throw errorHistorial

      if (diasDevueltos > 0) {
        const { data: colabData, error: errorGetColab } = await supabase
          .from('colaboradores')
          .select('saldo_pendiente')
          .eq('id', colabId)
          .single()

        if (!errorGetColab && colabData) {
          const nuevoSaldo = colabData.saldo_pendiente + diasDevueltos
          await supabase
            .from('colaboradores')
            .update({ saldo_pendiente: nuevoSaldo })
            .eq('id', colabId)
        }
      }

      alert('Vacaciones canceladas exitosamente. Se ha devuelto el saldo al colaborador.')
      setSolicitudAEliminar(null)
      if (onRefresh) onRefresh()
    } catch (err: any) {
      alert('Error al cancelar las vacaciones: ' + (err.message || 'Error desconocido'))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center text-slate-400">
        Cargando calendario 2026...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        {/* CABECERA CON SELECCIÓN DE VISTA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Calendario de Vacaciones 2026</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Haz clic en cualquier bloque asignado para cancelar/eliminar las vacaciones
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* TOGGLE VISTA */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setModoVista('mensual')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  modoVista === 'mensual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Vista Mensual
              </button>
              <button
                onClick={() => setModoVista('anual')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  modoVista === 'anual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Año Completo (12 Meses)
              </button>
            </div>

            {/* FILTRO COLABORADOR */}
            <div className="flex items-center gap-2">
              <select
                value={colaboradorFiltro}
                onChange={(e) => setColaboradorFiltro(e.target.value)}
                className="border border-slate-300 bg-white text-slate-900 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos los colaboradores</option>
                {listaColaboradores.map((col) => (
                  <option key={col.id} value={col.id.toString()}>
                    {col.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* LEYENDA */}
        <div className="flex flex-wrap items-center gap-4 py-3 border-b border-slate-100 text-xs">
          <span className="font-semibold text-slate-500">Leyenda:</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-blue-100 text-blue-800">
            <span className="w-2 h-2 rounded-full bg-blue-600" /> Aplicaciones
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-800">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Data
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-emerald-100 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-600" /> Infraestructura
          </span>
        </div>

        {/* VISTA 1: MENSUAL */}
        {modoVista === 'mensual' && (
          <div className="mt-4">
            <div className="flex overflow-x-auto gap-2 pb-4 border-b border-slate-100 no-scrollbar">
              {MESES_2026.map((nombreMes, index) => (
                <button
                  key={nombreMes}
                  onClick={() => setMesSeleccionado(index)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                    mesSeleccionado === index
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {nombreMes}
                </button>
              ))}
            </div>

            <div className="mt-6">
              <h3 className="text-base font-bold text-slate-800 mb-4">
                {MESES_2026[mesSeleccionado]} 2026
              </h3>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 mb-2">
                {DIAS_SEMANA.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {diasDelMesActual.map((dia, idx) => {
                  if (!dia) {
                    return <div key={`empty-${idx}`} className="h-24 bg-slate-50/40 rounded-lg border border-dashed border-slate-100" />
                  }

                  const ocupaciones = solicitudes.filter((sol) => {
                    return dia.fechaStr >= sol.fecha_inicio && dia.fechaStr <= sol.fecha_fin
                  })

                  return (
                    <div
                      key={dia.fechaStr}
                      className="h-24 bg-white border border-slate-200 rounded-lg p-1 flex flex-col justify-between overflow-hidden"
                    >
                      <span className="text-xs font-bold text-slate-700 pl-1 pt-1">
                        {dia.numero}
                      </span>

                      <div className="space-y-1 overflow-y-auto max-h-16 pr-0.5">
                        {ocupaciones.map((sol) => {
                          const esEnfocado =
                            colaboradorFiltro === 'todos' ||
                            sol.colaborador_id.toString() === colaboradorFiltro

                          const nombreColab = sol.colaboradores?.nombre || 'Colaborador'
                          const nombreEquipo = sol.colaboradores?.equipos?.nombre
                          const colores = obtenerColorEquipo(nombreEquipo)

                          const iniciales = nombreColab
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()

                          return (
                            <button
                              key={`${sol.id}-${dia.fechaStr}`}
                              onClick={() => setSolicitudAEliminar(sol)}
                              title="Haz clic para cancelar estas vacaciones"
                              className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate flex items-center justify-between cursor-pointer transition ${
                                esEnfocado
                                  ? `${colores.bgBadge} font-bold shadow-sm`
                                  : 'bg-slate-200 text-slate-600 opacity-40 hover:opacity-70'
                              }`}
                            >
                              <span className="truncate">{nombreColab}</span>
                              <span className="text-[9px] bg-black/20 px-1 rounded ml-1">
                                {iniciales}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* VISTA 2: AÑO COMPLETO (12 MESES) */}
        {modoVista === 'anual' && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {MESES_2026.map((nombreMes, mesIdx) => {
              const diasMes = construirDiasMes(mesIdx)

              return (
                <div key={nombreMes} className="bg-slate-50/70 border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-800">{nombreMes} 2026</h4>
                    <button
                      onClick={() => {
                        setMesSeleccionado(mesIdx)
                        setModoVista('mensual')
                      }}
                      className="text-[10px] text-blue-600 hover:underline font-semibold"
                    >
                      Ampliar 🔍
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-semibold text-slate-400 mb-1">
                    {DIAS_SEMANA.map((d) => (
                      <div key={d}>{d[0]}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {diasMes.map((dia, idx) => {
                      if (!dia) {
                        return <div key={`empty-anual-${idx}`} className="h-6" />
                      }

                      const ocupaciones = solicitudes.filter((sol) => {
                        return dia.fechaStr >= sol.fecha_inicio && dia.fechaStr <= sol.fecha_fin
                      })

                      const primeraOcupacion = ocupaciones.find((sol) => {
                        return colaboradorFiltro === 'todos' || sol.colaborador_id.toString() === colaboradorFiltro
                      })

                      const colores = primeraOcupacion
                        ? obtenerColorEquipo(primeraOcupacion.colaboradores?.equipos?.nombre)
                        : null

                      return (
                        <div
                          key={dia.fechaStr}
                          onClick={() => {
                            if (primeraOcupacion) setSolicitudAEliminar(primeraOcupacion)
                          }}
                          title={
                            primeraOcupacion
                              ? `${dia.numero} ${nombreMes}: ${primeraOcupacion.colaboradores?.nombre} (${ocupaciones.length} registro/s)`
                              : `${dia.numero} ${nombreMes}`
                          }
                          className={`h-6 rounded text-[10px] font-semibold flex items-center justify-center cursor-pointer transition relative ${
                            primeraOcupacion
                              ? `${colores?.bgBadge} text-white shadow-xs`
                              : 'bg-white text-slate-600 border border-slate-100 hover:bg-slate-200'
                          }`}
                        >
                          {dia.numero}
                          {ocupaciones.length > 1 && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 text-white text-[7px] font-bold rounded-full flex items-center justify-center">
                              {ocupaciones.length}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL CANCELAR VACACIONES */}
      {solicitudAEliminar && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="text-2xl">🗑️</span>
              <h3 className="text-base font-bold text-slate-800">Cancelar Vacaciones</h3>
            </div>

            <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p><span className="font-semibold text-slate-800">Colaborador:</span> {solicitudAEliminar.colaboradores?.nombre}</p>
              <p><span className="font-semibold text-slate-800">Equipo:</span> {solicitudAEliminar.colaboradores?.equipos?.nombre || 'Sin asignar'}</p>
              <p><span className="font-semibold text-slate-800">Rango:</span> {solicitudAEliminar.fecha_inicio} al {solicitudAEliminar.fecha_fin}</p>
              <p><span className="font-semibold text-slate-800">Días a reintegrar:</span> {solicitudAEliminar.dias_consumidos || 0} días</p>
            </div>

            <p className="text-xs text-slate-500">
              Al confirmar, se eliminarán estas vacaciones del calendario y los días serán devueltos al saldo del colaborador.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSolicitudAEliminar(null)}
                className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmarEliminacion}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Eliminar Vacaciones'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}