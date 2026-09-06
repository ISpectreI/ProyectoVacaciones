'use client'

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

interface Props {
  solicitudes: SolicitudVacacion[]
  loading: boolean
}

const renderBadgeEquipo = (nombreEquipo?: string | null) => {
  if (!nombreEquipo) {
    return (
      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-semibold">
        Sin equipo
      </span>
    )
  }

  const eq = nombreEquipo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

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

  if (eq.includes('aplicacion') || eq.includes('dev') || eq.includes('software')) {
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

export default function HistorialSolicitudes({ solicitudes, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center text-slate-400">
        Cargando historial de registros...
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">Historial de Solicitudes</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Registro general de vacaciones programadas y aprobadas (Solo lectura)
        </p>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-100">
            <th className="py-3 px-6">Colaborador</th>
            <th className="py-3 px-6">Equipo</th>
            <th className="py-3 px-6">Periodo</th>
            <th className="py-3 px-6 text-center">Días Consumidos</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
          {solicitudes.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                No hay solicitudes registradas hasta el momento.
              </td>
            </tr>
          ) : (
            solicitudes.map((sol) => (
              <tr key={sol.id} className="hover:bg-slate-50/50">
                <td className="py-4 px-6 font-medium text-slate-800">
                  {sol.colaboradores?.nombre || 'Colaborador no encontrado'}
                </td>
                <td className="py-4 px-6">
                  {renderBadgeEquipo(sol.colaboradores?.equipos?.nombre)}
                </td>
                <td className="py-4 px-6 font-mono text-xs text-slate-600">
                  {sol.fecha_inicio} <span className="text-slate-400">al</span> {sol.fecha_fin}
                </td>
                <td className="py-4 px-6 text-center font-bold text-blue-600">
                  {sol.dias_consumidos || 0} d.
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}